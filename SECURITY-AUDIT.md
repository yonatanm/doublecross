# Security Audit Report — tashbetzim.co.il

**Date:** 2026-04-05
**Scope:** Full client-side codebase, dependencies, build pipeline, Firebase integration
**Hosted on:** GitHub Pages (static SPA) + Firebase (auth + Firestore)

---

## Executive Summary

The application is a client-side React SPA with Firebase backend. The main attack surface is: user-generated content rendered without sanitization (XSS in print), missing Firestore security rules (authorization bypass), and vulnerable transitive dependencies. No secrets are leaked in git.

| Severity | Found | Fixed |
|----------|-------|-------|
| Critical | 2 | 2 |
| High | 3 | 3 |
| Medium | 4 | 4 |
| Low | 3 | 1 |

---

## Critical

### ~~1. Stored XSS via Print Functionality~~ — FIXED

**File:** `src/lib/print-crossword.ts`

~~User-supplied `title`, `description`, and `clue` text were interpolated directly into HTML via `document.write()` without escaping.~~

**Status:** Fixed — all user content now passes through `escapeHtml()` before HTML interpolation.

---

### ~~2. No Firestore Security Rules~~ — FIXED

**Status:** Firestore rules now deployed with proper ownership enforcement:
- Published crosswords readable by anyone
- Drafts readable only by owner or admin
- Create requires `userId == auth.uid`
- Update/delete restricted to owner or admin
- No wildcard write access

---

## High

### ~~3. No Ownership Validation in Write Operations~~ — FIXED

**Status:** `overwriteCrossword()` now strips caller-supplied ownership fields and always stamps `auth.currentUser`. Firestore rules also enforce `request.resource.data.userId == request.auth.uid` on create and owner-only update/delete.

---

### ~~4. Hardcoded Admin UID Exposed in Bundle~~ — FIXED

**Status:** Admin UID moved from hardcoded string to `VITE_ADMIN_UID` env var (GitHub secret set). Client-side `isAdmin` is UI-only; actual admin authorization enforced by Firestore rules `isAdmin()` function. Without a backend, Firebase custom claims are not feasible — current approach is appropriate.

---

### ~~5. Seven Vulnerable npm Dependencies~~ — FIXED

**Status:** `npm audit fix` applied — 0 vulnerabilities remaining.

---

## Medium

### ~~6. No Content-Security-Policy~~ — FIXED

**Status:** CSP `<meta>` tag added to `index.html` with `script-src 'self'`, restricted `connect-src` for Firebase, and `frame-ancestors 'none'`.

---

### ~~7. No Clickjacking Protection~~ — FIXED

**Status:** `frame-ancestors 'none'` included in the CSP meta tag.

---

### ~~8. No Input Length or Content Validation~~ — FIXED

**Status:** Firestore rules now enforce `title.size() < 200` and `keys().size() < 30` on create and update.

---

### ~~9. Missing Subresource Integrity (SRI) on Production Assets~~ — FIXED

**Status:** `vite-plugin-sri-gen` added to build pipeline. Production assets now include `integrity="sha384-..."` hashes.

---

## Low

### 10. `allowedHosts: true` in Vite Dev Server

**File:** `vite.config.ts` line 18

