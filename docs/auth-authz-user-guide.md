# Authentication and Access Updates - User Guide

Last updated: 2026-02-18
Audience: End users, functional teams, product/documentation teams

## What changed for users

The app security behavior has been improved. You may notice:

1. Better session handling.
2. Automatic session refresh in the background.
3. Clearer access-denied messages.
4. Some action buttons now hidden or disabled based on your role.
5. Super Admin role is no longer selectable when creating users from UI.

## 1. Login and session behavior

When you sign in, the app now uses secure short-lived access sessions with automatic background renewal.

What this means:

- You should stay signed in smoothly during normal use.
- If your session fully expires, you will be redirected to login and shown a session-expired message.
- After logging in again, you can continue normally.

## 2. Access denied messages

If you try to perform an action your role does not allow, the app shows a clear warning message from the server (for example, not authorized/forbidden).

The app is designed to stay stable and not crash when access is denied.

## 3. Module access vs action access

You may be able to open a module but still be blocked from specific sensitive actions inside it.

Example:

- You can view inventory screens.
- But create/update/delete/approval/procurement-critical actions may require admin-level inventory permissions.

This is expected behavior and matches backend security policy.

## 4. Who can do sensitive actions

Sensitive actions require admin-level roles in their domain.

Examples:

- Inventory critical writes: inventory admin-level permissions.
- Work order issue/cancel/delete class actions: production admin-level permissions.
- BOM status/version lifecycle actions: production admin-level permissions.
- Item code mapping writes: module admin-level permissions.

If you can view data but cannot click certain buttons, your role likely has read/basic access only.

## 5. Create User screen update

On the Create User page:

- `ROLE_SUPER_ADMIN` is not available for selection.
- If invalid role data is still submitted, backend validation message is shown.

## 6. Troubleshooting

If you are unexpectedly blocked:

1. Sign out and sign in again.
2. Confirm your assigned roles with your administrator.
3. Share the exact message shown in the app with your support team.

If you are redirected to login repeatedly:

1. Your session may be expired or invalid.
2. Sign in again.
3. If issue continues, contact support with timestamp and action performed.

## 7. Summary for users

- Security is stricter and clearer.
- Most users keep broad access to view/use core modules.
- Sensitive operations are now role-restricted more precisely.
- Session experience is improved with automatic refresh and cleaner expiry handling.

