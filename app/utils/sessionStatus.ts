/**
 * Session Status Utilities
 * Pure functions for session status display logic
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import type { SessionStatus } from '~/composables/useSessionManager'

/**
 * Status configuration for display
 */
export interface StatusConfig {
  color: 'green' | 'red' | 'yellow' | 'gray'
  text: string
  badgeVariant: 'default' | 'destructive' | 'outline' | 'secondary' | 'whatsapp'
}

/**
 * Get status configuration for display
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @param status - The session status
 * @returns Configuration object with color, text, and badge variant
 */
export function getStatusConfig(status: SessionStatus | string): StatusConfig {
  switch (status) {
    case 'connected':
      // Requirements: 5.1 - Green "Connected" indicator
      return {
        color: 'green',
        text: 'Connected',
        badgeVariant: 'whatsapp',
      }
    case 'disconnected':
      // Requirements: 5.2 - Red "Disconnected" indicator
      return {
        color: 'red',
        text: 'Disconnected',
        badgeVariant: 'destructive',
      }
    case 'pending':
      // Requirements: 5.3 - Yellow "Reconnecting" indicator
      return {
        color: 'yellow',
        text: 'Connecting...',
        badgeVariant: 'outline',
      }
    case 'dormant':
      // Dormant session - needs re-authentication
      return {
        color: 'gray',
        text: 'Session Expired',
        badgeVariant: 'secondary',
      }
    default:
      return {
        color: 'gray',
        text: 'Unknown',
        badgeVariant: 'secondary',
      }
  }
}

/**
 * Format phone number for display
 * @param phone - The phone number string
 * @returns Formatted phone number with + prefix
 */
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // If starts with country code, format nicely
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  
  // Add + prefix if not present
  return `+${cleaned}`
}

/**
 * Format duration in human-readable format
 * @param ms - Duration in milliseconds
 * @returns Human-readable duration string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${seconds}s`
}
