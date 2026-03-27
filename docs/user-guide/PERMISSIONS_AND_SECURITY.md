# Permissions And Security

DeliveryRoulette separates normal user workflows from shared-data administration.

## Normal User Permissions

Normal signed-in users can:

- save and switch locations
- run location imports for their own saved provider sources
- request suggestions
- favorite restaurants
- block restaurants from suggestions
- browse the shared restaurant catalog

## Administrator Permissions

Administrators can also:

- edit the shared restaurant catalog
- edit menus and provider references
- create and remove manual diet overrides
- run global provider refreshes
- review sync jobs and alerts
- run bulk imports
- edit global diet heuristic settings

## Why The Split Exists

Location imports are user-scoped.

Restaurant records, menus, provider refs, and heuristic overrides are shared across all users.

Because shared edits affect everyone, they are admin-only in production.

## How Admin Access Works

Admin access is determined by a persisted user role.

Supported roles:

- `user`
- `admin`

Configured admin usernames and emails are still accepted as a bootstrap path for the first admin, but the application now persists the admin role on the user record.

## Security Controls In Place

The application now enforces:

- role-based admin route guards
- CSRF protection for session-backed forms
- session fixation protection during login and OIDC callback
- server-side session destruction on logout
- restrictive security headers for framing, content sniffing, referrers, and browser permissions

## What This Means For You

If you are not an admin, the app hides and blocks shared-data write actions.

That is intentional.

Use **Location Imports**, **Settings**, and **Suggest** for your own workflow.

Use [Admin Operations](./ADMIN_OPERATIONS.md) only if you are responsible for the shared catalog and maintenance queue.
