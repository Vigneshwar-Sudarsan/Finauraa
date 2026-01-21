# AI Mode Testing Guide

## Prerequisites
1. ✅ Database migrations applied (see supabase/MIGRATION_GUIDE.md)
2. ✅ Dev server running (`npm run dev`)
3. ✅ Logged in user account
4. ✅ Browser dev tools open

## Test Checklist

### ✅ Phase 1: Database Migration Verification

1. **Verify AI Privacy Columns Exist**
   - Go to Supabase Dashboard → Database → Tables → profiles
   - Check for these columns:
     - `ai_data_mode` (text, default: 'privacy-first')
     - `enhanced_ai_consent_given_at` (timestamptz, nullable)
     - `enhanced_ai_consent_ip` (text, nullable)

2. **Verify RLS is Enabled**
   - Go to Supabase Dashboard → Database → Tables
   - Check each table (profiles, bank_connections, bank_accounts, transactions, budgets, savings_goals)
   - Each should show "RLS enabled" status

### ✅ Phase 2: API Endpoint Testing

#### Test 1: GET /api/user/ai-mode (Fetch Current Mode)

```bash
# Test with browser console
fetch('/api/user/ai-mode')
  .then(r => r.json())
  .then(console.log)

# Expected response:
{
  "mode": "privacy-first",
  "isPro": false,
  "hasConsent": false,
  "canUseEnhanced": false,
  "consentGivenAt": null
}
```

**Pass Criteria:**
- ✅ Returns 200 OK
- ✅ `mode` is "privacy-first" (default)
- ✅ `isPro` matches your account status
- ✅ `canUseEnhanced` is false for Free users

#### Test 2: POST /api/user/ai-mode (Free User Tries Enhanced)

```bash
# Test with browser console
fetch('/api/user/ai-mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'enhanced',
    consentGiven: true
  })
}).then(r => r.json()).then(console.log)

# Expected response (if Free user):
{
  "error": "Enhanced AI is a Pro feature...",
  "requiresUpgrade": true
}
```

**Pass Criteria:**
- ✅ Returns 403 Forbidden
- ✅ Error message mentions Pro requirement
- ✅ `requiresUpgrade` is true

#### Test 3: POST /api/user/ai-mode (Pro User Without Consent)

First, manually set `is_pro = true` in profiles table for testing.

```bash
fetch('/api/user/ai-mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'enhanced',
    consentGiven: false  // or omit this field
  })
}).then(r => r.json()).then(console.log)

# Expected response:
{
  "error": "Consent required to enable Enhanced AI",
  "requiresConsent": true
}
```

**Pass Criteria:**
- ✅ Returns 400 Bad Request
- ✅ Error message mentions consent requirement
- ✅ `requiresConsent` is true

#### Test 4: POST /api/user/ai-mode (Pro User With Consent - Enable Enhanced)

```bash
fetch('/api/user/ai-mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'enhanced',
    consentGiven: true
  })
}).then(r => r.json()).then(console.log)

# Expected response:
{
  "success": true,
  "mode": "enhanced",
  "message": "Enhanced AI enabled. You'll now receive specific financial insights..."
}
```

**Pass Criteria:**
- ✅ Returns 200 OK
- ✅ `success` is true
- ✅ `mode` is "enhanced"
- ✅ Success message shown

**Verify in Database:**
- Go to Supabase → profiles table
- Find your user row
- Check:
  - ✅ `ai_data_mode` = 'enhanced'
  - ✅ `enhanced_ai_consent_given_at` has a timestamp
  - ✅ `enhanced_ai_consent_ip` has an IP address

#### Test 5: POST /api/user/ai-mode (Switch Back to Privacy-First)

```bash
fetch('/api/user/ai-mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'privacy-first'
  })
}).then(r => r.json()).then(console.log)

# Expected response:
{
  "success": true,
  "mode": "privacy-first",
  "message": "Privacy-first mode enabled. Your financial data will be anonymized..."
}
```

**Pass Criteria:**
- ✅ Returns 200 OK
- ✅ No consent required to switch back
- ✅ Mode updated in database

### ✅ Phase 3: UI Testing

#### Test 6: Settings Page Navigation

1. Go to `/dashboard/settings`
2. Scroll to "AI Settings" section
3. Click on "AI Privacy Settings"

