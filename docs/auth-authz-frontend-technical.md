# Frontend Auth/Authz Alignment - Technical Documentation

Last updated: 2026-02-18
Scope: React UI changes for backend auth/authz hardening (JWT contract, refresh flow, standardized errors, module/action authorization, user role assignment rules).

## 1. Objectives

This update aligns the frontend with backend changes that introduced:

1. A new login token payload containing both `accessToken` and `refreshToken`.
2. A token refresh endpoint (`POST /auth/refresh`).
3. Standardized `401/403` error JSON payloads.
4. Module-level + action-level authorization expectations.
5. A create-user restriction disallowing `ROLE_SUPER_ADMIN`.

## 2. Implemented Files

Core auth/session:

- `src/services/authStorage.js`
- `src/services/apiService.js`
- `src/services/authService.js`
- `src/auth/AuthContext.jsx`
- `src/auth/roles.js`
- `src/pages/LoginPage.jsx`

Authorization wiring (UI):

- `src/components/ui/sidebar/Sidebar.jsx`
- `src/components/inventoryitem/InventoryItem.jsx`
- `src/components/inventoryitem/InventoryItemList.jsx`
- `src/components/inventory/InventoryItemPage.jsx`
- `src/components/inventory/AddItemQtyForm.jsx`
- `src/components/inventory/InventoryRequestList.jsx`
- `src/components/inventory/CreateInventoryRequestForm.jsx`
- `src/components/inventory/ProcurementOrdersTab.jsx`
- `src/components/bom/BomSidebar.jsx`
- `src/components/config/ItemCodeMapping/ItemCodeMappingList.jsx`
- `src/components/config/ItemCodeMapping/AddEditItemCodeMapping.jsx`
- `src/components/production/workorder/AddUpdateWorkOrder.jsx`
- `src/pages/UserCreatePage.jsx`

Documentation:

- `docs/auth-authz-frontend-technical.md`
- `docs/auth-authz-user-guide.md`

## 3. JWT Contract and Session Model

## 3.1 Accepted token payload shape

