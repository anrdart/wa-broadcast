# Multi-Session Integration Tests

This document contains manual integration test procedures for the multi-session WhatsApp feature.
These tests require real browser interactions and cannot be fully automated.

## Prerequisites

1. Supabase project running with `whatsapp_sessions` and `session_pool` tables
2. At least 2 WhatsApp API instances running (ports 3001-3005)
3. Nuxt development server running (`npm run dev`)
4. Two different browsers (e.g., Chrome and Firefox) or Chrome Incognito mode

---

## Test 12.1: Multi-Browser Session Isolation

**Requirements Validated:** 1.4 (Session isolation between users)

### Objective
Verify that each browser/device gets a unique WhatsApp session and actions in one browser don't affect the other.

### Test Steps

#### Step 1: Open App in Browser A (Chrome)
- [ ] Open Broadcasto in Chrome
- [ ] Open DevTools → Application → Local Storage
- [ ] Note the `broadcasto_device_id` value: `_________________`
- [ ] Verify QR code is displayed (new session)

#### Step 2: Open App in Browser B (Firefox or Incognito)
- [ ] Open Broadcasto in Firefox (or Chrome Incognito)
- [ ] Open DevTools → Application → Local Storage
- [ ] Note the `broadcasto_device_id` value: `_________________`
- [ ] Verify this device ID is DIFFERENT from Browser A
- [ ] Verify QR code is displayed (new session)

#### Step 3: Verify Database Records
- [ ] Open Supabase Dashboard → Table Editor → `whatsapp_sessions`
- [ ] Verify TWO session records exist with different `device_id` values
- [ ] Verify each session has a different `api_instance_port`

#### Step 4: Connect Browser A
- [ ] Scan QR code in Browser A with WhatsApp
- [ ] Verify status changes to "Connected" with phone number
- [ ] Note the connected phone number: `_________________`

#### Step 5: Verify Browser B is Unaffected
- [ ] Switch to Browser B
- [ ] Verify QR code is still displayed (not connected)
- [ ] Verify status is still "Pending" or "Disconnected"

#### Step 6: Connect Browser B (Optional - requires second WhatsApp)
- [ ] If you have a second WhatsApp account, scan QR in Browser B
- [ ] Verify Browser B shows "Connected" with different phone number
- [ ] Verify Browser A still shows its original connected status

#### Step 7: Test Action Isolation
- [ ] In Browser A, perform an action (e.g., view contacts)
- [ ] Verify Browser B state is unchanged
- [ ] In Browser B, refresh the page
- [ ] Verify Browser A state is unchanged

#### Step 8: Test Logout Isolation
- [ ] In Browser A, click Logout
- [ ] Verify Browser A shows QR code (disconnected)
- [ ] Verify Browser B is still connected (if connected) or unchanged

### Expected Results
- [x] Each browser has a unique device ID
- [x] Each browser has a separate session record in Supabase
- [x] Connecting one browser doesn't affect the other
- [x] Logging out one browser doesn't affect the other

### Pass/Fail: _______ Date: _______ Tester: _______

---

## Test 12.2: Session Persistence Across Refresh

**Requirements Validated:** 3.1, 3.2 (Session persistence)

### Objective
Verify that WhatsApp sessions persist across browser refresh and browser close/reopen.

### Test Steps

#### Part A: Browser Refresh Test

##### Step 1: Establish Connection
- [ ] Open Broadcasto in a browser
- [ ] Note the device ID from localStorage: `_________________`
- [ ] Scan QR code and connect WhatsApp
- [ ] Verify status shows "Connected" with phone number
- [ ] Note the session ID from Supabase: `_________________`

##### Step 2: Refresh Browser
- [ ] Press F5 or click Refresh button
- [ ] Start timer: `_________________`

##### Step 3: Verify Session Restored
- [ ] Verify status returns to "Connected" (not QR code)
- [ ] Stop timer - restoration time: `_________________` seconds
- [ ] Verify phone number matches original
- [ ] Verify device ID in localStorage is unchanged
- [ ] Verify session ID in Supabase is unchanged

##### Step 4: Verify Active Connection
- [ ] Perform an action (e.g., load contacts)
- [ ] Verify action succeeds (connection is functional)

#### Part B: Browser Close/Reopen Test

##### Step 5: Close Browser Completely
- [ ] Note current time: `_________________`
- [ ] Close the browser completely (all windows)
- [ ] Wait 10 seconds

##### Step 6: Reopen Browser
- [ ] Open the browser
- [ ] Navigate to Broadcasto
- [ ] Start timer: `_________________`

##### Step 7: Verify Session Restored
- [ ] Verify status shows "Connected" (not QR code)
- [ ] Stop timer - restoration time: `_________________` seconds
- [ ] Verify restoration completed within 5 seconds (Requirement 3.2)
- [ ] Verify phone number matches original
- [ ] Verify device ID in localStorage is unchanged

##### Step 8: Verify Functional Connection
- [ ] Perform an action (e.g., send a test message)
- [ ] Verify action succeeds

#### Part C: Token Refresh Test (Optional)

##### Step 9: Check Token Expiration
- [ ] Open Supabase → `whatsapp_sessions` table
- [ ] Note `token_expires_at` value: `_________________`
- [ ] Verify token expiration is ~24 hours from creation

##### Step 10: Simulate Token Refresh
- [ ] Manually update `token_expires_at` to a past time in Supabase
- [ ] Refresh the browser
- [ ] Verify session is restored (token auto-refreshed)
- [ ] Check Supabase - verify `token_expires_at` is now in the future

### Expected Results
- [x] Browser refresh maintains connection (no QR code shown)
- [x] Browser close/reopen restores session within 5 seconds
- [x] Device ID persists across browser sessions
- [x] Session token is automatically refreshed when expired
- [x] Connection remains functional after restoration

### Pass/Fail: _______ Date: _______ Tester: _______

---

## Troubleshooting

### Session Not Restoring
1. Check localStorage for `broadcasto_device_id` - should persist
2. Check localStorage for `broadcasto_session_token` - should exist
3. Check Supabase `whatsapp_sessions` table for matching device_id
4. Check session status is not 'dormant' or 'disconnected'

### Different Device IDs
1. Verify not using Incognito/Private mode (localStorage cleared on close)
2. Check browser settings for localStorage persistence
3. Verify no browser extensions clearing storage

### Connection Lost After Refresh
1. Check WhatsApp API instance is still running
2. Check `session_pool` table - instance should be 'in_use'
3. Check network connectivity to API instance

---

## Test Summary

| Test | Status | Date | Notes |
|------|--------|------|-------|
| 12.1 Multi-Browser Isolation | | | |
| 12.2 Session Persistence | | | |