**Pass Criteria:**
- ✅ Navigates to `/dashboard/settings/ai-privacy`
- ✅ Back button visible at top
- ✅ Back button returns to settings

#### Test 7: AI Privacy Settings Page (Free User)

1. On AI Privacy Settings page
2. Observe the UI

**Pass Criteria:**
- ✅ Two mode cards shown (Privacy-First and Enhanced AI)
- ✅ Privacy-First card is highlighted (active)
- ✅ Enhanced AI card has "Pro Only" badge
- ✅ Toggle switch is OFF (privacy-first)
- ✅ 4 comparison examples displayed
- ✅ Privacy protection info shown

#### Test 8: Try Enabling Enhanced AI (Free User)

1. Click the toggle switch to enable Enhanced AI

**Pass Criteria:**
- ✅ Alert shows: "Enhanced AI is a Pro feature. Upgrade to Pro for BHD 2.900/month..."
- ✅ Toggle remains OFF
- ✅ Mode stays "privacy-first"

#### Test 9: Enable Enhanced AI (Pro User)

1. Set `is_pro = true` in database for your user
2. Refresh the page
3. Click toggle to enable Enhanced AI

**Pass Criteria:**
- ✅ Consent dialog opens
- ✅ Dialog shows 2 comparison examples
- ✅ "What Data Gets Shared" section visible
- ✅ "Our Privacy Guarantees" section visible
- ✅ Two checkboxes present (both unchecked)
- ✅ "Enable Enhanced AI" button is disabled

#### Test 10: Consent Dialog Flow

1. In the consent dialog:
2. Check first checkbox "I understand exact data will be shared"
3. Observe button status

**Pass Criteria:**
- ✅ Button still disabled (need both checkboxes)

4. Check second checkbox "I agree to share data"
5. Observe button status

**Pass Criteria:**
- ✅ Button now enabled

6. Click "Enable Enhanced AI" button

**Pass Criteria:**
- ✅ Dialog closes
- ✅ Alert shows success message
- ✅ Toggle switch is now ON
- ✅ Enhanced AI card is highlighted
- ✅ Badge shows "Enhanced AI Active" in header

**Verify in Database:**
- ✅ `ai_data_mode` = 'enhanced'
- ✅ `enhanced_ai_consent_given_at` has timestamp
- ✅ `enhanced_ai_consent_ip` recorded

#### Test 11: Switch Back to Privacy-First

1. On AI Privacy Settings page (Enhanced mode active)
2. Click toggle to disable Enhanced AI

**Pass Criteria:**
- ✅ No consent dialog (immediate switch)
- ✅ Alert shows "Privacy-first mode enabled..."
- ✅ Toggle switch is now OFF
- ✅ Privacy-First card is highlighted
- ✅ Badge removed from header

### ✅ Phase 4: Chat Integration Testing

#### Test 12: Chat with Privacy-First Mode

1. Enable Privacy-First mode (if not already)
2. Go to chat interface
3. Ask: "How much did I spend on groceries last week?"

**Pass Criteria:**
- ✅ AI responds with anonymized data
- ✅ Response includes phrases like:
  - "I can see groceries is one of your frequent categories"
  - "Check your dashboard for exact details"
  - NO exact amounts mentioned
- ✅ If no bank connected: "You haven't connected a bank yet"

#### Test 13: Chat with Enhanced AI Mode

1. Enable Enhanced AI mode (Pro user with consent)
2. Go to chat interface
3. Ask: "How much did I spend on groceries last week?"

**Pass Criteria:**
- ✅ AI responds with specific data
- ✅ Response includes exact amounts (if data exists):
  - "You spent 287.500 BHD on groceries"
  - Transaction counts
  - Specific merchants
- ✅ If no data: Still responds with structure but mentions no transactions

#### Test 14: Mode Switching During Chat

1. Start chat in Privacy-First mode
2. Ask a financial question
3. Get anonymized response
4. Switch to Enhanced AI mode
5. Ask the same question again

**Pass Criteria:**
- ✅ Second response has exact amounts
- ✅ Context is fetched fresh based on mode
- ✅ No errors in console

### ✅ Phase 5: Mobile Testing

#### Test 15: Mobile UI (Settings Page)

1. Open on mobile browser (or use Chrome DevTools responsive mode)
2. Navigate to AI Privacy Settings

