/**
 * Session Manager Composable
 * Manages WhatsApp session lifecycle for multi-session support
 * Requirements: 1.2, 1.3, 1.4, 3.3
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { WhatsAppSessionRecord, SessionPoolRecord } from '~/types/supabase'
import { getDeviceId } from '~/utils/deviceId'

// Session status types
export type SessionStatus = 'pending' | 'connected' | 'disconnected' | 'dormant'

// Session interface matching the design document
export interface Session {
  id: string
  device_id: string
  whatsapp_number: string | null
  api_instance_port: number
  status: SessionStatus
  session_token: string | null
  token_expires_at: string | null
  created_at: string
  last_active_at: string
  updated_at: string
}

// Token payload structure
export interface SessionTokenPayload {
  session_id: string
  device_id: string
  issued_at: number
  expires_at: number
}

// Session Manager interface
export interface UseSessionManager {
  // State
  currentSession: Readonly<Ref<Session | null>>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>

  // Core functions (Requirements: 1.2, 1.3, 1.4)
  getCurrentSession: () => Promise<Session | null>
  createSession: (deviceId: string) => Promise<Session | null>
  restoreSession: (sessionId: string) => Promise<Session | null>
  terminateSession: (sessionId: string) => Promise<boolean>

  // Token management (Requirements: 3.3)
  refreshSessionToken: (sessionId: string) => Promise<string | null>
  isTokenExpired: (session: Session) => boolean
  getStoredToken: () => string | null
}

// Token storage key
const SESSION_TOKEN_KEY = 'broadcasto_session_token'

// Token expiration time (24 hours in milliseconds)
const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000


/**
 * Generate a session token (JWT-like structure encoded as base64)
 * @param sessionId - The session ID
 * @param deviceId - The device ID
 * @returns The generated token string
 */
export function generateSessionToken(sessionId: string, deviceId: string): string {
  const payload: SessionTokenPayload = {
    session_id: sessionId,
    device_id: deviceId,
    issued_at: Date.now(),
    expires_at: Date.now() + TOKEN_EXPIRATION_MS,
  }
  // Encode as base64 (simple JWT-like token without signature for local use)
  return btoa(JSON.stringify(payload))
}

/**
 * Decode a session token
 * @param token - The token string to decode
 * @returns The decoded payload or null if invalid
 */
