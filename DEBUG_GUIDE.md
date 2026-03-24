# Debug Guide: Waiter Code & UPI ID Persistence

## Issue
Waiter codes and UPI ID reset after page refresh - data not persisting to Firebase.

## Debugging Steps

### 1. Check Browser Console
Open DevTools (F12) → Console tab and look for these messages:

**When generating a waiter code:**
```
[updateEmployees] uidRef: <user-id>
[updateEmployees] Updating employee: <emp-id> ...
[updateEmployees] Syncing employee update to Firestore...
[updateEmployees] ✓ Employee updated in Firestore: <emp-id>
```

**When saving UPI ID:**
```
[updateProfileFields] uidRef: <user-id> fields: { upiId: "...", upiLocked: true }
[updateProfileFields] Syncing to Firestore...
[updateProfileFields] ✓ Profile updated in Firestore
```

### 2. Common Issues & Solutions

#### ❌ Issue: `uidRef: undefined`
**Problem:** User not logged in or session not initialized
**Solution:** 
- Reload the page
- Check if you're logged in (check top right corner)
- Try logging out and logging back in

#### ❌ Issue: `Cannot sync (offline or db not ready)`
**Problem:** Firebase not initialized or you're offline
**Solution:**
- Check internet connection
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check if Firebase config is correct in `lib/firebase.ts`

#### ❌ Issue: Firestore permission errors in console
**Problem:** Firestore rules not allowing writes
**Solution:**
```bash
# Redeploy rules
firebase deploy --only firestore:rules
```

### 3. Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/saas-synplix-version1/firestore)
2. Navigate to **Firestore Database**
3. Check path: `users/{your-uid}/employees/{emp-id}`
4. Verify these fields exist:
   - `waiterCode` (string)
   - `isWaiter` (boolean)

5. For UPI, check: `users/{your-uid}`
6. Verify these fields:
   - `upiId` (string)
   - `upiLocked` (boolean)

### 4. Check IndexedDB (Local Storage)

1. DevTools → Application tab → IndexedDB
2. Expand `amora-db` database
3. Check these tables:
   - `employees` - should have `waiterCode` and `isWaiter` fields
   - `profile` - should have `upiId` and `upiLocked` fields
   - Look for `_syncStatus: 'synced'` (if 'pending', it didn't sync to Firestore)

### 5. Network Tab

1. DevTools → Network tab
2. Filter by "firestore"
3. When you generate a code or save UPI:
   - Look for POST/PATCH requests to `firestore.googleapis.com`
   - Status should be 200
   - If 403/401: Authentication issue
   - If 400: Data validation issue

### 6. Test Sequence

**Test Waiter Code:**
1. Go to Attendance page
2. Find an employee with "Waiter" in role
3. Click "Generate Code"
4. Check console for logs
5. Refresh page → Code should persist

**Test UPI ID:**
1. Go to Settings page
2. Enter UPI ID (e.g., `test@paytm`)
3. Click Save
4. Check console for logs
5. Refresh page → UPI should persist

### 7. Manual Firebase Check

Run this in browser console:
```javascript
// Check current user
console.log('Current UID:', window.localStorage.getItem('amora-local-uid'));

// Check if Firebase is initialized
import('firebase/firestore').then(({ getFirestore, doc, getDoc }) => {
  const uid = window.localStorage.getItem('amora-local-uid');
  if (uid) {
    getDoc(doc(getFirestore(), 'users', uid)).then(snap => {
      console.log('Profile data:', snap.data());
    });
  }
});
```

## Expected Behavior

✅ **After generating waiter code:**
- Console shows sync messages
- IndexedDB updated immediately
- Firestore updated within 1-2 seconds
- Page refresh shows the code

✅ **After saving UPI ID:**
- Console shows sync messages
- UPI field becomes locked
- IndexedDB updated immediately
- Firestore updated within 1-2 seconds
- Page refresh shows the UPI ID

## Still Not Working?

Check these:
1. Are you using **Local Demo Mode**?
   - Demo mode doesn't use Firebase
   - Logout and login with real Firebase account

2. Firebase project ID mismatch
   - Check `.env.local` or `lib/firebase.ts`
   - Ensure project ID is `saas-synplix-version1`

3. Clear everything and start fresh:
```javascript
// Run in browser console
localStorage.clear();
indexedDB.deleteDatabase('amora-db');
location.reload();
```

## Contact

If issue persists after all these steps, provide:
1. Console logs (screenshots)
2. Network tab screenshots
3. Your user UID
4. Firebase Console screenshot of the user document
