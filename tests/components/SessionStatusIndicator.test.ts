/**
 * Property-Based Tests for SessionStatusIndicator component
 * Uses fast-check for property-based testing
 * 
 * **Feature: multi-session, Property 8: Status Indicator Correctness**
 * *For any* session status value, the indicator component should render 
 * the correct color and text corresponding to that status.
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { sessionStatusArbitrary } from '../arbitraries/supabase'

// Import the pure function from the utility file
import { getStatusConfig } from '~/utils/sessionStatus'

/**
 * Expected status configurations based on requirements
 * Requirements: 5.1, 5.2, 5.3
 */
const expectedConfigs = {
  connected: {
    color: 'green',
    text: 'Connected',
    badgeVariant: 'whatsapp',
  },
  disconnected: {
    color: 'red',
    text: 'Disconnected',
    badgeVariant: 'destructive',
  },
  pending: {
    color: 'yellow',
    text: 'Connecting...',
    badgeVariant: 'outline',
  },
  dormant: {
    color: 'gray',
    text: 'Session Expired',
    badgeVariant: 'secondary',
  },
} as const

describe('SessionStatusIndicator', () => {
  describe('property tests', () => {

    /**
     * **Feature: multi-session, Property 8: Status Indicator Correctness**
     * *For any* session status value, the indicator should render the correct 
     * color corresponding to that status.
     * **Validates: Requirements 5.1, 5.2, 5.3**
     */
    it('Property 8: Status Indicator Correctness - correct color for each status', () => {
      fc.assert(
        fc.property(
          sessionStatusArbitrary,
          (status) => {
            const config = getStatusConfig(status)
            const expected = expectedConfigs[status]

            // Property: Color should match expected for this status
            expect(config.color).toBe(expected.color)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 8: Status Indicator Correctness**
     * *For any* session status value, the indicator should render the correct 
     * text corresponding to that status.
     * **Validates: Requirements 5.1, 5.2, 5.3**
     */
    it('Property 8: Status Indicator Correctness - correct text for each status', () => {
      fc.assert(
        fc.property(
          sessionStatusArbitrary,
          (status) => {
            const config = getStatusConfig(status)
            const expected = expectedConfigs[status]

            // Property: Text should match expected for this status
            expect(config.text).toBe(expected.text)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 8: Status Indicator Correctness**
     * *For any* session status value, the indicator should render the correct 
     * badge variant corresponding to that status.
     * **Validates: Requirements 5.1, 5.2, 5.3**
     */
    it('Property 8: Status Indicator Correctness - correct badge variant for each status', () => {
      fc.assert(
        fc.property(
          sessionStatusArbitrary,
          (status) => {
            const config = getStatusConfig(status)
            const expected = expectedConfigs[status]

            // Property: Badge variant should match expected for this status
            expect(config.badgeVariant).toBe(expected.badgeVariant)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 8: Status Indicator Correctness**
     * *For any* session status value, the config should always have all required fields.
     * **Validates: Requirements 5.1, 5.2, 5.3**
     */
    it('Property 8: Status Indicator Correctness - config has all required fields', () => {
      fc.assert(
        fc.property(
          sessionStatusArbitrary,
          (status) => {
            const config = getStatusConfig(status)

            // Property: Config should have all required fields
            // Note: icon is handled separately in the component, not in the utility
            expect(config).toHaveProperty('color')
            expect(config).toHaveProperty('text')
            expect(config).toHaveProperty('badgeVariant')

            // Property: Color should be one of the valid colors
            expect(['green', 'red', 'yellow', 'gray']).toContain(config.color)

            // Property: Text should be a non-empty string
            expect(typeof config.text).toBe('string')
            expect(config.text.length).toBeGreaterThan(0)

            // Property: Badge variant should be valid
            expect(['default', 'destructive', 'outline', 'secondary', 'whatsapp']).toContain(config.badgeVariant)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 8: Status Indicator Correctness**
     * Specific test for connected status (Requirements: 5.1)
     * WHEN the WhatsApp session is active THEN the System SHALL display 
     * a green "Connected" indicator
     * **Validates: Requirements 5.1**
     */
    it('Property 8: Connected status shows green indicator (Requirement 5.1)', () => {
      const config = getStatusConfig('connected')
      
      // Requirements 5.1: Green "Connected" indicator
      expect(config.color).toBe('green')
      expect(config.text).toBe('Connected')
      expect(config.badgeVariant).toBe('whatsapp')
    })

    /**
     * **Feature: multi-session, Property 8: Status Indicator Correctness**
     * Specific test for disconnected status (Requirements: 5.2)
     * WHEN the WhatsApp session is disconnected THEN the System SHALL display 
     * a red "Disconnected" indicator
     * **Validates: Requirements 5.2**
     */
    it('Property 8: Disconnected status shows red indicator (Requirement 5.2)', () => {
      const config = getStatusConfig('disconnected')
      
      // Requirements 5.2: Red "Disconnected" indicator
      expect(config.color).toBe('red')
      expect(config.text).toBe('Disconnected')
      expect(config.badgeVariant).toBe('destructive')
    })

    /**
     * **Feature: multi-session, Property 8: Status Indicator Correctness**
     * Specific test for pending/reconnecting status (Requirements: 5.3)
     * WHEN the session is reconnecting THEN the System SHALL display 
     * a yellow "Reconnecting" indicator
     * **Validates: Requirements 5.3**
     */
    it('Property 8: Pending status shows yellow indicator (Requirement 5.3)', () => {
      const config = getStatusConfig('pending')
      
      // Requirements 5.3: Yellow "Reconnecting/Connecting" indicator
      expect(config.color).toBe('yellow')
      expect(config.text).toBe('Connecting...')
      expect(config.badgeVariant).toBe('outline')
    })

    /**
     * **Feature: multi-session, Property 8: Status Indicator Correctness**
     * *For any* unknown status value, the indicator should fall back to a safe default.
     * **Validates: Requirements 5.1, 5.2, 5.3**
     */
    it('Property 8: Unknown status falls back to safe default', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            !['connected', 'disconnected', 'pending', 'dormant'].includes(s)
          ),
          (unknownStatus) => {
            const config = getStatusConfig(unknownStatus)

            // Property: Unknown status should fall back to gray/Unknown
            expect(config.color).toBe('gray')
            expect(config.text).toBe('Unknown')
            expect(config.badgeVariant).toBe('secondary')
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
