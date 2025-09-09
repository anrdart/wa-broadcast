/**
 * Centralized API Service with Clean Proxy Configuration
 * Handles all API calls to WhatsApp backend with consistent error handling
 */

import { useToast } from '../composables/useToast'

class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
    this.toast = useToast()
  }

  /**
   * Generic HTTP request method with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data, error: null }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      return { success: false, data: null, error: error.message }
    }
  }

  /**
   * GET request
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null
    })
  }

  /**
   * PUT request
   */
  async put(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null
    })
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }

  // WhatsApp specific API methods
  
  /**
   * Get WhatsApp connection status
   */
  async getStatus() {
    return this.get('/status')
  }

  /**
   * Get QR code for authentication
   */
  async getQR() {
    return this.get('/qr')
  }

  /**
   * Get contacts list
   */
  async getContacts() {
    return this.get('/contacts')
  }

  /**
   * Refresh contacts from WhatsApp
   */
  async refreshContacts() {
    return this.post('/refresh')
  }

  /**
   * Send text message
   */
  async sendMessage(to, message) {
    return this.post('/send', { to, message })
  }

  /**
   * Send broadcast message
   */
  async sendBroadcast(contacts, message, options = {}) {
    return this.post('/broadcast', {
      contacts,
      message,
      ...options
    })
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId) {
    return this.get(`/message/${messageId}/status`)
  }

  /**
   * Upload media file
   */
  async uploadMedia(file) {
    const formData = new FormData()
    formData.append('media', file)
    
    return this.request('/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    })
  }

  /**
   * Send media message
   */
  async sendMediaMessage(to, mediaPath, caption = '') {
    return this.post('/send/media', {
      to,
      mediaPath,
      caption
    })
  }

  /**
   * Get all chats
   */
  async getChats() {
    return this.get('/chats')
  }

  /**
   * Get messages for a specific chat
   */
  async getMessages(chatId, limit = 50) {
    return this.get(`/messages/${encodeURIComponent(chatId)}?limit=${limit}`)
  }

  /**
   * Get chat history for a specific contact (alias for getMessages)
   */
  async getChatHistory(contactId, limit = 50) {
    return this.getMessages(contactId, limit)
  }

  /**
   * Get profile picture for a contact
   */
  async getProfilePicture(jid) {
    return this.get(`/profile-pic/${encodeURIComponent(jid)}`)
  }

  /**
   * Mark message as read
   */
  async markAsRead(contactId, messageId) {
    return this.post('/mark-read', { contactId, messageId })
  }

  /**
   * Get device info
   */
  async getDeviceInfo() {
    return this.get('/device')
  }

  /**
   * Logout from WhatsApp
   */
  async logout() {
    return this.post('/logout')
  }

  /**
   * Restart WhatsApp connection
   */
  async restart() {
    return this.post('/restart')
  }
}

// Create singleton instance
const apiService = new ApiService()

export default apiService
export { ApiService }