# Auth Flow Design — MatchVolleyFront

**Date:** 2026-05-20  
**Status:** Approved

---

## Overview

Add login/register screens + JWT session management to the app. On open, user sees Login or Register. After authentication, existing match/team flow resumes as-is. Tokens persisted to `expo-secure-store`. Access token auto-refreshed on 401.

---

## Architecture

Pattern: **AuthContext + guard in App.tsx**. No new navigation library. Fits existing state-machine conditional-rendering pattern.

```
App.tsx
└── AuthProvider
    ├── [not authenticated] → LoginScreen / RegisterScreen (toggled via local state)
    └── [authenticated]     → TeamProvider → MatchProvider → existing flow
```

---

## New Files

| File | Purpose |
|------|---------|
| `src/context/AuthContext.tsx` | Auth state, login/register/logout actions, session restore on app open |
| `src/data/authApi.ts` | Raw fetch calls to auth endpoints (no token logic here) |
| `src/data/tokenStore.ts` | Module-level singleton holding tokens in memory; read by apiFetch |
| `src/screens/LoginScreen.tsx` | Email + password form |
| `src/screens/RegisterScreen.tsx` | Email + pseudo + password form |

## Modified Files

| File | Change |
|------|--------|
| `src/data/api.ts` | `apiFetch` injects `Authorization: Bearer`, handles 401 → refresh → retry |
| `App.tsx` | Wrap with `AuthProvider`; render auth screens or existing flow based on auth state |

---

## AuthContext

### State shape
```ts
type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; pseudo: string } | null;
  loading: boolean; // true while restoring session on app open
};
```

### Actions
- `login(email, password)` — POST `/api/v1/auth:login`, store tokens
- `register(email, pseudo, password)` — POST `/api/v1/auth:register`, returns user (no auto-login, redirect to Login)
- `logout()` — POST `/api/v1/auth:logout` (best-effort), clear tokens
- Session restore on mount — read tokens from SecureStore, call `/api/v1/auth:refresh`; success → restore session, fail → show Login

### SecureStore keys
```
MATCH_ACCESS_TOKEN
MATCH_REFRESH_TOKEN
```

---

## tokenStore (module singleton)

```ts
// src/data/tokenStore.ts
let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onUnauthenticated: (() => void) | null = null;

export const tokenStore = {
  getTokens: () => ({ accessToken: _accessToken, refreshToken: _refreshToken }),
  setTokens: (access: string, refresh: string) => { ... },
  clearTokens: () => { ... },
  setOnUnauthenticated: (cb: () => void) => { _onUnauthenticated = cb; },
  triggerUnauthenticated: () => _onUnauthenticated?.(),
};
```

`AuthContext` calls `tokenStore.setTokens()` after login/refresh and `tokenStore.setOnUnauthenticated(() => logout())` on mount.

---

## apiFetch — 401 handling

```
1. Add header: Authorization: Bearer {tokenStore.accessToken}
2. Send request
3. If response.status === 401:
   a. refreshToken exists? → POST /api/v1/auth:refresh
      - Success: tokenStore.setTokens(new), persist to SecureStore, retry original request once
      - Fail: tokenStore.clearTokens(), tokenStore.triggerUnauthenticated()
   b. No refreshToken: tokenStore.triggerUnauthenticated()
4. Return response (or retried response)
```

Only one retry — no infinite refresh loop.

---

## authApi.ts

```ts
login(email, password)     → Promise<AuthResponse>      // { accessToken, refreshToken }
register(email, pseudo, password) → Promise<UserResponse> // { id, email, pseudo }
refresh(refreshToken)      → Promise<AuthResponse>
logout(refreshToken)       → Promise<void>
```

All functions throw on non-2xx. Error message comes from `response.message` field.

---

## Screens

### LoginScreen
- Fields: email, password
- On submit: `AuthContext.login()` → success goes to app, fail shows `response.message` in red banner
- Link: "Créer un compte" → toggles to RegisterScreen

### RegisterScreen
- Fields: email, pseudo, password
- On submit: `AuthContext.register()` → success shows "Compte créé" + toggles back to Login, fail shows `response.message` (handles duplicate email/pseudo from backend)
- Link: "Déjà un compte ?" → toggles to LoginScreen

### Screen toggle
Local state in App.tsx auth section: `showRegister: boolean`. No navigation needed.

### Visual style
- Background `#0d1b2a` (matches app)
- Inputs with `#111f2e` background, `#1e3a50` border
- Error banner: `#2a0f0f` background, `#ff3b30` border, `#ff6b6b` text
- Primary button: `#00b06a`
- Loading spinner on button during request

---

## Error handling

| Scenario | Behavior |
|----------|---------|
| Wrong credentials (login) | Red banner: `response.message` from API |
| Duplicate email/pseudo (register) | Red banner: `response.message` from API |
| Network error | Red banner: "Impossible de joindre le serveur" |
| Session expired (refresh fails on app open) | Silently redirect to Login |
| 401 mid-session, refresh fails | Clear session, redirect to Login |

---

## Dependencies

- `expo-secure-store` — new install required (`npx expo install expo-secure-store`)

---

## Out of scope

- Forgot password / reset flow
- Email verification
- Biometric login
- "Remember me" toggle (always persists session)
