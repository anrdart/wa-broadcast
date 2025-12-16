/**
 * Offline Queue Storage and Management
 * Handles queuing operations when offline and processing them when back online
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type { QueuedOperation } from '~/types/supabase'

const OFFLINE_QUEUE_KEY = 'broadcasto_offline_queue'

/**
 * Get all queued operations from localStorage
 * Requirements: 6.1
 */
export function getOfflineQueue(): QueuedOperation[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as QueuedOperation[]
  } catch (error) {
    console.error('[OfflineQueue] Error reading queue:', error)
    return []
  }
}

/**
 * Save the queue to localStorage
 * Requirements: 6.1
 */
export function saveOfflineQueue(queue: QueuedOperation[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
  } catch (error) {
    console.error('[OfflineQueue] Error saving queue:', error)
  }
}

/**
 * Add an operation to the offline queue
 * Operations are added with a timestamp for FIFO processing
 * Requirements: 6.2
 */
export function queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>): QueuedOperation {
  const queue = getOfflineQueue()
  
  const newOperation: QueuedOperation = {
    ...operation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }
  
  queue.push(newOperation)
  saveOfflineQueue(queue)
  
  console.log('[OfflineQueue] Operation queued:', newOperation.type, newOperation.table)
  return newOperation
}

/**
 * Remove an operation from the queue by ID
 * Requirements: 6.3
 */
export function removeFromQueue(operationId: string): void {
  const queue = getOfflineQueue()
  const filtered = queue.filter(op => op.id !== operationId)
  saveOfflineQueue(filtered)
}

/**
 * Clear all operations from the queue
 */
export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(OFFLINE_QUEUE_KEY)
}

/**
 * Get the next operation to process (FIFO order)
 * Returns the operation with the earliest timestamp
 * Requirements: 6.3
 */
export function getNextOperation(): QueuedOperation | null {
  const queue = getOfflineQueue()
  if (queue.length === 0) return null
  
  // Sort by timestamp (ascending) to ensure FIFO
  const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp)
  return sorted[0]
}

/**
 * Get queue length
 */
export function getQueueLength(): number {
  return getOfflineQueue().length
}

/**
 * Check if there are pending operations
 */
export function hasPendingOperations(): boolean {
  return getQueueLength() > 0
}

/**
 * Last-write-wins conflict resolution
 * Compares two records and returns the one with the later updated_at timestamp
 * Requirements: 6.4
 * 
 * @param localRecord - The local record (from offline queue)
 * @param remoteRecord - The remote record (from Supabase)
 * @returns 'local' if local wins, 'remote' if remote wins
 */
export function resolveConflict(
  localTimestamp: string | number,
  remoteTimestamp: string | number
): 'local' | 'remote' {
  const localTime = typeof localTimestamp === 'string' 
    ? new Date(localTimestamp).getTime() 
    : localTimestamp
  const remoteTime = typeof remoteTimestamp === 'string' 
    ? new Date(remoteTimestamp).getTime() 
    : remoteTimestamp
  
  // Last-write-wins: the record with the later timestamp wins
  return localTime >= remoteTime ? 'local' : 'remote'
}

/**
 * Sort operations by timestamp for FIFO processing
 * Requirements: 6.3
 */
export function sortByTimestamp(operations: QueuedOperation[]): QueuedOperation[] {
  return [...operations].sort((a, b) => a.timestamp - b.timestamp)
}
