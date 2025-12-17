/**
 * Session Pool Manager Composable
 * Manages pool of WhatsApp API instances for multi-session support
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionPoolRecord } from '~/types/supabase'

// Pool instance status types
export type PoolStatus = 'available' | 'in_use' | 'maintenance'

// Pool instance interface matching the design document
export interface PoolInstance {
  id: string
  port: number
  status: PoolStatus
  session_id: string | null
  container_name: string | null
  last_health_check: string | null
  created_at: string
  updated_at: string
}

// Pool status summary
export interface PoolStatusSummary {
  total: number
  available: number
  in_use: number
  maintenance: number
}

// Dormancy threshold (24 hours in milliseconds)
const DORMANCY_THRESHOLD_MS = 24 * 60 * 60 * 1000

// Cleanup interval (1 hour in milliseconds)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

// Session Pool Manager interface
export interface UseSessionPool {
  // State
  poolStatus: Readonly<Ref<PoolStatusSummary>>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>

  // Core functions (Requirements: 2.1, 2.3)
  allocateInstance: () => Promise<PoolInstance | null>
  releaseInstance: (port: number) => Promise<boolean>
  getPoolStatus: () => Promise<PoolStatusSummary>

  // Dormancy management (Requirements: 2.2, 2.4)
  checkDormancy: (lastActiveAt: string) => boolean
  markDormant: (sessionId: string) => Promise<boolean>
  startPeriodicCleanup: () => void
  stopPeriodicCleanup: () => void
}

/**
 * Check if a session is dormant based on last_active_at timestamp
 * @param lastActiveAt - ISO string of last activity timestamp
 * @returns true if session is dormant (inactive > 24 hours)
 */
export function checkDormancyPure(lastActiveAt: string): boolean {
  const lastActive = new Date(lastActiveAt).getTime()
  const now = Date.now()
  return (now - lastActive) > DORMANCY_THRESHOLD_MS
}