**Pass Criteria:**
- ✅ Back button visible and clickable
- ✅ Mode cards stack vertically
- ✅ Comparison examples readable
- ✅ Toggle switch easy to tap
- ✅ No horizontal scrolling

#### Test 16: Mobile UI (Consent Dialog)

1. Try enabling Enhanced AI on mobile

**Pass Criteria:**
- ✅ Dialog takes full screen
- ✅ Scrollable content
- ✅ Checkboxes easy to tap
- ✅ Buttons accessible
- ✅ No layout issues

### ✅ Phase 6: Error Handling

#### Test 17: Network Error Handling

1. Open Network tab in DevTools
2. Enable "Offline" mode
3. Try toggling AI mode

**Pass Criteria:**
- ✅ Error alert shown
- ✅ Toggle reverts to previous state
- ✅ No console errors

#### Test 18: Session Expiry

1. Clear cookies/localStorage
2. Try accessing AI Privacy Settings page

**Pass Criteria:**
- ✅ Redirected to login
- ✅ After login, can access settings again

### ✅ Phase 7: Data Privacy Verification

#### Test 19: Verify Data Isolation (RLS)

1. Create two user accounts (User A and User B)
2. As User A:
   - Add bank connections
   - Create budgets
   - Generate transactions
3. As User B:
   - Try to access same data

**Pass Criteria:**
- ✅ User B sees ZERO of User A's data
- ✅ No errors in console
- ✅ Dashboard shows empty state for User B

#### Test 20: Verify AI Context in Privacy-First

1. Enable Privacy-First mode
2. Use browser Network tab
3. Send a chat message
4. Inspect `/api/chat` request

**Pass Criteria:**
- ✅ Context sent to Claude is anonymized
- ✅ No exact amounts in request
- ✅ Categories like "low", "medium", "high" instead of numbers

#### Test 21: Verify AI Context in Enhanced Mode

1. Enable Enhanced AI mode
2. Use browser Network tab
3. Send a chat message
4. Inspect `/api/chat` request

**Pass Criteria:**
- ✅ Context sent to Claude has exact amounts
- ✅ Specific transaction details included
- ✅ Merchant names visible

## Test Results Template

```
# AI Mode Testing Results - [Date]

## Environment
- Browser: [Chrome/Safari/Firefox]
- Device: [Desktop/Mobile]
- User Tier: [Free/Pro]

## Phase 1: Database ✅ / ❌
- Migration applied: ✅ / ❌
- RLS enabled: ✅ / ❌
- Notes:

## Phase 2: API Endpoints
- Test 1 (GET mode): ✅ / ❌
- Test 2 (Free user): ✅ / ❌
- Test 3 (No consent): ✅ / ❌
- Test 4 (Enable enhanced): ✅ / ❌
- Test 5 (Switch back): ✅ / ❌
- Notes:

## Phase 3: UI
- Test 6 (Navigation): ✅ / ❌
- Test 7 (Page display): ✅ / ❌
- Test 8 (Free user block): ✅ / ❌
- Test 9 (Pro user consent): ✅ / ❌
- Test 10 (Consent flow): ✅ / ❌
- Test 11 (Switch back): ✅ / ❌
- Notes:

## Phase 4: Chat
- Test 12 (Privacy-first): ✅ / ❌
- Test 13 (Enhanced): ✅ / ❌
- Test 14 (Mode switching): ✅ / ❌
- Notes:

## Phase 5: Mobile
- Test 15 (Settings UI): ✅ / ❌
- Test 16 (Consent dialog): ✅ / ❌
- Notes:

## Phase 6: Error Handling
- Test 17 (Network errors): ✅ / ❌
- Test 18 (Session expiry): ✅ / ❌
- Notes:

## Phase 7: Data Privacy
- Test 19 (RLS isolation): ✅ / ❌
- Test 20 (Privacy context): ✅ / ❌
- Test 21 (Enhanced context): ✅ / ❌
- Notes:

## Issues Found
1.
2.
3.

## Overall Status: ✅ PASS / ⚠️ ISSUES / ❌ FAIL
```

## Quick Start Testing

For a quick verification, run these essential tests:

1. **Database**: Verify RLS is enabled
2. **API**: Test GET /api/user/ai-mode
3. **UI**: Open AI Privacy Settings page
4. **Flow**: Try enabling Enhanced AI
5. **Chat**: Test both modes with a question

This covers the critical path. Full testing should be done before production deployment.
