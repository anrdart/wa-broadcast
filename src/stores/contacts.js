import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/apiService'

export const useContactsStore = defineStore('contacts', () => {
  // State
  const contacts = ref([])
  const selectedContacts = ref(new Set())
  const isLoading = ref(false)
  const error = ref(null)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const itemsPerPage = ref(50)
  
  // Filter options
  const filterOptions = ref({
    showSaved: true,
    showCsv: true,
    showWhatsapp: true,
    showGroups: true
  })
  const filterBy = ref('all') // 'all', 'selected', 'unselected'
  

  
  // Computed
  const filteredContacts = computed(() => {
    if (!searchQuery.value) return contacts.value
    return contacts.value.filter(contact => 
      contact.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      contact.number?.includes(searchQuery.value)
    )
  })
  
  const paginatedContacts = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredContacts.value.slice(start, end)
  })
  
  const totalPages = computed(() => {
    return Math.ceil(filteredContacts.value.length / itemsPerPage.value)
  })
  
  const selectedContactsCount = computed(() => selectedContacts.value.size)
  
  // Actions
  const loadContacts = async () => {
    try {
      isLoading.value = true
      error.value = null
      const response = await apiService.getContacts()
      contacts.value = response.contacts || []
    } catch (err) {
      error.value = err.message
      console.error('Error loading contacts:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const refreshContacts = async () => {
    try {
      isLoading.value = true
      error.value = null
      const response = await apiService.refreshContacts()
      contacts.value = response.contacts || []
    } catch (err) {
      error.value = err.message
      console.error('Error refreshing contacts:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const addContact = async (contactData) => {
    try {
      const response = await apiService.addContact(contactData)
      if (response.success) {
        await loadContacts() // Reload to get updated list
      }
      return response
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  const updateContact = async (contactId, contactData) => {
    try {
      const response = await apiService.updateContact(contactId, contactData)
      if (response.success) {
        await loadContacts() // Reload to get updated list
      }
      return response
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  const deleteContact = async (contactId) => {
    try {
      const response = await apiService.deleteContact(contactId)
      if (response.success) {
        contacts.value = contacts.value.filter(c => c.id !== contactId)
        selectedContacts.value.delete(contactId)
      }
      return response
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  const selectContact = (contact) => {
    if (selectedContacts.value.has(contact.id)) {
      selectedContacts.value.delete(contact.id)
    } else {
      selectedContacts.value.add(contact.id)
    }
  }
  
  const selectAllContacts = () => {
    selectedContacts.value.clear()
    filteredContacts.value.forEach(contact => {
      selectedContacts.value.add(contact.id)
    })
  }
  
  const clearSelection = () => {
    selectedContacts.value.clear()
  }
  
  const toggleContactSelection = (contactId) => {
    if (selectedContacts.value.has(contactId)) {
      selectedContacts.value.delete(contactId)
    } else {
      selectedContacts.value.add(contactId)
    }
  }
  
  const deleteSelectedContacts = async () => {
    try {
      const selectedIds = Array.from(selectedContacts.value)
      const deletePromises = selectedIds.map(contactId => 
        apiService.deleteContact(contactId)
      )
      await Promise.all(deletePromises)
      
      // Remove deleted contacts from local state
      contacts.value = contacts.value.filter(c => !selectedIds.includes(c.id))
      selectedContacts.value.clear()
      
      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  // Cache Management
  const clearCache = () => {
    contacts.value = []
    localStorage.removeItem('whatsapp_contacts')
    localStorage.removeItem('contacts_cache')
  }
  
  // Reset all data (for logout)
  const resetStore = () => {
    contacts.value = []
    selectedContacts.value = []
    isLoading.value = false
    error.value = null
    searchQuery.value = ''
    currentPage.value = 1
    
    // Clear localStorage
    localStorage.removeItem('whatsapp_contacts')
    localStorage.removeItem('contacts_cache')
  }
  
  // Search and pagination
  const setSearchQuery = (query) => {
    searchQuery.value = query
    currentPage.value = 1 // Reset to first page when searching
  }
  
  const setCurrentPage = (page) => {
    currentPage.value = page
  }
  
  const setItemsPerPage = (items) => {
    itemsPerPage.value = items
    currentPage.value = 1 // Reset to first page when changing items per page
  }
  
  // Load contacts from WhatsApp (called by whatsapp store)
  const loadContactsFromWhatsApp = (whatsappContacts) => {
    contacts.value = whatsappContacts
  }
  
  return {
    // State
    contacts,
    selectedContacts,
    isLoading,
    error,
    searchQuery,
    currentPage,
    itemsPerPage,
    filterOptions,
    filterBy,
    
    // Computed
    filteredContacts,
    paginatedContacts,
    totalPages,
    selectedContactsCount,
    
    // Actions
    loadContacts,
    refreshContacts,
    addContact,
    updateContact,
    deleteContact,
    selectContact,
    selectAllContacts,
    clearSelection,
    deleteSelectedContacts,
    clearCache,
    resetStore,
    setSearchQuery,
    setCurrentPage,
    setItemsPerPage,
    loadContactsFromWhatsApp,
    toggleContactSelection
  }
})