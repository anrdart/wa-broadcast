/**
 * Device ID Generation and Persistence Utility
 * Generates a unique device ID and persists it in localStorage
 * Requirements: 4.1
 */

const DEVICE_ID_KEY = 'broadcasto_device_id'

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
 * Gets the device ID from localStorage, or generates and stores a new one
 * @returns The device ID string
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    // Server-side or no localStorage - generate temporary ID
    return generateDeviceId()
  }

  const storedId = localStorage.getItem(DEVICE_ID_KEY)
  if (storedId) {
    return storedId
  }

  const newId = generateDeviceId()
  localStorage.setItem(DEVICE_ID_KEY, newId)
  return newId
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
