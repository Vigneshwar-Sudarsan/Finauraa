# 🚀 Apply Database Migrations NOW - Step by Step

## ⏱️ Time Required: 5 minutes

## 📋 What You'll Do
1. Open Supabase Dashboard
2. Copy SQL file contents
3. Paste and run in SQL Editor
4. Verify success
5. Test your app

---

## Step 1: Open Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your Finauraa project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"** button (top right)

---

## Step 2: Copy the Migration SQL

1. Open the file: [supabase/APPLY_ALL_MIGRATIONS.sql](supabase/APPLY_ALL_MIGRATIONS.sql)
2. Select ALL contents (Cmd+A / Ctrl+A)
3. Copy (Cmd+C / Ctrl+C)

**OR use this command:**
```bash
cat supabase/APPLY_ALL_MIGRATIONS.sql | pbcopy
```

---

## Step 3: Paste and Run

1. In Supabase SQL Editor, paste the SQL (Cmd+V / Ctrl+V)
2. Click **"Run"** button (or press Cmd+Enter / Ctrl+Enter)
3. Wait for execution (should take 2-5 seconds)

---

## Step 4: Verify Success ✅

You should see output like this:

### Expected Results:

**AI Privacy Columns Check:**
```
column_name                    | data_type                   | column_default
-------------------------------|----------------------------|------------------
ai_data_mode                   | text                       | 'privacy-first'
enhanced_ai_consent_given_at   | timestamp with time zone   | NULL
enhanced_ai_consent_ip         | text                       | NULL
```
✅ **3 rows** = Success

**RLS Enabled Check:**
```
tablename          | rowsecurity
-------------------|-------------
bank_accounts      | true
bank_connections   | true
budgets            | true
profiles           | true
savings_goals      | true
transactions       | true
```
✅ **All true** = Success

**RLS Policies Check:**
```
tablename          | policy_count
-------------------|-------------
bank_accounts      | 4
bank_connections   | 4
budgets            | 4
profiles           | 3
savings_goals      | 4
transactions       | 4
```
✅ **3-4 policies each** = Success

**Success Message:**
```
NOTICE: ✅ All migrations applied successfully!
NOTICE: ✅ AI privacy settings added to profiles table
NOTICE: ✅ Row Level Security enabled on all tables
NOTICE: ✅ User data is now isolated and secure
```

---

## Step 5: Test Your App 🧪

### Quick Test (2 minutes)

1. **Start dev server** (if not running):
```bash
npm run dev
```

2. **Test AI Mode API** in browser console:
```javascript
// Open browser console (F12)
fetch('/api/user/ai-mode')
  .then(r => r.json())
  .then(console.log)

// Expected output:
{
  "mode": "privacy-first",
  "isPro": false,
  "hasConsent": false,
  "canUseEnhanced": false,
  "consentGivenAt": null
}
```
✅ If you see this = Success!

3. **Test AI Privacy Settings page**:
   - Go to: http://localhost:3000/dashboard/settings
   - Click "AI Privacy Settings"
   - Page should load without errors
   - You should see comparison examples

✅ Page loads = Success!

---

## 🔒 Critical: Verify RLS is Working

This is IMPORTANT - verify users can't see each other's data:

### Option A: Quick Check (1 minute)
```sql
-- Run this in Supabase SQL Editor
-- This should return policies, not data
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```
✅ If you see policies = RLS is configured

### Option B: Full Test (5 minutes)
1. Create a test user account (User A)
2. Add some bank connections
3. Logout
4. Create another test user account (User B)
5. Check if User B can see User A's data

✅ User B sees ZERO data from User A = RLS is working!

---

## ⚠️ Troubleshooting

### Error: "relation 'profiles' does not exist"
**Solution:** Your database doesn't have the profiles table yet.
- Check if you're using the correct Supabase project
- Verify you ran initial schema migrations

### Error: "permission denied for table profiles"
**Solution:** This is actually GOOD - it means RLS is working!
- Make sure you're logged in to your app
- Check that your JWT token is valid

### Error: "column 'ai_data_mode' already exists"
**Solution:** Migration already applied (partially)
- This is safe to ignore
- The `IF NOT EXISTS` clause prevents errors
- Continue to next step

### Error: "policy already exists"
**Solution:** The SQL file handles this automatically
- Policies are dropped before creation
- This shouldn't happen, but it's safe

### No errors but verification queries return empty
**Solution:** Check which project you're in
- Make sure you selected the correct Supabase project
- Verify you're in the right environment (dev/prod)

---

## 📊 What Changed?

### Database Schema
- ✅ Added 3 columns to `profiles` table
- ✅ Added 3 columns to `transactions` table (optional)
- ✅ Created indexes for performance

### Security
- ✅ Enabled RLS on 6+ tables
- ✅ Created 25+ security policies
- ✅ Users can now ONLY access their own data

### Before vs After

**Before (INSECURE):**
```sql
-- ANY user could run this and see ALL data
SELECT * FROM bank_accounts;
-- Returns: ALL users' bank accounts 😱
```

**After (SECURE):**
```sql
-- Users can only see their own data
SELECT * FROM bank_accounts;
-- Returns: ONLY current user's accounts ✅
```

---

## 🎉 Success Checklist

Check all that apply:

- [ ] Opened Supabase SQL Editor
- [ ] Copied APPLY_ALL_MIGRATIONS.sql contents
- [ ] Pasted and ran in SQL Editor
- [ ] Saw "All migrations applied successfully!" message
- [ ] Verified 3 AI privacy columns exist
- [ ] Verified all tables have RLS enabled
- [ ] Tested `/api/user/ai-mode` endpoint
- [ ] AI Privacy Settings page loads
- [ ] No console errors

**All checked?** 🎉 **You're done!**

---

## 📱 Next: Test AI Mode Features

Follow this guide: [TEST_AI_MODE.md](TEST_AI_MODE.md)

**Key tests:**
1. ✅ Navigate to AI Privacy Settings page
2. ✅ See comparison examples
3. ✅ Toggle switch (if Pro user)
4. ✅ Consent dialog flow
5. ✅ Chat in both modes

---

## 🚨 If You Get Stuck

1. **Check Supabase Logs:**
   - Dashboard → Logs → Postgres Logs
   - Look for error messages

2. **Check App Logs:**
   - Browser console (F12)
   - Terminal (npm run dev output)
   - Vercel logs (if deployed)

3. **Verify Environment Variables:**
   ```bash
   # Check these are set
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. **Re-read Migration Guide:**
   - [supabase/MIGRATION_GUIDE.md](supabase/MIGRATION_GUIDE.md)

---

## 💡 Pro Tips

- **Run migrations in non-production first** - Test in dev/staging
- **Keep SQL Editor tab open** - You might need to run verification queries
- **Take a database backup** - Before running in production
- **Monitor after deployment** - Check error logs for RLS issues

---

## ✅ You're Ready for Production!

Once migrations are applied and tested, you can deploy with confidence.

**Your Finauraa app is now:**
- 🔒 Secure (RLS enabled)
- 🛡️ Privacy-compliant (AI modes)
- 🎯 Ready for users (tested)
- 🚀 Production-ready (migrations applied)

---

## Questions?

See full documentation:
- [DEPLOYMENT_READY.md](DEPLOYMENT_READY.md) - Deployment checklist
- [TEST_AI_MODE.md](TEST_AI_MODE.md) - Testing guide
- [supabase/MIGRATION_GUIDE.md](supabase/MIGRATION_GUIDE.md) - Detailed migration guide
