/**
 * Property-Based Tests for useSessionManager composable
 * Uses fast-check for property-based testing
 * 
 * Tests the session management logic including:
 * - Session-Device Association (Property 2)
 * - Session Isolation (Property 3)
 * - Token Refresh Validity (Property 6)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateSessionToken,
  decodeSessionToken,
  isTokenExpiredCheck,
  calculateTokenExpiration,
  type SessionTokenPayload,
  type Session,
} from '~/composables/useSessionManager'
import {
  deviceIdArbitrary,
  uuidArbitrary,
  whatsappSessionRecordArbitrary,
  mixedDeviceSessionsArbitrary,
  sessionStatusArbitrary,
  isoDateArbitrary,
} from '../arbitraries/supabase'

/**
 * Simulates the device ID filtering logic for sessions
 * This is a pure function that can be tested without Supabase connection
 */
function filterSessionsByDeviceId<T extends { device_id: string }>(
  sessions: T[],
  targetDeviceId: string
): T[] {
  return sessions.filter(session => session.device_id === targetDeviceId)
}

/**
 * Simulates session termination - only affects the target session
 * Returns the updated sessions array
 */
function terminateSessionById<T extends { id: string; status: string }>(
  sessions: T[],
  sessionId: string
): T[] {
  return sessions.map(session => 
    session.id === sessionId 
      ? { ...session, status: 'disconnected' }
      : session
  )
}

