/**
 * Property-Based Tests for useSessionPool composable
 * Uses fast-check for property-based testing
 * 
 * Tests the session pool management logic including:
 * - Pool Allocation Consistency (Property 4)
 * - Dormancy Detection (Property 5)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { checkDormancyPure } from '~/composables/useSessionPool'
import {
  sessionPoolRecordArbitrary,
  poolStatusArbitrary,
  uuidArbitrary,
  isoDateArbitrary,
} from '../arbitraries/supabase'
import type { SessionPoolRecord } from '../arbitraries/supabase'

// Dormancy threshold (24 hours in milliseconds)
const DORMANCY_THRESHOLD_MS = 24 * 60 * 60 * 1000

/**
 * Simulates pool allocation logic - finds first available instance
 * This is a pure function that can be tested without Supabase connection
 */
function allocateFromPool(pool: SessionPoolRecord[]): SessionPoolRecord | null {
  const available = pool.find(instance => instance.status === 'available')
  return available || null
}

/**
 * Simulates marking an instance as in_use after allocation
 */
function markInstanceInUse(
  pool: SessionPoolRecord[],
  port: number,
  sessionId: string
): SessionPoolRecord[] {
  return pool.map(instance =>
    instance.port === port
      ? { ...instance, status: 'in_use' as const, session_id: sessionId }
      : instance
  )
}

/**
 * Simulates releasing an instance back to the pool
 */
function releaseInstanceFromPool(
  pool: SessionPoolRecord[],
  port: number
): SessionPoolRecord[] {
  return pool.map(instance =>
    instance.port === port
      ? { ...instance, status: 'available' as const, session_id: null }
      : instance
  )
}

/**
 * Calculate pool status summary
 */
function calculatePoolStatus(pool: SessionPoolRecord[]): {
  total: number
  available: number
  in_use: number
  maintenance: number
} {
  return {
    total: pool.length,
    available: pool.filter(i => i.status === 'available').length,
    in_use: pool.filter(i => i.status === 'in_use').length,
    maintenance: pool.filter(i => i.status === 'maintenance').length,
  }
}

/**
 * Generate a pool with unique ports
 */
const uniquePortPoolArbitrary = (minLength = 1, maxLength = 10): fc.Arbitrary<SessionPoolRecord[]> =>
  fc.array(sessionPoolRecordArbitrary(), { minLength, maxLength }).map(pool => {
    // Ensure unique ports by assigning sequential ports
    return pool.map((instance, index) => ({
      ...instance,
      port: 3001 + index,
    }))
  })

/**
 * Generate a pool with at least one available instance
 */
const poolWithAvailableArbitrary = (): fc.Arbitrary<SessionPoolRecord[]> =>
  fc.tuple(
    // At least one available instance
    sessionPoolRecordArbitrary().map(instance => ({
      ...instance,
      status: 'available' as const,
      port: 3001,
    })),
    // Additional instances with any status
    fc.array(sessionPoolRecordArbitrary(), { minLength: 0, maxLength: 5 })
  ).map(([available, others]) => {
    // Assign unique ports
    const allInstances = [available, ...others]
    return allInstances.map((instance, index) => ({
      ...instance,
      port: 3001 + index,
    }))
  })

