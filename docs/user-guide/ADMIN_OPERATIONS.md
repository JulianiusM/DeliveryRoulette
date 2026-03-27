# Admin Operations

This page is only relevant for administrators.

## Admin-Only Tasks

Admins can:

- run global provider refreshes
- re-run shared heuristics
- review sync jobs
- review sync alerts
- run bulk JSON or CSV imports
- edit global diet heuristics
- edit the shared restaurant and menu catalog

Normal users should use **Settings**, **Suggest**, and **Location Imports** instead.

## Use The Admin Area When

- connector parsing changed
- upstream provider payloads changed globally
- a bulk data import is needed
- stored heuristics must be recalculated everywhere
- the global background queue must be reviewed
- the shared restaurant catalog needs manual correction

## Global Queue Review

Use **Sync Jobs** and **Sync Alerts** to inspect background behavior across all users and locations.

That is the correct place to track:

- failed provider refreshes
- stale provider alerts
- stale diet override alerts
- global maintenance actions

## Permission Model

Admin access is enforced through the persisted user role.

Configured admin usernames and emails are only a bootstrap mechanism for assigning the first admin role.

Without admin status, the app hides and blocks global maintenance routes and shared-data write actions.
