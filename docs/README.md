# DeliveryRoulette Documentation

This directory contains the main developer and user documentation for DeliveryRoulette.

## Documentation Structure

### For Developers

- [../README.md](../README.md) - Project overview, setup, and quick start
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development workflow and implementation guidance
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and major design decisions
- [DATABASE.md](DATABASE.md) - Database entities, migrations, and patterns
- [CONFIGURATION.md](CONFIGURATION.md) - Runtime configuration, location-aware suggestion settings, security, and geocoding settings
- [import-schema.md](import-schema.md) - JSON / CSV import format
- [OPERATIONS.md](OPERATIONS.md) - Runtime operations, health checks, and sync concerns

### For Testing

- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing patterns and workflow
- [FRONTEND_TESTING.md](FRONTEND_TESTING.md) - Frontend test guidance
- [TEST_REVIEW.md](TEST_REVIEW.md) - Test suite review
- [TEST_RECOMMENDATIONS.md](TEST_RECOMMENDATIONS.md) - Follow-up test improvements

### For End Users

- [user-guide/README.md](user-guide/README.md) - User guide index
- [user-guide/GETTING_STARTED.md](user-guide/GETTING_STARTED.md) - First-run setup
- [user-guide/LOCATIONS_AND_SETTINGS.md](user-guide/LOCATIONS_AND_SETTINGS.md) - Saved locations and defaults
- [user-guide/SUGGESTIONS.md](user-guide/SUGGESTIONS.md) - Suggestion flow and no-match hints
- [user-guide/LOCATION_IMPORTS.md](user-guide/LOCATION_IMPORTS.md) - User-facing location imports
- [user-guide/RESTAURANTS_AND_MENUS.md](user-guide/RESTAURANTS_AND_MENUS.md) - Shared restaurant catalog browsing
- [user-guide/PERMISSIONS_AND_SECURITY.md](user-guide/PERMISSIONS_AND_SECURITY.md) - User vs admin permissions
- [user-guide/ADMIN_OPERATIONS.md](user-guide/ADMIN_OPERATIONS.md) - Admin-only maintenance tasks
- [user-guide/TROUBLESHOOTING.md](user-guide/TROUBLESHOOTING.md) - Recovery steps for common issues

### For AI Agents

- [../AGENTS.md](../AGENTS.md) - Project-specific AI instructions
- [../.github/copilot-instructions.md](../.github/copilot-instructions.md) - Copilot guidance

## Quick Links

- Want to configure location-aware suggestions? Read [CONFIGURATION.md](CONFIGURATION.md).
- Want to understand provider-backed restaurant availability? Read [ARCHITECTURE.md](ARCHITECTURE.md).
- Want the user-facing setup flow? Read [user-guide/GETTING_STARTED.md](user-guide/GETTING_STARTED.md).
- Want the permission split? Read [user-guide/PERMISSIONS_AND_SECURITY.md](user-guide/PERMISSIONS_AND_SECURITY.md).

## Documentation Maintenance

When behavior changes, update:

1. the developer doc that describes the feature
2. the user guide if the workflow changed
3. the configuration guide if settings changed
4. the permissions guide if access levels changed

**Last Updated:** March 2026
**Version:** 1.3