export const useSessionPool = (): UseSessionPool => {
  const { $supabase } = useNuxtApp()
  const supabase = $supabase as SupabaseClient

  // State
  const poolStatus = useState<PoolStatusSummary>('session_pool_status', () => ({
    total: 0,
    available: 0,
    in_use: 0,
    maintenance: 0,
  }))
  const isLoading = useState<boolean>('session_pool_loading', () => false)
  const error = useState<string | null>('session_pool_error', () => null)

  // Cleanup interval reference
  let cleanupIntervalId: ReturnType<typeof setInterval> | null = null

  /**
   * Allocate an available instance from the pool
   * Finds an available port and marks it as in_use
   * Requirements: 2.1
   */
  const allocateInstance = async (): Promise<PoolInstance | null> => {
    if (!import.meta.client) return null

    isLoading.value = true
    error.value = null

    try {
      // Find an available instance
      const { data: availableInstance, error: fetchError } = await supabase
        .from('session_pool')
        .select('*')
        .eq('status', 'available')
        .limit(1)
        .single()

      if (fetchError) {
        // PGRST116 = no rows returned (pool exhausted)
        if (fetchError.code === 'PGRST116') {
          error.value = 'No available instances in session pool'
          console.warn('[SessionPool] Pool exhausted - no available instances')
        } else {
          console.error('[SessionPool] Error finding available instance:', fetchError)
          error.value = fetchError.message
        }
        return null
      }

      const instance = availableInstance as PoolInstance

      // Mark instance as in_use (session_id will be set by caller)
      const { data: updatedInstance, error: updateError } = await supabase
        .from('session_pool')
        .update({
          status: 'in_use',
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('port', instance.port)
        .eq('status', 'available') // Ensure it's still available (optimistic locking)
        .select()
        .single()

      if (updateError) {
        console.error('[SessionPool] Error allocating instance:', updateError)
        error.value = updateError.message
        return null
      }

      // Update local pool status
      await getPoolStatus()

      return updatedInstance as PoolInstance
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[SessionPool] allocateInstance error:', errorMsg)
      error.value = errorMsg
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Release an instance back to the pool
   * Marks the port as available and clears session_id
   * Requirements: 2.1
   */
  const releaseInstance = async (port: number): Promise<boolean> => {
    if (!import.meta.client) return false

    isLoading.value = true
    error.value = null

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
        console.error('[SessionPool] Error releasing instance:', updateError)
        error.value = updateError.message
        return false
      }

      // Update local pool status
      await getPoolStatus()

      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[SessionPool] releaseInstance error:', errorMsg)
      error.value = errorMsg
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get current pool status
   * Returns counts of available/in_use/maintenance instances
   * Requirements: 2.3
   */
  const getPoolStatus = async (): Promise<PoolStatusSummary> => {
    if (!import.meta.client) {
      return { total: 0, available: 0, in_use: 0, maintenance: 0 }
    }

    try {
      const { data: instances, error: fetchError } = await supabase
        .from('session_pool')
        .select('status')

      if (fetchError) {
        console.error('[SessionPool] Error fetching pool status:', fetchError)
        return poolStatus.value
      }

      const summary: PoolStatusSummary = {
        total: instances?.length || 0,
        available: instances?.filter(i => i.status === 'available').length || 0,
        in_use: instances?.filter(i => i.status === 'in_use').length || 0,
        maintenance: instances?.filter(i => i.status === 'maintenance').length || 0,
      }

      poolStatus.value = summary
      return summary
    } catch (err) {
      console.error('[SessionPool] getPoolStatus error:', err)
      return poolStatus.value
    }
  }

  /**
   * Check if a session is dormant
   * Returns true if last_active_at > 24 hours ago
   * Requirements: 2.2
   */
  const checkDormancy = (lastActiveAt: string): boolean => {
    return checkDormancyPure(lastActiveAt)
  }

  /**
   * Mark a session as dormant and release its instance
   * Updates session status to dormant and releases the port
   * Requirements: 2.2, 2.4
   */
  const markDormant = async (sessionId: string): Promise<boolean> => {
    if (!import.meta.client) return false

    isLoading.value = true
    error.value = null

    try {
      // Get the session to find its port
      const { data: session, error: fetchError } = await supabase
        .from('whatsapp_sessions')
        .select('api_instance_port')
        .eq('id', sessionId)
        .single()

      if (fetchError) {
        console.error('[SessionPool] Error fetching session for dormancy:', fetchError)
        error.value = fetchError.message
        return false
      }

      const port = (session as { api_instance_port: number }).api_instance_port

      // Update session status to dormant
      const { error: updateSessionError } = await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'dormant',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateSessionError) {
        console.error('[SessionPool] Error marking session dormant:', updateSessionError)
        error.value = updateSessionError.message
        return false
      }

      // Release the instance back to the pool
      await releaseInstance(port)

      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[SessionPool] markDormant error:', errorMsg)
      error.value = errorMsg
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Run periodic cleanup to detect and mark dormant sessions
   * Checks all active sessions and marks dormant ones
   * Requirements: 2.2
   */
  const runCleanup = async (): Promise<void> => {
    try {
      // Fetch all connected sessions
      const { data: sessions, error: fetchError } = await supabase
        .from('whatsapp_sessions')
        .select('id, last_active_at')
        .eq('status', 'connected')

      if (fetchError) {
        console.error('[SessionPool] Error fetching sessions for cleanup:', fetchError)
        return
      }

      if (!sessions || sessions.length === 0) return

      // Check each session for dormancy
      for (const session of sessions) {
        const { id, last_active_at } = session as { id: string; last_active_at: string }
        if (checkDormancy(last_active_at)) {
          console.log(`[SessionPool] Marking session ${id} as dormant`)
          await markDormant(id)
        }
      }

      // Update pool status after cleanup
      await getPoolStatus()
    } catch (err) {
      console.error('[SessionPool] runCleanup error:', err)
    }
  }

  /**
   * Start periodic cleanup (every hour)
   * Requirements: 2.2
   */
  const startPeriodicCleanup = (): void => {
    if (cleanupIntervalId) {
      console.warn('[SessionPool] Cleanup already running')
      return
    }

    // Run initial cleanup
    runCleanup()

    // Schedule periodic cleanup
    cleanupIntervalId = setInterval(runCleanup, CLEANUP_INTERVAL_MS)
    console.log('[SessionPool] Started periodic cleanup (every hour)')
  }

  /**
   * Stop periodic cleanup
   */
  const stopPeriodicCleanup = (): void => {
    if (cleanupIntervalId) {
      clearInterval(cleanupIntervalId)
      cleanupIntervalId = null
      console.log('[SessionPool] Stopped periodic cleanup')
    }
  }

  return {
    // State
    poolStatus: readonly(poolStatus),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Core functions
    allocateInstance,
    releaseInstance,
    getPoolStatus,

    // Dormancy management
    checkDormancy,
    markDormant,
    startPeriodicCleanup,
    stopPeriodicCleanup,
  }
}