Disables host header validation in development. Not a production risk (dev server isn't deployed), but could allow DNS rebinding attacks during local development.

---

### 11. No `security.txt`

No `/.well-known/security.txt` file. This is a best practice (RFC 9116) for responsible disclosure.

---

### 12. Firebase API Keys in Client Bundle

Firebase API keys are intentionally public (they identify the project, not grant access). Security depends entirely on Firestore rules (#2). This is noted for awareness — **not a vulnerability if rules are properly configured**, but a critical vulnerability amplifier if rules are missing.

---

## What's Done Well

- `.env.local` is properly gitignored and **not committed** to the repository
- GitHub Actions workflow uses GitHub Secrets correctly for build-time injection
- No `eval()`, `Function()`, or dynamic code execution anywhere
- No `dangerouslySetInnerHTML` in React components — all React rendering is auto-escaped
- TypeScript strict mode fully enabled (strict, noUnusedLocals, noUnusedParameters)
- No source maps in production build
- No test files or dev artifacts in production output
- GitHub Actions uses pinned major versions (v3/v4) with minimal permissions
- Firebase modular SDK (tree-shakeable, smaller attack surface than compat)
- `ClueEditor.tsx` correctly uses `textContent` / `createTextNode()` instead of `innerHTML`

---

## Recommended Action Plan

### All resolved
1. ~~Fix XSS in print~~ — `escapeHtml()` applied to all user content
2. ~~Deploy Firestore security rules~~ — ownership enforcement + input size limits active
3. ~~Run `npm audit fix`~~ — 0 vulnerabilities
4. ~~Add CSP + clickjacking protection~~ — meta tag with `frame-ancestors 'none'`
5. ~~Input validation~~ — Firestore rules enforce title size < 200, max 30 fields
6. ~~Admin UID~~ — moved to `VITE_ADMIN_UID` env var; Firestore rules enforce server-side
7. ~~SRI~~ — `vite-plugin-sri-gen` adds integrity hashes at build time
8. ~~security.txt~~ — added at `public/.well-known/security.txt`
9. ~~Ownership bypass~~ — `overwriteCrossword()` always stamps current auth user

---
---

# V2 — Security Audit (2026-04-08)

**Date:** 2026-04-08
**Scope:** Full client-side codebase re-audit + Firestore security rules review
**Threat model:** Small group of known creators (~6 users), public anonymous solvers, potential growth. Admin: `yonatanm@gmail.com`.

## Executive Summary

V1 fixed the critical issues well. This V2 audit found a **residual XSS** in the same print function (missed fields), a **missing CSP on the print window** that amplifies it, and several Firestore rule gaps. The rules are solid overall but have one meaningful hole in the update path.

| Severity | Found |
|----------|-------|
| High     | 2     |
| Medium   | 5     |
| Low      | 3     |

---

## High

### ~~H1. Residual Stored XSS in Print — Cell Letters & Position Labels Not Escaped~~ — FIXED

**File:** `src/lib/print-crossword.ts` lines 137–141

V1 audit (#1) fixed XSS for `title`, `description`, and `clue` text by applying `escapeHtml()`. However, **two fields were missed**:

```typescript
const letter = isHighlighted && cell.letter ? cell.letter : ""
gridHtml += `<td class="cell${isHighlighted ? " hint" : ""}">
  ${letter}                                         // ← NOT ESCAPED
  ${label != null ? `<span class="num">${label}</span>` : ""}  // ← NOT ESCAPED
</td>`
```

- `cell.letter` comes from the grid (stored as JSON string in Firestore)
- `label` comes from `word?.position` in `layout_result` (also stored as JSON in Firestore)

**Amplifier:** The print window is opened via `window.open("") + document.write()` (line 322–325). The generated HTML (lines 201–320) contains **no CSP meta tag**. The parent page's CSP does not inherit to `about:blank` windows populated via `document.write()`. This means any injected script executes without restriction.

**Attack scenario:**
1. Authenticated user creates a crossword normally
2. Using Firebase SDK directly (browser console), attacker updates their own crossword's `grid` JSON to include `cell.letter = '<img src=x onerror="...">'`
3. Attacker publishes the crossword
4. Admin (who sees all crosswords) opens it in the editor and clicks Print
5. XSS payload fires in a window with zero CSP — full DOM access, can read cookies, call Firebase APIs as admin

**Fix:**
- Apply `escapeHtml()` to both `letter` and `label` before HTML interpolation
- Add a CSP `<meta>` tag to the print window HTML (at minimum: `script-src 'none'` after the `window.print()` call, or `script-src 'unsafe-inline'` to allow the print trigger only)

---

### ~~H2. Firestore Security Rules Not Version-Controlled~~ — FIXED

There is no `firestore.rules` file and no `firebase.json` in the repository. The security rules exist only in the Firebase Console.

**Risks:**
- Rules cannot be code-reviewed in PRs
- No audit trail for rule changes
- Rules can drift from documented behavior without anyone noticing
- No CI/CD validation or testing of rules
- If the Firebase project is recreated or transferred, rules are lost

**Fix:**
- Add `firestore.rules` to the repo root (copy from Firebase Console)
- Add `firebase.json` pointing to the rules file
- Optionally: add `firebase deploy --only firestore:rules` to CI pipeline

---

## Medium

### M1. Admin Email Exposed in Production Bundle + Hardcoded in Firestore Rules

**Files:**
- `src/hooks/useAuth.ts` line 8 — `VITE_ADMIN_EMAIL` compiled into JS bundle
- Firestore rules `isAdmin()` function — hardcoded `'yonatanm@gmail.com'`

The admin email `yonatanm@gmail.com` is visible to anyone who inspects the production JavaScript bundle (e.g., via browser DevTools → Sources). An attacker now knows the exact Google account that grants admin access.

**Risk:** Targeted phishing or credential stuffing against the admin account. Firebase Auth relies on Google's authentication — if the Google account is compromised, the attacker gets full admin access (read all crosswords, update/delete any document).

**Mitigation context:** This is a known limitation of client-side-only apps without a backend. Firebase custom claims (the proper solution) require a server/Cloud Function. The V1 audit noted this and accepted the trade-off, which is reasonable for the current threat model.

**Recommendation:** Ensure the admin Google account has strong 2FA enabled. Consider using a dedicated service account email rather than a personal email if the app grows.

---

### ~~M2. Firestore Update Rule Doesn't Enforce `userId` Preservation~~ — FIXED (in repo, needs deploy)

**File:** Firestore security rules (not in repo — currently in Firebase Console only)

Current update rule:
```
allow update: if (isOwner() || isAdmin())
              && request.resource.data.title.size() < 200
              && request.resource.data.keys().size() < 30;
```

The rule validates that the **current** document owner (or admin) is making the update, but does **not** validate that the **new** document preserves the same `userId`.

**Attack scenarios:**
1. **Ownership transfer:** Owner updates their own document, changing `userId` to another user's UID. That other user now "owns" it and can modify/delete it.
2. **Orphaning via race condition:** `overwriteCrossword()` (firestore.ts:87) uses `setDoc()` with `userId: user?.uid`. If `auth.currentUser` is null at call time (e.g., user logged out between auto-save trigger and execution), `userId` becomes `undefined`, Firebase SDK strips it, and the document loses its owner. Nobody can read/update it except admin.

**Fix:** Add to the update rule:
```
&& request.resource.data.userId == resource.data.userId
```

This ensures `userId` cannot be changed on update, preventing both ownership transfer and orphaning.

---

### ~~M3. `overwriteCrossword()` Uses `setDoc()` — Silently Drops `createdAt`~~ — FIXED

**File:** `src/lib/firestore.ts` line 87

`setDoc()` **replaces** the entire Firestore document (not a merge). The EditorPage auto-save builds its data object (EditorPage.tsx lines 396–421) but does **not** include `createdAt`. This means every auto-save deletes the original creation timestamp.

**Impact:** Data integrity issue. All crosswords appear to have no creation date. Not a security vulnerability per se, but unexpected data loss.

**Fix options:**
- Include `createdAt: existingCrossword?.createdAt` in the auto-save data object
- Or use `setDoc(docRef, data, { merge: true })` to preserve unspecified fields
- Or switch from `setDoc` to `updateDoc` for overwrites (only writes specified fields)

---

### ~~M4. CSP Weaknesses~~ — PARTIALLY FIXED

**File:** `index.html` line 7

Current CSP has three weaknesses:

| Directive | Issue |
|-----------|-------|
| `style-src 'unsafe-inline'` | Allows CSS injection attacks (e.g., data exfiltration via `background: url(...)` with user-controlled style attributes) |
| `img-src data:` | Allows data URI images, which can be used for data exfiltration in combination with CSS injection |
| `connect-src ws://localhost:*` | Development WebSocket endpoint included in production CSP — unnecessary attack surface |

Additionally, the **print window has zero CSP** (see H1). Any future print-related XSS is automatically fully exploitable.

**Fix:**
- Remove `ws://localhost:*` from `connect-src` (or conditionally include only in dev)
- Consider removing `data:` from `img-src` if not needed
- `'unsafe-inline'` in `style-src` is hard to remove with Tailwind CSS — this is a known trade-off, acceptable given no user-controlled style attributes exist in the app

---

### ~~M5. `repairMissingUserIds()` — Dead Code, Overprivileged~~ — FIXED

**File:** `src/lib/firestore.ts` lines 143–162

```typescript
export async function repairMissingUserIds(): Promise<number> {
  const user = auth.currentUser
  if (!user) return 0
  const snapshot = await getDocs(collection(db, COLLECTION))  // ALL documents
  for (const d of snapshot.docs) {
    if (!data.userId) {
      await updateDoc(doc(db, COLLECTION, d.id), { userId: user.uid, ... })
    }
  }
}
```

This function is **never called** anywhere in the application. It fetches all documents and claims ownership of any with missing `userId`.

**Firestore rules partially mitigate this:** A non-admin user's `getDocs()` call would only return documents they own or that are published. For published documents, the update would fail (not owner, not admin). So in practice, this function is a no-op for non-admin users.

For admin: it works as intended but represents unnecessary attack surface.

**Fix:** Delete the function. If one-time repairs are needed in the future, run them via the Firebase Console or a dedicated admin script.

---

## Low

### L1. GitHub Actions Not SHA-Pinned

**File:** `.github/workflows/deploy.yml` lines 21, 22, 38, 50

All GitHub Actions use major version tags (`@v4`, `@v3`) instead of commit SHAs:
```yaml
- uses: actions/checkout@v4        # should be @<commit-sha>
- uses: actions/setup-node@v4
- uses: actions/upload-pages-artifact@v3
- uses: actions/deploy-pages@v4
```

If an action maintainer's account is compromised, the attacker could push malicious code under the same version tag. Pinning to commit SHAs prevents this.

**Risk:** Low probability, but high impact (full access to repo secrets during build).

---

### ~~L2. `.gitignore` Incomplete for `.env` Patterns~~ — FIXED

**File:** `.gitignore` line 13

Current pattern `*.local` covers `.env.local` but **not**:
- `.env`
- `.env.production`
- `.env.development`
- `.env.staging`

**Risk:** Accidental commit of a non-`.local` env file could expose secrets.

**Fix:** Add explicit entries:
```
.env
.env.*
!.env.example
```

---

### L3. Firestore Rules: Hardcoded Admin Email (No Alternative)

The `isAdmin()` function in Firestore rules uses a literal email string. If the admin email changes, both the client code (`VITE_ADMIN_EMAIL`) and Firestore rules need manual updates in two different places.

This is a known limitation of client-side-only Firebase apps. The proper solution (Firebase custom claims) requires a backend/Cloud Function, which is out of scope for this project's architecture.

**No action required** — documented for awareness.

---

## Firestore Rules Review

Rules reviewed from Firebase Console (saved to `/tmp/fb-rukes.txt`).

### What's Done Well

- Published crosswords readable without auth (solve page works) ✓
- Drafts restricted to owner + admin ✓
- Create enforces `request.resource.data.userId == request.auth.uid` ✓
- Input validation: `title.size() < 200`, `keys().size() < 30` ✓
- Update/delete restricted to owner or admin ✓
- Default deny for all other paths ✓
- `isOwner()` and `isAdmin()` helper functions properly check `request.auth != null`

### Gaps

| Gap | Severity | Fix |
|-----|----------|-----|
| Update doesn't enforce `userId` preservation | Medium (M2) | Add `request.resource.data.userId == resource.data.userId` |
| No validation on `status` field values | Low | Add `request.resource.data.status in ['draft', 'published', 'archived']` |
| No rate limiting on creates | Low | Hard to enforce in Firestore rules alone — consider Cloud Functions if abuse occurs |
| Admin email hardcoded | Low (L3) | No alternative without backend |

---

## Recommended Action Plan (Prioritized)

### Priority 1 — Fix Now
1. **Escape `cell.letter` and `label`** in `print-crossword.ts:137-141` with `escapeHtml()`
2. **Add CSP meta tag** to print window HTML
3. **Add `userId` preservation check** to Firestore update rule
4. **Add `firestore.rules`** to the repo

### Priority 2 — Soon
5. **Fix `createdAt` loss** — include it in `overwriteCrossword()` data or switch to `updateDoc`
6. **Remove `repairMissingUserIds()`** dead code
7. **Remove `ws://localhost:*`** from production CSP
8. **Expand `.gitignore`** to cover all `.env` patterns

### Priority 3 — When Convenient
9. Pin GitHub Actions to commit SHAs
10. Add `status` field validation to Firestore update rule
11. Enable 2FA on admin Google account if not already