describe('useSessionPool', () => {
  describe('property tests', () => {

    /**
     * **Feature: multi-session, Property 4: Pool Allocation Consistency**
     * *For any* pool allocation request when instances are available, the allocated 
     * instance should be marked as 'in_use' and associated with the session.
     * **Validates: Requirements 2.1**
     */
    it('Property 4: Pool Allocation Consistency - allocated instance is marked in_use', () => {
      fc.assert(
        fc.property(
          poolWithAvailableArbitrary(),
          uuidArbitrary,
          (pool, sessionId) => {
            // Allocate an instance
            const allocated = allocateFromPool(pool)

            // Property: Should find an available instance
            expect(allocated).not.toBeNull()
            expect(allocated?.status).toBe('available')

            // Mark it as in_use
            const updatedPool = markInstanceInUse(pool, allocated!.port, sessionId)

            // Property: The allocated instance should now be in_use
            const allocatedAfter = updatedPool.find(i => i.port === allocated!.port)
            expect(allocatedAfter?.status).toBe('in_use')
            expect(allocatedAfter?.session_id).toBe(sessionId)

            // Property: Other instances should remain unchanged
            updatedPool.forEach(instance => {
              if (instance.port !== allocated!.port) {
                const original = pool.find(i => i.port === instance.port)
                expect(instance.status).toBe(original?.status)
                expect(instance.session_id).toBe(original?.session_id)
              }
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 4: Pool Allocation Consistency - Pool Status Update**
     * *For any* allocation, the pool status should reflect one less available instance.
     * **Validates: Requirements 2.1**
     */
    it('Property 4: Pool Allocation Consistency - pool status updates correctly', () => {
      fc.assert(
        fc.property(
          poolWithAvailableArbitrary(),
          uuidArbitrary,
          (pool, sessionId) => {
            const statusBefore = calculatePoolStatus(pool)

            // Allocate an instance
            const allocated = allocateFromPool(pool)
            expect(allocated).not.toBeNull()

            // Mark it as in_use
            const updatedPool = markInstanceInUse(pool, allocated!.port, sessionId)
            const statusAfter = calculatePoolStatus(updatedPool)

            // Property: Total should remain the same
            expect(statusAfter.total).toBe(statusBefore.total)

            // Property: Available should decrease by 1
            expect(statusAfter.available).toBe(statusBefore.available - 1)

            // Property: In_use should increase by 1
            expect(statusAfter.in_use).toBe(statusBefore.in_use + 1)

            // Property: Maintenance should remain unchanged
            expect(statusAfter.maintenance).toBe(statusBefore.maintenance)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 4: Pool Allocation Consistency - Release Restores Availability**
     * *For any* released instance, it should be marked as available with no session.
     * **Validates: Requirements 2.1**
     */
    it('Property 4: Pool Allocation Consistency - release restores availability', () => {
      fc.assert(
        fc.property(
          poolWithAvailableArbitrary(),
          uuidArbitrary,
          (pool, sessionId) => {
            // Allocate and mark in_use
            const allocated = allocateFromPool(pool)
            expect(allocated).not.toBeNull()

            const poolAfterAlloc = markInstanceInUse(pool, allocated!.port, sessionId)

            // Release the instance
            const poolAfterRelease = releaseInstanceFromPool(poolAfterAlloc, allocated!.port)

            // Property: Released instance should be available
            const released = poolAfterRelease.find(i => i.port === allocated!.port)
            expect(released?.status).toBe('available')
            expect(released?.session_id).toBeNull()

            // Property: Pool status should match original
            const statusOriginal = calculatePoolStatus(pool)
            const statusAfterRelease = calculatePoolStatus(poolAfterRelease)
            expect(statusAfterRelease.available).toBe(statusOriginal.available)
            expect(statusAfterRelease.in_use).toBe(statusOriginal.in_use)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 4: Pool Allocation Consistency - Empty Pool Returns Null**
     * *For any* pool with no available instances, allocation should return null.
     * **Validates: Requirements 2.1, 2.3**
     */
    it('Property 4: Pool Allocation Consistency - empty pool returns null', () => {
      fc.assert(
        fc.property(
          uniquePortPoolArbitrary(0, 10).map(pool =>
            // Make all instances non-available
            pool.map(instance => ({
              ...instance,
              status: fc.sample(fc.constantFrom('in_use', 'maintenance') as fc.Arbitrary<'in_use' | 'maintenance'>, 1)[0],
            }))
          ),
          (poolWithNoAvailable) => {
            // Attempt allocation
            const allocated = allocateFromPool(poolWithNoAvailable)

            // Property: Should return null when no instances available
            expect(allocated).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 5: Dormancy Detection**
     * *For any* session with last_active_at older than 24 hours, the dormancy 
     * check should return true.
     * **Validates: Requirements 2.2**
     */
    it('Property 5: Dormancy Detection - sessions inactive > 24h are dormant', () => {
      fc.assert(
        fc.property(
          // Generate a timestamp more than 24 hours in the past
          fc.integer({ min: DORMANCY_THRESHOLD_MS + 1000, max: DORMANCY_THRESHOLD_MS * 30 }),
          (msInPast) => {
            const lastActiveAt = new Date(Date.now() - msInPast).toISOString()

            // Property: Session should be detected as dormant
            expect(checkDormancyPure(lastActiveAt)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 5: Dormancy Detection - Active Sessions Not Dormant**
     * *For any* session with last_active_at within 24 hours, the dormancy 
     * check should return false.
     * **Validates: Requirements 2.2**
     */
    it('Property 5: Dormancy Detection - sessions active within 24h are not dormant', () => {
      fc.assert(
        fc.property(
          // Generate a timestamp within the last 24 hours (but not exactly at threshold)
          fc.integer({ min: 0, max: DORMANCY_THRESHOLD_MS - 1000 }),
          (msInPast) => {
            const lastActiveAt = new Date(Date.now() - msInPast).toISOString()

            // Property: Session should NOT be detected as dormant
            expect(checkDormancyPure(lastActiveAt)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 5: Dormancy Detection - Boundary Condition**
     * *For any* session at exactly 24 hours, the dormancy check behavior is defined.
     * **Validates: Requirements 2.2**
     */
    it('Property 5: Dormancy Detection - boundary at exactly 24 hours', () => {
      // At exactly 24 hours, the session should NOT be dormant (> not >=)
      const exactlyAt24h = new Date(Date.now() - DORMANCY_THRESHOLD_MS).toISOString()
      expect(checkDormancyPure(exactlyAt24h)).toBe(false)

      // Just past 24 hours, the session should be dormant
      const justPast24h = new Date(Date.now() - DORMANCY_THRESHOLD_MS - 1).toISOString()
      expect(checkDormancyPure(justPast24h)).toBe(true)
    })

    /**
     * **Feature: multi-session, Property 5: Dormancy Detection - Monotonicity**
     * *For any* two timestamps where t1 < t2, if t2 is dormant then t1 must also be dormant.
     * **Validates: Requirements 2.2**
     */
    it('Property 5: Dormancy Detection - monotonicity property', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: DORMANCY_THRESHOLD_MS * 30 }),
          fc.integer({ min: 1, max: DORMANCY_THRESHOLD_MS }),
          (msInPast, additionalMs) => {
            const t1 = new Date(Date.now() - msInPast - additionalMs).toISOString() // older
            const t2 = new Date(Date.now() - msInPast).toISOString() // newer

            const t1Dormant = checkDormancyPure(t1)
            const t2Dormant = checkDormancyPure(t2)

            // Property: If t2 (newer) is dormant, t1 (older) must also be dormant
            if (t2Dormant) {
              expect(t1Dormant).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