The frontend now expects token responses from login and refresh with:

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 900,
  "refreshTokenExpiresIn": 604800,
  "username": "string",
  "roles": ["ROLE_USER"]
}
```

## 3.2 Session persistence format

`authStorage` normalizes and persists:

- `accessToken`
- `refreshToken`
- `tokenType`
- `accessTokenExpiresIn`
- `refreshTokenExpiresIn`
- `accessTokenExpiresAt`
- `refreshTokenExpiresAt`
- `user`
- `roles`

Backward-compatibility aliases are retained:

- `token` -> `accessToken`
- `expiresIn` -> `accessTokenExpiresIn`
- `expiresAt` -> `accessTokenExpiresAt`

This avoids breaking existing components that still consume legacy names.

## 4. Request Pipeline and Refresh Flow

Implemented in `src/services/apiService.js`.

## 4.1 Request interceptor

- Adds `Authorization: Bearer <accessToken>` for protected requests.
- Skips auth header for:
  - `/auth/login`
  - `/auth/refresh`

## 4.2 Response interceptor behavior

On `401` (non-login, non-refresh):

1. If request has not been retried:
   - call `POST /auth/refresh` with stored `refreshToken`
   - update stored tokens on success
   - retry original request once
2. If refresh fails with `400/401` (or missing refresh token):
   - clear session
   - redirect to login with session-expired message

On `403`:

- Parse backend message and emit forbidden event for non-crashing UX feedback.

## 4.3 Concurrency protection

- A shared in-flight promise (`refreshPromise`) prevents duplicate refresh calls when multiple requests fail with `401` concurrently.

## 4.4 Error message normalization

`resolveApiErrorMessage(error, fallback)` now standardizes parsing from backend payload:

- `data.message`
- `data.error`
- raw string body

## 5. Auth Context and Exposed Helpers

Implemented in `src/auth/AuthContext.jsx`.

Exposed auth state:

- `accessToken`, `refreshToken`
- `accessTokenExpiresIn`, `refreshTokenExpiresIn`
- `accessTokenExpiresAt`, `refreshTokenExpiresAt`
- legacy `token`, `expiresIn`, `expiresAt`

Exposed helper methods:

- `hasRole(role)`
- `hasAnyRole(roles[])`
- `canModule(moduleKey)`
- `canAction(actionKey)`

The context also listens for:

- unauthorized event (forces logout/redirection)
- session-refreshed event (keeps in-memory context synchronized with refreshed tokens)

## 6. Role and Permission Model

Implemented in `src/auth/roles.js`.

## 6.1 Role constants

Supported roles:

- `ROLE_SUPER_ADMIN`
- `ROLE_ADMIN`
- `ROLE_USER`
- `ROLE_PRODUCTION_ADMIN`
- `ROLE_PRODUCTION_USER`
- `ROLE_INVENTORY_ADMIN`
- `ROLE_INVENTORY_USER`
- `ROLE_PURCHASE_ADMIN`
- `ROLE_PURCHASE_USER`
- `ROLE_SALES_ADMIN`
- `ROLE_SALES_USER`

## 6.2 Module access updates

`ROLE_USER` is now included in broad module access groups:

- sales module access
- inventory module access
- production module access
- item-code mapping module access

## 6.3 Action keys

Defined action keys:

- `inventory.item.write`
- `inventory.approval.write`
- `inventory.procurement.write`
- `workOrder.admin.write`
- `routing.lifecycle.write`
- `bom.status.version.write`
- `itemCodeMapping.write`

Action-to-role mapping:

- Inventory writes -> inventory manage roles
- Inventory approval/procurement writes -> inventory manage roles
- Work order admin actions (issue/cancel/delete class) -> production manage roles
- BOM status/version writes -> production manage roles
- Routing lifecycle writes -> production manage roles
- Item code mapping writes -> module admin roles

Note: routing lifecycle action keys are defined for consistency; current routing UI in this project is minimal and has no lifecycle action controls yet.

## 7. UI Enforcement Summary

## 7.1 Module-level

- Sidebar visibility is now computed through `canModule(...)` instead of ad-hoc checks.

## 7.2 Action-level (implemented)

Inventory item sensitive writes:

- Create/edit routes wrapped with `RoleProtectedRoute`.
- Add/delete/edit triggers disabled or blocked for non-eligible users.

Inventory request/approval/procurement writes:

- Create request, approve/reject, add quantity, procurement complete all guarded with `canAction(...)`.
- Handler-level early returns prevent restricted API calls.

BOM status/version changes:

- BOM status dropdown/confirm flow blocked for non-eligible users.

Work order issue/cancel:

- Issue and cancel paths blocked in handler and disabled in action controls for non-eligible users.

Item code mapping writes:

- Add/edit/delete disabled and guarded.
- Edit dialog fields/submit disabled if user cannot write.

## 7.3 User management role assignment

- Create-user role options exclude `ROLE_SUPER_ADMIN`.
- Payload is sanitized to strip `ROLE_SUPER_ADMIN` if injected client-side.
- Backend `400` messages are shown clearly.

## 8. Login UX and Session Expiry UX

Implemented in `src/pages/LoginPage.jsx`.

- Login now handles standardized backend message shape for failures.
- If redirected after refresh failure, login page displays a session-expired warning from:
  - router state, or
  - query parameters.

## 9. API Methods Updated

`src/services/authService.js`:

- Added `refresh(refreshToken)` wrapper for `/auth/refresh`.

`src/services/apiService.js`:

- `put` now supports optional axios config.
- `delete` now supports optional axios config.

## 10. Compatibility Notes

1. Legacy token keys are still exposed to avoid broad immediate refactors.
2. Existing unrelated ESLint warnings remain in codebase; they are not introduced by this auth/authz scope.
3. Some backend-sensitive operations listed in policy (for example routing lifecycle controls and work-order delete UI action) are currently not present as actionable UI controls in this project; permission keys are in place for when those controls are added.

## 11. Verification Checklist

Use this checklist for QA/UAT:

1. Login response with token pair persists correctly.
2. Protected call includes Bearer access token.
3. Force access token expiry -> request triggers refresh -> original request retries once.
4. Force refresh failure (`400/401`) -> session cleared and login redirect with session-expired message.
5. `403` from backend surfaces backend `message` in UI warning without app crash.
6. `ROLE_USER` can access broad modules but cannot use sensitive actions.
7. Sensitive action controls are hidden/disabled or blocked by handler guards.
8. Create-user role selection does not allow `ROLE_SUPER_ADMIN`.

