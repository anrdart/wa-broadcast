/**
 * Device ID Generation and Persistence Utility
 * Generates a unique device ID and persists it in localStorage
 * Requirements: 1.1
 */

const DEVICE_ID_KEY = 'broadcasto_device_id'

/**
 * UUID v4 regex pattern for validation
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hex digit and y is one of 8, 9, a, or b
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Fallback device ID regex pattern
 * Format: device-{timestamp}-{random}
 */
const FALLBACK_DEVICE_ID_REGEX = /^device-\d+-[a-z0-9]+$/

/**
 * Generates a unique device ID using crypto.randomUUID()
 * Falls back to a timestamp-based ID if crypto is not available
 */
export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Validates a device ID format
 * Accepts both UUID v4 format and fallback format
 * @param id - The device ID to validate
 * @returns true if the device ID has a valid format
 */
export function isValidDeviceId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false
  }
  return UUID_V4_REGEX.test(id) || FALLBACK_DEVICE_ID_REGEX.test(id)
}

/**
 * Gets the device ID from localStorage, or generates and stores a new one
 * Validates stored ID before returning
 * @returns The device ID string
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    // Server-side or no localStorage - generate temporary ID
    return generateDeviceId()
  }

  const storedId = localStorage.getItem(DEVICE_ID_KEY)
  if (storedId && isValidDeviceId(storedId)) {
    return storedId
  }

  const newId = generateDeviceId()
  localStorage.setItem(DEVICE_ID_KEY, newId)
  return newId
}

/**
 * Gets or creates a device ID (alias for getDeviceId for interface compatibility)
 * @returns The device ID string
 */
export function getOrCreateDeviceId(): string {
  return getDeviceId()
}

/**
 * Clears the stored device ID from localStorage
 * Useful for logout or reset scenarios
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY)
  }
}

/**
 * Checks if a device ID is currently stored
 * @returns true if a device ID exists in localStorage
 */
export function hasStoredDeviceId(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false
  }
  return localStorage.getItem(DEVICE_ID_KEY) !== null
}
