import { createClient, RealtimeChannel } from '@supabase/supabase-js'

// Supabase configuration
// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Realtime service for WhatsApp integration
export class RealtimeService {
  private realtimeChannel: RealtimeChannel | null = null
  private callbacks: {
    onQRCode?: (qr: string) => void
    onAuthenticated?: () => void
    onReady?: () => void
    onContacts?: (contacts: any[]) => void
    onBroadcastProgress?: (progress: any) => void
    onBroadcastComplete?: (result: any) => void
    onChatMessage?: (message: any) => void
    onScheduledMessages?: (messages: any[]) => void
    onDisconnected?: (reason: string) => void
    onError?: (error: string) => void
  } = {}

  async initRealtime(callbacks: {
    onQRCode?: (qr: string) => void
    onAuthenticated?: () => void
    onReady?: () => void
    onContacts?: (contacts: any[]) => void
    onBroadcastProgress?: (progress: any) => void
    onBroadcastComplete?: (result: any) => void
    onChatMessage?: (message: any) => void
    onScheduledMessages?: (messages: any[]) => void
    onDisconnected?: (reason: string) => void
    onError?: (error: string) => void
  }) {
    this.callbacks = callbacks

    try {
      // Create a realtime channel for WhatsApp events
      this.realtimeChannel = supabase.channel('whatsapp-events', {
        config: {
          broadcast: { self: true },
          presence: { key: 'user_id' }
        }
      })

      // Subscribe to broadcast events
      this.realtimeChannel
        .on('broadcast', { event: 'qr_code' }, ({ payload }) => {
          console.log('📱 QR Code received via Supabase:', payload.qr)
          this.callbacks.onQRCode?.(payload.qr)
        })
        .on('broadcast', { event: 'authenticated' }, () => {
          console.log('✅ Authentication successful via Supabase')
          this.callbacks.onAuthenticated?.()
        })
        .on('broadcast', { event: 'ready' }, () => {
          console.log('🚀 WhatsApp ready via Supabase')
          this.callbacks.onReady?.()
        })
        .on('broadcast', { event: 'contacts' }, ({ payload }) => {
          console.log('👥 Contacts received via Supabase:', payload.contacts?.length)
          this.callbacks.onContacts?.(payload.contacts || [])
        })
        .on('broadcast', { event: 'broadcast_progress' }, ({ payload }) => {
          console.log('📊 Broadcast progress via Supabase')
          this.callbacks.onBroadcastProgress?.(payload)
        })
        .on('broadcast', { event: 'broadcast_complete' }, ({ payload }) => {
          console.log('✅ Broadcast complete via Supabase')
          this.callbacks.onBroadcastComplete?.(payload)
        })
        .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          console.log('💬 Chat message via Supabase')
          this.callbacks.onChatMessage?.(payload)
        })
        .on('broadcast', { event: 'scheduled_messages' }, ({ payload }) => {
          console.log('📅 Scheduled messages via Supabase')
          this.callbacks.onScheduledMessages?.(payload.messages || [])
        })
        .on('broadcast', { event: 'disconnected' }, ({ payload }) => {
          console.log('🔌 Disconnected via Supabase:', payload.message)
          this.callbacks.onDisconnected?.(payload.message || 'Disconnected')
        })
        .on('broadcast', { event: 'error' }, ({ payload }) => {
          console.error('❌ Error via Supabase:', payload.message)
          this.callbacks.onError?.(payload.message || 'Unknown error')
        })
        .subscribe((status) => {
          console.log('Supabase realtime status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to WhatsApp events')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Supabase realtime channel error')
            this.callbacks.onError?.('Realtime channel error')
          }
        })

    } catch (error) {
      console.error('❌ Failed to initialize Supabase realtime:', error)
      this.callbacks.onError?.('Failed to initialize realtime')
    }
  }

  async sendEvent(eventType: string, payload: any) {
    if (!this.realtimeChannel) {
      console.error('Realtime channel not initialized')
      return
    }

    try {
      await this.realtimeChannel.send({
        type: 'broadcast',
        event: eventType,
        payload
      })
      console.log(`📤 Sent ${eventType} event via Supabase`)
    } catch (error) {
      console.error(`❌ Failed to send ${eventType} event:`, error)
    }
  }

  disconnect() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel)
      this.realtimeChannel = null
      console.log('🔌 Disconnected from Supabase realtime')
    }
  }

  get channel() {
    return this.realtimeChannel
  }
}

export const realtimeService = new RealtimeService()

// Database service functions
export const supabaseService = {
  // Chat Messages
  async getChatMessages(contactId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  async saveChatMessage(message: {
    contact_id: string
    message: string
    is_outgoing: boolean
    timestamp: string
  }) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([message])
      .select()
    
    if (error) throw error
    return data
  },

  // Contacts
  async getContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  },

  async saveContact(contact: {
    id: string
    name?: string
    number: string
    is_my_contact: boolean
    is_from_csv: boolean
  }) {
    const { data, error } = await supabase
      .from('contacts')
      .upsert([contact])
      .select()
    
    if (error) throw error
    return data
  },

  async updateContact(id: string, updates: Partial<{
    name: string
    number: string
    is_my_contact: boolean
    is_from_csv: boolean
  }>) {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data
  },

  async deleteContact(id: string) {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Broadcast Messages
  async getBroadcasts() {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async saveBroadcast(broadcast: {
    message: string
    total_contacts: number
    successful: number
    failed: number
    status: string
  }) {
    const { data, error } = await supabase
      .from('broadcasts')
      .insert([broadcast])
      .select()
    
    if (error) throw error
    return data
  },

  async updateBroadcastStatus(id: string, updates: {
    successful?: number
    failed?: number
    status?: string
  }) {
    const { data, error } = await supabase
      .from('broadcasts')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data
  },

  // Scheduled Messages
  async getScheduledMessages() {
    const { data, error } = await supabase
      .from('scheduled_messages')
      .select('*')
      .order('scheduled_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  async saveScheduledMessage(message: {
    message: string
    contacts: string[]
    scheduled_at: string
    is_recurring: boolean
    recurring_interval?: string
    recurring_end_date?: string
    status: string
  }) {
    const { data, error } = await supabase
      .from('scheduled_messages')
      .insert([message])
      .select()
    
    if (error) throw error
    return data
  },

  async updateScheduledMessage(id: string, updates: Partial<{
    status: string
    sent_at: string
    successful: number
    failed: number
  }>) {
    const { data, error } = await supabase
      .from('scheduled_messages')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data
  },

  async deleteScheduledMessage(id: string) {
    const { error } = await supabase
      .from('scheduled_messages')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Activity Logs
  async getActivityLogs(limit = 100) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  async saveActivityLog(log: {
    activity_type: string
    description: string
    metadata?: any
  }) {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([log])
      .select()
    
    if (error) throw error
    return data
  }
}