export function decodeSessionToken(token: string): SessionTokenPayload | null {
  try {
    const decoded = atob(token)
    const payload = JSON.parse(decoded) as SessionTokenPayload
    // Validate required fields
    if (!payload.session_id || !payload.device_id || !payload.expires_at) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

/**
 * Check if a token is expired
 * @param token - The token string or payload to check
 * @returns true if expired, false otherwise
 */
export function isTokenExpiredCheck(token: string | SessionTokenPayload): boolean {
  const payload = typeof token === 'string' ? decodeSessionToken(token) : token
  if (!payload) return true
  return Date.now() >= payload.expires_at
}

/**
 * Calculate token expiration date from now
 * @returns ISO string of expiration date
 */
export function calculateTokenExpiration(): string {
  return new Date(Date.now() + TOKEN_EXPIRATION_MS).toISOString()
}


export const useSessionManager = (): UseSessionManager => {
  const { $supabase } = useNuxtApp()
  const supabase = $supabase as SupabaseClient

  // State
  const currentSession = useState<Session | null>('session_manager_current', () => null)
  const isLoading = useState<boolean>('session_manager_loading', () => false)
  const error = useState<string | null>('session_manager_error', () => null)

  /**
   * Get stored token from localStorage
   * @returns The stored token or null
   */
  const getStoredToken = (): string | null => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null
    }
    return localStorage.getItem(SESSION_TOKEN_KEY)
  }

  /**
   * Store token in localStorage
   * @param token - The token to store
   */
  const storeToken = (token: string): void => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_TOKEN_KEY, token)
    }
  }

  /**
   * Clear stored token from localStorage
   */
  const clearStoredToken = (): void => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_TOKEN_KEY)
    }
  }

  /**
   * Check if a session's token is expired
   * @param session - The session to check
   * @returns true if expired, false otherwise
   */
  const isTokenExpired = (session: Session): boolean => {
    if (!session.token_expires_at) return true
    return new Date(session.token_expires_at).getTime() <= Date.now()
  }

  /**
   * Get current session for device
   * Fetches session by device_id from Supabase
   * Requirements: 1.2, 1.3
   */
  const getCurrentSession = async (): Promise<Session | null> => {
    if (!import.meta.client) return null

    const deviceId = getDeviceId()
    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('device_id', deviceId)
        .single()

      if (fetchError) {
        // PGRST116 = no rows returned, which is expected for new devices
        if (fetchError.code !== 'PGRST116') {
          console.error('[SessionManager] Error fetching session:', fetchError)
          error.value = fetchError.message
        }
        return null
      }

      const session = data as Session
      currentSession.value = session
      return session
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[SessionManager] getCurrentSession error:', errorMsg)
      error.value = errorMsg
      return null
    } finally {
      isLoading.value = false
    }
  }


  /**
   * Allocate an available port from the session pool
   * @returns The allocated port number or null if pool is exhausted
   */
  const allocatePort = async (): Promise<number | null> => {
    try {
      // Find an available instance in the pool
      const { data: availableInstance, error: fetchError } = await supabase
        .from('session_pool')
        .select('*')
        .eq('status', 'available')
        .limit(1)
        .single()

      if (fetchError || !availableInstance) {
        console.error('[SessionManager] No available instances in pool')
        return null
      }

      return (availableInstance as SessionPoolRecord).port
    } catch (err) {
      console.error('[SessionManager] allocatePort error:', err)
      return null
    }
  }

  /**
   * Mark a port as in use in the session pool
   * @param port - The port to mark
   * @param sessionId - The session ID using this port
   */
  const markPortInUse = async (port: number, sessionId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('session_pool')
        .update({
          status: 'in_use',
          session_id: sessionId,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('port', port)

      if (updateError) {
        console.error('[SessionManager] Error marking port in use:', updateError)
        return false
      }
      return true
    } catch (err) {
      console.error('[SessionManager] markPortInUse error:', err)
      return false
    }
  }

  /**
   * Release a port back to the pool
   * @param port - The port to release
   */
  const releasePort = async (port: number): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('session_pool')
        .update({
          status: 'available',
          session_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('port', port)

      if (updateError) {
        console.error('[SessionManager] Error releasing port:', updateError)
        return false
      }
      return true
    } catch (err) {
      console.error('[SessionManager] releasePort error:', err)
      return false
    }
  }

  /**
   * Create new session (with auto-cleanup of existing session)
   * Deletes existing session for device first, then creates new
   * Requirements: 1.2
   */
  const createSession = async (deviceId: string): Promise<Session | null> => {
    if (!import.meta.client) return null

    isLoading.value = true
    error.value = null

    try {
      // First, delete any existing session for this device (auto-cleanup)
      const { error: deleteError } = await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('device_id', deviceId)
      
      if (deleteError) {
        console.warn('[SessionManager] Error cleaning up old session:', deleteError)
        // Continue anyway - might not have an existing session
      }

      // Allocate a port from the pool
      const port = await allocatePort()
      if (!port) {
        error.value = 'No available instances in session pool'
        return null
      }

      // Generate session token
      const sessionId = crypto.randomUUID()
      const token = generateSessionToken(sessionId, deviceId)
      const tokenExpiresAt = calculateTokenExpiration()

      // Create session record
      const { data, error: insertError } = await supabase
        .from('whatsapp_sessions')
        .insert({
          id: sessionId,
          device_id: deviceId,
          whatsapp_number: null,
          api_instance_port: port,
          status: 'pending',
          session_token: token,
          token_expires_at: tokenExpiresAt,
        })
        .select()
        .single()

      if (insertError) {
        console.error('[SessionManager] Error creating session:', insertError)
        error.value = insertError.message
        return null
      }

      // Mark port as in use
      await markPortInUse(port, sessionId)

      // Store token locally
      storeToken(token)

      const session = data as Session
      currentSession.value = session
      return session
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[SessionManager] createSession error:', errorMsg)
      error.value = errorMsg
      return null
    } finally {
      isLoading.value = false
    }
  }


  /**
   * Restore existing session
   * Restores session by session_id
   * Requirements: 1.3
   */
  const restoreSession = async (sessionId: string): Promise<Session | null> => {
    if (!import.meta.client) return null

    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (fetchError) {
        console.error('[SessionManager] Error restoring session:', fetchError)
        error.value = fetchError.message
        return null
      }

      const session = data as Session

      // Check if token needs refresh
      if (isTokenExpired(session)) {
        const newToken = await refreshSessionToken(sessionId)
        if (newToken) {
          session.session_token = newToken
          session.token_expires_at = calculateTokenExpiration()
        }
      }

      // Update last_active_at
      await supabase
        .from('whatsapp_sessions')
        .update({
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      // Store token locally
      if (session.session_token) {
        storeToken(session.session_token)
      }

      currentSession.value = session
      return session
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[SessionManager] restoreSession error:', errorMsg)
      error.value = errorMsg
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Terminate session
   * Updates status to disconnected and releases port
   * Requirements: 1.4
   */
  const terminateSession = async (sessionId: string): Promise<boolean> => {
    if (!import.meta.client) return false

    isLoading.value = true
    error.value = null

    try {
      // Get session to find the port
      const { data: session, error: fetchError } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (fetchError) {
        console.error('[SessionManager] Error fetching session for termination:', fetchError)
        error.value = fetchError.message
        return false
      }

      const sessionData = session as Session

      // Update session status to disconnected
      const { error: updateError } = await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'disconnected',
          session_token: null,
          token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('[SessionManager] Error terminating session:', updateError)
        error.value = updateError.message
        return false
      }

      // Release the port back to the pool
      await releasePort(sessionData.api_instance_port)

      // Clear local token
      clearStoredToken()

      // Clear current session if it matches
      if (currentSession.value?.id === sessionId) {
        currentSession.value = null
      }

      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[SessionManager] terminateSession error:', errorMsg)
      error.value = errorMsg
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Refresh session token
   * Generates new token before expiry
   * Requirements: 3.3
   */
  const refreshSessionToken = async (sessionId: string): Promise<string | null> => {
    if (!import.meta.client) return null

    try {
      // Get current session to get device_id
      const { data: session, error: fetchError } = await supabase
        .from('whatsapp_sessions')
        .select('device_id')
        .eq('id', sessionId)
        .single()

      if (fetchError || !session) {
        console.error('[SessionManager] Error fetching session for token refresh:', fetchError)
        return null
      }

      const deviceId = (session as { device_id: string }).device_id

      // Generate new token
      const newToken = generateSessionToken(sessionId, deviceId)
      const tokenExpiresAt = calculateTokenExpiration()

      // Update session with new token
      const { error: updateError } = await supabase
        .from('whatsapp_sessions')
        .update({
          session_token: newToken,
          token_expires_at: tokenExpiresAt,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('[SessionManager] Error updating session token:', updateError)
        return null
      }

      // Store new token locally
      storeToken(newToken)

      // Update current session if it matches
      if (currentSession.value?.id === sessionId) {
        currentSession.value = {
          ...currentSession.value,
          session_token: newToken,
          token_expires_at: tokenExpiresAt,
        }
      }

      return newToken
    } catch (err) {
      console.error('[SessionManager] refreshSessionToken error:', err)
      return null
    }
  }

  return {
    // State
    currentSession: readonly(currentSession),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Core functions
    getCurrentSession,
    createSession,
    restoreSession,
    terminateSession,

    // Token management
    refreshSessionToken,
    isTokenExpired,
    getStoredToken,
  }
}
