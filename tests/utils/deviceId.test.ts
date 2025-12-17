/**
 * Property-Based Tests for deviceId utility
 * Uses fast-check for property-based testing
 * 
 * **Feature: multi-session, Property 1: Device ID Uniqueness**
 * **Validates: Requirements 1.1**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { generateDeviceId, isValidDeviceId } from '~/utils/deviceId'

describe('deviceId', () => {
  describe('property tests', () => {
    /**
     * **Feature: multi-session, Property 1: Device ID Uniqueness**
     * *For any* set of generated device IDs, all IDs should be unique 
     * and no two devices should share the same ID.
     * **Validates: Requirements 1.1**
     */
    it('Property 1: Device ID Uniqueness - all generated IDs should be unique', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          (count) => {
            // Generate N device IDs
            const deviceIds = Array.from({ length: count }, () => generateDeviceId())

            // Property: All IDs should be unique
            const uniqueIds = new Set(deviceIds)
            expect(uniqueIds.size).toBe(count)

            // Property: All IDs should be valid
            deviceIds.forEach(id => {
              expect(isValidDeviceId(id)).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 1: Device ID Uniqueness - Format Validation**
     * *For any* generated device ID, it should match the expected UUID v4 format.
     * **Validates: Requirements 1.1**
     */
    it('Property 1: Device ID Uniqueness - generated IDs have valid UUID format', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const deviceId = generateDeviceId()

            // Property: Generated ID should be valid
            expect(isValidDeviceId(deviceId)).toBe(true)

            // Property: Generated ID should be a non-empty string
            expect(typeof deviceId).toBe('string')
            expect(deviceId.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 1: Device ID Uniqueness - Validation Rejects Invalid IDs**
     * *For any* invalid string, the validation function should return false.
     * **Validates: Requirements 1.1**
     */
    it('Property 1: Device ID Uniqueness - validation rejects invalid IDs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('invalid'),
            fc.constant('12345'),
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes('-')),
            fc.constant('not-a-uuid-format'),
            fc.constant('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx') // Wrong version
          ),
          (invalidId) => {
            // Property: Invalid IDs should fail validation
            expect(isValidDeviceId(invalidId)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: multi-session, Property 1: Device ID Uniqueness - Validation Accepts Valid UUIDs**
     * *For any* valid UUID v4, the validation function should return true.
     * **Validates: Requirements 1.1**
     */
    it('Property 1: Device ID Uniqueness - validation accepts valid UUIDs', () => {
      // Helper to generate hex string of specific length
      const hexChars = '0123456789abcdef'
      const hexStringArb = (length: number) => 
        fc.array(fc.constantFrom(...hexChars.split('')), { minLength: length, maxLength: length })
          .map(chars => chars.join(''))

      // Custom UUID v4 arbitrary - generates only UUID version 4
      const uuidV4Arbitrary = fc.tuple(
        hexStringArb(8),
        hexStringArb(4),
        hexStringArb(3),
        fc.constantFrom('8', '9', 'a', 'b'),
        hexStringArb(3),
        hexStringArb(12)
      ).map(([p1, p2, p3, variant, p4, p5]) => 
        `${p1}-${p2}-4${p3}-${variant}${p4}-${p5}`
      )

      fc.assert(
        fc.property(
          uuidV4Arbitrary,
          (validUuid) => {
            // Property: Valid UUID v4 should pass validation
            expect(isValidDeviceId(validUuid)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
