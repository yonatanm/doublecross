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
