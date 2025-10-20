import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { wsService } from "@/services/websocket";
import { supabaseService } from "@/services/supabase";
import type {
  Contact,
  ChatMessage,
  BroadcastProgress,
  ScheduledMessage,
} from "@/services/websocket";

export type { Contact, ChatMessage, ScheduledMessage };

export interface BroadcastHistory {
  id: string;
  message: string;
  totalContacts: number;
  successful: number;
  failed: number;
  status: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  activityType: string;
  description: string;
  metadata?: any;
  createdAt: string;
}

export type AuthStatus =
  | "unauthenticated"
  | "authenticating"
  | "loading_data"
  | "authenticated";

export const useAppStore = defineStore("app", () => {
  // Authentication & Connection State
  const authStatus = ref<AuthStatus>("unauthenticated");
  const qrCode = ref("");
  const isConnected = ref(false);
  const connectionError = ref("");

  // Contacts
  const contacts = ref<Contact[]>([]);
  const selectedContacts = ref<Set<string>>(new Set());

  // Chat
  const currentChatContact = ref<Contact | null>(null);
  const activeChats = ref<Record<string, ChatMessage[]>>({});
  const typingIndicators = ref<Record<string, boolean>>({});

  // Broadcasts
  const broadcastHistory = ref<BroadcastHistory[]>([]);
  const currentBroadcast = ref<BroadcastProgress | null>(null);
  const isSendingBroadcast = ref(false);

  // Scheduled Messages
  const scheduledMessages = ref<ScheduledMessage[]>([]);

  // Activity Logs
  const activityLogs = ref<ActivityLog[]>([]);

  // UI State
  const currentView = ref<
    "chat" | "broadcast" | "scheduled" | "contacts" | "activity"
  >("chat");
  const isLoadingData = ref(false);
  const loadingProgress = ref(0);

  // Computed
  const selectedContactsCount = computed(() => selectedContacts.value.size);
  const hasSelectedContacts = computed(() => selectedContacts.value.size > 0);
  const currentChatMessages = computed(() => {
    if (!currentChatContact.value) return [];
    return activeChats.value[currentChatContact.value.id] || [];
  });
  const isAuthenticated = computed(() => authStatus.value === "authenticated");
  const isLoading = computed(
    () => authStatus.value === "loading_data" || isLoadingData.value,
  );

  // Actions - WebSocket Management
  const initWebSocket = async () => {
    try {
      // Keep status as unauthenticated until we receive QR or authenticated event
      // authStatus.value = "authenticating"; // Don't set this here!

      // Set up event listeners BEFORE connecting
      // This ensures we don't miss any early messages
      wsService.on("qr_code", handleQRCode);
      wsService.on("authenticated", handleAuthenticated);
      wsService.on("ready", handleReady);
      wsService.on("contacts", handleContacts);
      wsService.on("broadcast_progress", handleBroadcastProgress);
      wsService.on("broadcast_complete", handleBroadcastComplete);
      wsService.on("chat_message", handleIncomingChat);
      wsService.on("scheduled_messages", handleScheduledMessages);
      wsService.on("disconnected", handleDisconnected);
      wsService.on("error", handleError);

      await wsService.connect();

      isConnected.value = true;
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      connectionError.value = "Failed to connect to server";
      authStatus.value = "unauthenticated";
    }
  };

  // WebSocket Event Handlers
  const handleQRCode = (data: any) => {
    console.log("🔔 QR Code event received:", data);
    console.log("📱 QR Code value:", data.qr);
    console.log("📏 QR Code length:", data.qr?.length);
    console.log("🔍 Current authStatus BEFORE update:", authStatus.value);
    qrCode.value = data.qr;
    authStatus.value = "authenticating";
    console.log("🔍 Current authStatus AFTER update:", authStatus.value);
    console.log("✅ QR Code stored in state:", qrCode.value ? "YES" : "NO");
  };

  const handleAuthenticated = async () => {
    authStatus.value = "loading_data";
    await loadAllData();
  };

  const handleReady = () => {
    isConnected.value = true;
    wsService.getContacts();
  };

  const handleContacts = async (data: any) => {
    contacts.value = data.contacts;

    // Sync contacts to Supabase
    try {
      for (const contact of data.contacts) {
        await supabaseService.saveContact({
          id: contact.id,
          name: contact.name,
          number: contact.number,
          is_my_contact: contact.isMyContact,
          is_from_csv: contact.isFromCSV,
        });
      }
    } catch (error) {
      console.error("Failed to sync contacts to Supabase:", error);
    }
  };

  const handleBroadcastProgress = (data: BroadcastProgress) => {
    currentBroadcast.value = data;
  };

  const handleBroadcastComplete = async (data: any) => {
    isSendingBroadcast.value = false;
    currentBroadcast.value = null;

    // Save broadcast to Supabase
    try {
      await supabaseService.saveBroadcast({
        message: data.message || "",
        total_contacts: data.total,
        successful: data.successful,
        failed: data.failed,
        status: "completed",
      });

      // Reload broadcast history
      await loadBroadcastHistory();

      // Log activity
      await logActivity(
        "broadcast",
        `Broadcast sent to ${data.total} contacts`,
        {
          successful: data.successful,
          failed: data.failed,
        },
      );
    } catch (error) {
      console.error("Failed to save broadcast:", error);
    }
  };

  const handleIncomingChat = (data: any) => {
    const message: ChatMessage = {
      type: "received",
      contactId: data.contactId,
      message: data.message,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    if (!activeChats.value[data.contactId]) {
      activeChats.value[data.contactId] = [];
    }
    activeChats.value[data.contactId]!.push(message);

    // Save to Supabase
    supabaseService
      .saveChatMessage({
        contact_id: data.contactId,
        message: data.message,
        is_outgoing: false,
        timestamp: message.timestamp || new Date().toISOString(),
      })
      .catch(console.error);
  };

  const handleScheduledMessages = (data: any) => {
    scheduledMessages.value = data.messages || [];
  };

  const handleDisconnected = (data: any) => {
    isConnected.value = false;
    connectionError.value = data.message || "Disconnected from WhatsApp";
  };

  const handleError = (data: any) => {
    connectionError.value = data.message || "An error occurred";
    console.error("WebSocket error:", data);
  };

  // Data Loading
  const loadAllData = async () => {
    try {
      isLoadingData.value = true;
      loadingProgress.value = 0;

      // Load contacts from Supabase
      loadingProgress.value = 10;
      try {
        const supabaseContacts = await supabaseService.getContacts();
        if (supabaseContacts && supabaseContacts.length > 0) {
          contacts.value = supabaseContacts.map((c: any) => ({
            id: c.id,
            name: c.name || undefined,
            number: c.number,
            isMyContact: c.is_my_contact,
            isFromCSV: c.is_from_csv,
          }));
        }
      } catch (error) {
        console.error("Failed to load contacts from Supabase:", error);
      }

      loadingProgress.value = 30;

      // Load chat history
      try {
        for (const contact of contacts.value) {
          const messages = await supabaseService.getChatMessages(contact.id);
          if (messages && messages.length > 0) {
            activeChats.value[contact.id] = messages.map((m: any) => ({
              type: m.is_outgoing ? "sent" : "received",
              contactId: m.contact_id,
              message: m.message,
              timestamp: m.timestamp,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }

      loadingProgress.value = 50;

      // Load broadcast history
      await loadBroadcastHistory();
      loadingProgress.value = 70;

      // Load scheduled messages
      await loadScheduledMessages();
      loadingProgress.value = 85;

      // Load activity logs
      await loadActivityLogs();
      loadingProgress.value = 100;

      authStatus.value = "authenticated";
    } catch (error) {
      console.error("Failed to load data:", error);
      authStatus.value = "authenticated"; // Continue anyway
    } finally {
      isLoadingData.value = false;
    }
  };

  const loadBroadcastHistory = async () => {
    try {
      const broadcasts = await supabaseService.getBroadcasts();
      broadcastHistory.value = broadcasts.map((b: any) => ({
        id: b.id,
        message: b.message,
        totalContacts: b.total_contacts,
        successful: b.successful,
        failed: b.failed,
        status: b.status,
        createdAt: b.created_at,
      }));
    } catch (error) {
      console.error("Failed to load broadcast history:", error);
    }
  };

  const loadScheduledMessages = async () => {
    try {
      const messages = await supabaseService.getScheduledMessages();
      scheduledMessages.value = messages.map((m: any) => ({
        type: "schedule_message",
        message: m.message,
        contacts: m.contacts,
        dateTime: m.scheduled_at,
        isRecurring: m.is_recurring,
        recurringConfig: m.recurring_interval
          ? {
              interval: m.recurring_interval,
              endDate: m.recurring_end_date || "",
            }
          : undefined,
      }));

      // Also request from WebSocket
      wsService.getScheduledMessages();
    } catch (error) {
      console.error("Failed to load scheduled messages:", error);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const logs = await supabaseService.getActivityLogs(100);
      activityLogs.value = logs.map((l: any) => ({
        id: l.id,
        activityType: l.activity_type,
        description: l.description,
        metadata: l.metadata,
        createdAt: l.created_at,
      }));
    } catch (error) {
      console.error("Failed to load activity logs:", error);
    }
  };

  // Contact Actions
  const toggleContactSelection = (contactId: string) => {
    if (selectedContacts.value.has(contactId)) {
      selectedContacts.value.delete(contactId);
    } else {
      selectedContacts.value.add(contactId);
    }
  };

  const selectAllContacts = () => {
    contacts.value.forEach((contact) => {
      selectedContacts.value.add(contact.id);
    });
  };

  const clearContactSelection = () => {
    selectedContacts.value.clear();
  };

  const importContactsFromCSV = (csvContacts: Contact[]) => {
    csvContacts.forEach((contact) => {
      const exists = contacts.value.find((c) => c.id === contact.id);
      if (!exists) {
        contacts.value.push(contact);
        // Save to Supabase
        supabaseService
          .saveContact({
            id: contact.id,
            name: contact.name,
            number: contact.number,
            is_my_contact: false,
            is_from_csv: true,
          })
          .catch(console.error);
      }
    });
  };

  // Chat Actions
  const startChat = (contact: Contact) => {
    currentChatContact.value = contact;
    currentView.value = "chat";
    if (!activeChats.value[contact.id]) {
      activeChats.value[contact.id] = [];
    }
  };

  const sendChatMessage = async (message: string) => {
    if (!currentChatContact.value) return;

    const chatMessage: ChatMessage = {
      type: "sent",
      contactId: currentChatContact.value.id,
      message,
      timestamp: new Date().toISOString(),
    };

    // Add to local chat
    if (!activeChats.value[currentChatContact.value.id]) {
      activeChats.value[currentChatContact.value.id] = [];
    }
    activeChats.value[currentChatContact.value.id]!.push(chatMessage);

    // Send via WebSocket
    wsService.sendChat(currentChatContact.value.id, message);

    // Save to Supabase
    try {
      await supabaseService.saveChatMessage({
        contact_id: currentChatContact.value.id,
        message,
        is_outgoing: true,
        timestamp: chatMessage.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to save chat message:", error);
    }
  };

  // Broadcast Actions
  const sendBroadcast = async (message: string, contactIds: string[]) => {
    isSendingBroadcast.value = true;
    wsService.sendBroadcast(message, contactIds);

    // Log activity
    await logActivity(
      "broadcast",
      `Started broadcast to ${contactIds.length} contacts`,
      {
        message,
        contactCount: contactIds.length,
      },
    );
  };

  // Schedule Actions
  const scheduleMessage = async (
    message: string,
    contactIds: string[],
    dateTime: string,
    isRecurring = false,
    recurringConfig?: any,
  ) => {
    wsService.scheduleMessage(
      message,
      contactIds,
      dateTime,
      isRecurring,
      recurringConfig,
    );

    // Save to Supabase
    try {
      await supabaseService.saveScheduledMessage({
        message,
        contacts: contactIds,
        scheduled_at: dateTime,
        is_recurring: isRecurring,
        recurring_interval: recurringConfig?.interval,
        recurring_end_date: recurringConfig?.endDate,
        status: "scheduled",
      });

      // Reload scheduled messages
      await loadScheduledMessages();

      // Log activity
      await logActivity(
        "schedule",
        `Scheduled message for ${contactIds.length} contacts`,
        {
          dateTime,
          isRecurring,
        },
      );
    } catch (error) {
      console.error("Failed to save scheduled message:", error);
    }
  };

  // Activity Logging
  const logActivity = async (
    activityType: string,
    description: string,
    metadata?: any,
  ) => {
    try {
      await supabaseService.saveActivityLog({
        activity_type: activityType,
        description,
        metadata,
      });
      await loadActivityLogs();
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  // View Management
  const setCurrentView = (
    view: "chat" | "broadcast" | "scheduled" | "contacts" | "activity",
  ) => {
    currentView.value = view;
  };

  // Logout
  const logout = () => {
    wsService.logout();
    authStatus.value = "unauthenticated";
    qrCode.value = "";
    contacts.value = [];
    selectedContacts.value.clear();
    activeChats.value = {};
    broadcastHistory.value = [];
    scheduledMessages.value = [];
    activityLogs.value = [];
    currentChatContact.value = null;
  };

  return {
    // State
    authStatus,
    qrCode,
    isConnected,
    connectionError,
    contacts,
    selectedContacts,
    currentChatContact,
    activeChats,
    typingIndicators,
    broadcastHistory,
    currentBroadcast,
    isSendingBroadcast,
    scheduledMessages,
    activityLogs,
    currentView,
    isLoadingData,
    loadingProgress,

    // Computed
    selectedContactsCount,
    hasSelectedContacts,
    currentChatMessages,
    isAuthenticated,
    isLoading,

    // Actions
    initWebSocket,
    loadAllData,
    toggleContactSelection,
    selectAllContacts,
    clearContactSelection,
    importContactsFromCSV,
    startChat,
    sendChatMessage,
    sendBroadcast,
    scheduleMessage,
    logActivity,
    setCurrentView,
    logout,
  };
});