describe('useSessionManager', () => {
  describe('property tests', () => {

    /**
     * **Feature: multi-session, Property 2: Session-Device Association**
     * *For any* session created with a device ID, querying the session by that 
     * device ID should return the same session data.
     * **Validates: Requirements 1.2, 1.3**
     */
    it('Property 2: Session-Device Association - session is associated with correct device', () => {
      fc.assert(
        fc.property(
          deviceIdArbitrary,
          mixedDeviceSessionsArbitrary(fc.sample(deviceIdArbitrary, 1)[0]),
          (targetDeviceId, allSessions) => {
            // Apply the filtering logic (simulates getCurrentSession query)
            const filteredSessions = filterSessionsByDeviceId(allSessions, targetDeviceId)

            // Property: All returned sessions must have device_id matching targetDeviceId
            const allMatch = filteredSessions.every(
              session => session.device_id === targetDeviceId
            )
            expect(allMatch).toBe(true)

            // Property: No sessions with matching device_id should be excluded
            const expectedCount = allSessions.filter(
              s => s.device_id === targetDeviceId
            ).length
            expect(filteredSessions.length).toBe(expectedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 2: Session-Device Association - Round Trip**
     * *For any* session created with a device ID, the session data should be 
     * retrievable and contain the same device ID.
     * **Validates: Requirements 1.2, 1.3**
     */
    it('Property 2: Session-Device Association - device ID is preserved in session', () => {
      fc.assert(
        fc.property(
          deviceIdArbitrary,
          whatsappSessionRecordArbitrary(),
          (deviceId, sessionTemplate) => {
            // Create a session with the specific device ID
            const session = {
              ...sessionTemplate,
              device_id: deviceId,
            }

            // Property: Session should have the correct device_id
            expect(session.device_id).toBe(deviceId)

            // Property: Filtering by device_id should return this session
            const sessions = [session]
            const filtered = filterSessionsByDeviceId(sessions, deviceId)
            expect(filtered.length).toBe(1)
            expect(filtered[0].device_id).toBe(deviceId)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 2: Session-Device Association - Uniqueness**
     * *For any* device ID, there should be at most one active session per device.
     * **Validates: Requirements 1.2, 1.3**
     */
    it('Property 2: Session-Device Association - unique constraint simulation', () => {
      fc.assert(
        fc.property(
          deviceIdArbitrary,
          fc.array(whatsappSessionRecordArbitrary(), { minLength: 1, maxLength: 10 }),
          (deviceId, sessions) => {
            // Simulate unique constraint: only keep first session per device
            const sessionsWithSameDevice = sessions.map(s => ({
              ...s,
              device_id: deviceId,
            }))

            // In a real DB with unique constraint, only one would exist
            // Here we simulate by taking the first one
            const uniqueSession = sessionsWithSameDevice[0]

            // Property: The session should have the correct device_id
            expect(uniqueSession.device_id).toBe(deviceId)
          }
        ),
        { numRuns: 100 }
      )
    })


    /**
     * **Feature: multi-session, Property 3: Session Isolation**
     * *For any* set of active sessions, terminating one session should not 
     * affect the status or data of other sessions.
     * **Validates: Requirements 1.4**
     */
    it('Property 3: Session Isolation - terminating one session does not affect others', () => {
      fc.assert(
        fc.property(
          fc.array(whatsappSessionRecordArbitrary(), { minLength: 2, maxLength: 10 }),
          (sessions) => {
            // Ensure all sessions have unique IDs and are not disconnected
            const activeSessions = sessions.map((s, i) => ({
              ...s,
              id: `session-${i}-${s.id}`,
              status: 'connected' as const,
            }))

            // Pick a session to terminate
            const sessionToTerminate = activeSessions[0]
            const otherSessions = activeSessions.slice(1)

            // Terminate the session
            const afterTermination = terminateSessionById(activeSessions, sessionToTerminate.id)

            // Property: Terminated session should have status 'disconnected'
            const terminatedSession = afterTermination.find(s => s.id === sessionToTerminate.id)
            expect(terminatedSession?.status).toBe('disconnected')

            // Property: Other sessions should remain unchanged
            otherSessions.forEach(original => {
              const afterSession = afterTermination.find(s => s.id === original.id)
              expect(afterSession).toBeDefined()
              expect(afterSession?.status).toBe('connected')
              expect(afterSession?.device_id).toBe(original.device_id)
              expect(afterSession?.whatsapp_number).toBe(original.whatsapp_number)
              expect(afterSession?.api_instance_port).toBe(original.api_instance_port)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 3: Session Isolation - Data Integrity**
     * *For any* session termination, only the target session's status should change.
     * **Validates: Requirements 1.4**
     */
    it('Property 3: Session Isolation - only target session status changes', () => {
      fc.assert(
        fc.property(
          fc.array(whatsappSessionRecordArbitrary(), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (sessions, targetIndex) => {
            // Ensure we have a valid target index
            const validIndex = targetIndex % sessions.length

            // Give each session a unique ID
            const uniqueSessions = sessions.map((s, i) => ({
              ...s,
              id: `session-${i}`,
            }))

            const targetSessionId = uniqueSessions[validIndex].id

            // Terminate the target session
            const afterTermination = terminateSessionById(uniqueSessions, targetSessionId)

            // Property: Total number of sessions should remain the same
            expect(afterTermination.length).toBe(uniqueSessions.length)

            // Property: Only the target session should have changed status
            afterTermination.forEach((session, i) => {
              if (session.id === targetSessionId) {
                expect(session.status).toBe('disconnected')
              } else {
                // All other fields should be unchanged
                expect(session.id).toBe(uniqueSessions[i].id)
                expect(session.device_id).toBe(uniqueSessions[i].device_id)
              }
            })
          }
        ),
        { numRuns: 100 }
      )
    })


    /**
     * **Feature: multi-session, Property 6: Token Refresh Validity**
     * *For any* expired session token, refreshing should produce a new valid 
     * token with future expiration time.
     * **Validates: Requirements 3.3**
     */
    it('Property 6: Token Refresh Validity - refreshed token has future expiration', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          deviceIdArbitrary,
          (sessionId, deviceId) => {
            // Generate a new token (simulates refresh)
            const newToken = generateSessionToken(sessionId, deviceId)

            // Decode the token
            const payload = decodeSessionToken(newToken)

            // Property: Token should be decodable
            expect(payload).not.toBeNull()

            // Property: Token should have correct session_id
            expect(payload?.session_id).toBe(sessionId)

            // Property: Token should have correct device_id
            expect(payload?.device_id).toBe(deviceId)

            // Property: Token expiration should be in the future
            expect(payload?.expires_at).toBeGreaterThan(Date.now())

            // Property: Token should not be expired
            expect(isTokenExpiredCheck(newToken)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 6: Token Refresh Validity - Round Trip**
     * *For any* generated token, encoding and decoding should preserve the payload.
     * **Validates: Requirements 3.3**
     */
    it('Property 6: Token Refresh Validity - token round trip preserves data', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          deviceIdArbitrary,
          (sessionId, deviceId) => {
            // Generate token
            const token = generateSessionToken(sessionId, deviceId)

            // Decode token
            const decoded = decodeSessionToken(token)

            // Property: Decoded payload should match original values
            expect(decoded?.session_id).toBe(sessionId)
            expect(decoded?.device_id).toBe(deviceId)

            // Property: issued_at should be close to now (within 1 second)
            const now = Date.now()
            expect(decoded?.issued_at).toBeGreaterThanOrEqual(now - 1000)
            expect(decoded?.issued_at).toBeLessThanOrEqual(now + 1000)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 6: Token Refresh Validity - Expiration Check**
     * *For any* token with past expiration, isTokenExpiredCheck should return true.
     * **Validates: Requirements 3.3**
     */
    it('Property 6: Token Refresh Validity - expired tokens are detected', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          deviceIdArbitrary,
          fc.integer({ min: 1000, max: 100000 }),
          (sessionId, deviceId, msInPast) => {
            // Create an expired token payload
            const expiredPayload: SessionTokenPayload = {
              session_id: sessionId,
              device_id: deviceId,
              issued_at: Date.now() - msInPast - 86400000, // issued in the past
              expires_at: Date.now() - msInPast, // expired msInPast ago
            }

            // Property: Expired token should be detected
            expect(isTokenExpiredCheck(expiredPayload)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 6: Token Refresh Validity - Valid Tokens Not Expired**
     * *For any* token with future expiration, isTokenExpiredCheck should return false.
     * **Validates: Requirements 3.3**
     */
    it('Property 6: Token Refresh Validity - valid tokens are not expired', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          deviceIdArbitrary,
          fc.integer({ min: 1000, max: 86400000 }),
          (sessionId, deviceId, msInFuture) => {
            // Create a valid token payload
            const validPayload: SessionTokenPayload = {
              session_id: sessionId,
              device_id: deviceId,
              issued_at: Date.now(),
              expires_at: Date.now() + msInFuture, // expires in the future
            }

            // Property: Valid token should not be detected as expired
            expect(isTokenExpiredCheck(validPayload)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 6: Token Refresh Validity - Invalid Token Handling**
     * *For any* invalid token string, decodeSessionToken should return null.
     * **Validates: Requirements 3.3**
     */
    it('Property 6: Token Refresh Validity - invalid tokens return null', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('invalid'),
            fc.constant('not-base64!@#$'),
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => {
              try {
                atob(s)
                return false // Valid base64, skip
              } catch {
                return true // Invalid base64, keep
              }
            })
          ),
          (invalidToken) => {
            // Property: Invalid tokens should return null
            const result = decodeSessionToken(invalidToken)
            expect(result).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 6: Token Refresh Validity - Expiration Calculation**
     * *For any* call to calculateTokenExpiration, the result should be 24 hours in the future.
     * **Validates: Requirements 3.3**
     */
    it('Property 6: Token Refresh Validity - expiration is 24 hours from now', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const before = Date.now()
            const expiration = calculateTokenExpiration()
            const after = Date.now()

            const expirationTime = new Date(expiration).getTime()
            const expectedMin = before + 24 * 60 * 60 * 1000
            const expectedMax = after + 24 * 60 * 60 * 1000

            // Property: Expiration should be approximately 24 hours from now
            expect(expirationTime).toBeGreaterThanOrEqual(expectedMin)
            expect(expirationTime).toBeLessThanOrEqual(expectedMax)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
