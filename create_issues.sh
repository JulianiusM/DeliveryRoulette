#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is not installed."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run: gh auth login"
  exit 1
fi

if [ ! -d "docs/issues" ]; then
  echo "Error: docs/issues not found. Run this script from the repo root."
  exit 1
fi

OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
if [ -z "${OWNER_REPO}" ]; then
  echo "Error: Could not determine repository."
  exit 1
fi

echo "Using repository: ${OWNER_REPO}"

ensure_label() {
  local name="$1"
  local desc="$2"
  # Color is required for label creation; choose a deterministic, neutral set
  local color="$3"
  if gh label list --limit 200 --json name -q ".[] | select(.name==\"${name}\") | .name" | grep -qx "${name}"; then
    return 0
  fi
  gh label create "${name}" --description "${desc}" --color "${color}" >/dev/null
}

ensure_milestone() {
  local title="$1"
  local desc="$2"
  # Check if milestone exists (open or closed)
  if gh api "repos/${OWNER_REPO}/milestones?state=all&per_page=100" --paginate -q ".[] | select(.title==\"${title}\") | .title" | grep -qx "${title}"; then
    return 0
  fi
  gh api -X POST "repos/${OWNER_REPO}/milestones" -f title="${title}" -f description="${desc}" >/dev/null
}

echo "Creating labels (idempotent)..."

# Label colors (hex without #). Keep stable.
ensure_label "type:feature" "Feature work" "1d76db"
ensure_label "type:bug" "Bug fix" "d73a4a"
ensure_label "type:chore" "Maintenance/refactor" "6f42c1"
ensure_label "type:docs" "Documentation" "0075ca"
ensure_label "type:test" "Testing" "0e8a16"

ensure_label "area:auth" "Auth/session" "cfd3d7"
ensure_label "area:ui" "SSR views and client JS" "cfd3d7"
ensure_label "area:restaurants" "Restaurant domain" "cfd3d7"
ensure_label "area:menu" "Menu domain" "cfd3d7"
ensure_label "area:diet" "Diet inference/overrides" "cfd3d7"
ensure_label "area:suggest" "Suggestion engine/history" "cfd3d7"
ensure_label "area:import" "Import flows/connectors" "cfd3d7"
ensure_label "area:provider" "Provider connectors/sync jobs" "cfd3d7"
ensure_label "area:db" "DB schema/migrations" "cfd3d7"
ensure_label "area:infra" "CI, config, ops" "cfd3d7"

ensure_label "prio:P0" "Critical path" "b60205"
ensure_label "prio:P1" "Important" "fbca04"
ensure_label "prio:P2" "Nice to have" "0e8a16"
ensure_label "good first issue" "Small starter task" "7057ff"

echo "Creating milestones (idempotent)..."
ensure_milestone "M0 Bootstrap" "Project skeleton, DB wiring, auth, security, CI"
ensure_milestone "M1 Core domain" "Restaurants + menus in manual mode"
ensure_milestone "M2 Diet system" "Diet tags, inference engine, manual overrides"
ensure_milestone "M3 Suggestion engine" "Filtered random suggestions + history"
ensure_milestone "M4 Import connector" "JSON/CSV import with preview and transactional apply"
ensure_milestone "M5 Provider framework" "Connector interface + sync job runner"
ensure_milestone "M6 Hardening + release" "Tests, observability, docs, docker"

echo "Creating issues (idempotent by title check)..."

issue_exists() {
  local title="$1"
  # Search open+closed issues by exact title
  local found
  found="$(gh issue list --state all --search "\"${title}\" in:title" --json title -q ".[] | select(.title==\"${title}\") | .title" || true)"
  if [ -n "${found}" ]; then
    return 0
  fi
  return 1
}

create_issue_from_file() {
  local key="$1"
  local title="$2"
  local milestone="$3"
  local labels="$4"
  local body_file="$5"

  if issue_exists "${key}: ${title}"; then
    echo "Skip (exists): ${key}: ${title}"
    return 0
  fi

  gh issue create \
    --title "${key}: ${title}" \
    --milestone "${milestone}" \
    --label "${labels}" \
    --body-file "${body_file}" >/dev/null

  echo "Created: ${key}: ${title}"
}

# Issue creation list (key|title|milestone|labels|file)
while IFS='|' read -r key title milestone labels file; do
  create_issue_from_file "${key}" "${title}" "${milestone}" "${labels}" "${file}"
done <<'EOF'
A1|Initialize TypeScript Node/Express app skeleton|M0 Bootstrap|type:feature,area:infra,prio:P0|docs/issues/A1-initialize-typescript-node-express-app-skeleton.md
A2|Add configuration system and environment handling|M0 Bootstrap|type:feature,area:infra,prio:P0|docs/issues/A2-add-configuration-system-and-environment-handling.md
A3|Add TypeORM + MariaDB integration and migrations baseline|M0 Bootstrap|type:feature,area:db,prio:P0|docs/issues/A3-add-typeorm-mariadb-integration-and-migrations-baseline.md
A4|Add authentication foundation (local accounts)|M0 Bootstrap|type:feature,area:auth,prio:P0|docs/issues/A4-add-authentication-foundation-local-accounts.md
A5|Add CSRF + basic security middleware|M0 Bootstrap|type:feature,area:infra,prio:P0|docs/issues/A5-add-csrf-basic-security-middleware.md
A6|CI pipeline (lint, typecheck, tests, migrations smoke)|M0 Bootstrap|type:chore,area:infra,prio:P0|docs/issues/A6-ci-pipeline-lint-typecheck-tests-migrations-smoke.md
B1|Restaurant entity + CRUD (SSR)|M1 Core domain|type:feature,area:restaurants,prio:P0|docs/issues/B1-restaurant-entity-crud-ssr.md
B2|Menu entities (category + items) + CRUD|M1 Core domain|type:feature,area:menu,prio:P0|docs/issues/B2-menu-entities-category-items-crud.md
B3|User preferences (delivery area + cuisine include/exclude)|M1 Core domain|type:feature,area:ui,prio:P1|docs/issues/B3-user-preferences-delivery-area-cuisine-include-exclude.md
B4|Provider reference table (manual links)|M1 Core domain|type:feature,area:provider,prio:P1|docs/issues/B4-provider-reference-table-manual-links.md
C1|DietTag model + seeding|M2 Diet system|type:feature,area:diet,prio:P0|docs/issues/C1-diettag-model-seeding.md
C2|Implement diet inference engine (menu text heuristics)|M2 Diet system|type:feature,area:diet,prio:P0|docs/issues/C2-implement-diet-inference-engine-menu-text-heuristics.md
C3|Manual overrides (restaurant-level) with precedence|M2 Diet system|type:feature,area:diet,prio:P0|docs/issues/C3-manual-overrides-restaurant-level-with-precedence.md
C4|Show diet suitability with explanations in UI|M2 Diet system|type:feature,area:ui,prio:P1|docs/issues/C4-show-diet-suitability-with-explanations-in-ui.md
C5|Diet preferences in settings and filtering integration|M2 Diet system|type:feature,area:diet,prio:P0|docs/issues/C5-diet-preferences-in-settings-and-filtering-integration.md
D1|SuggestionService: filtered random selection|M3 Suggestion engine|type:feature,area:suggest,prio:P0|docs/issues/D1-suggestionservice-filtered-random-selection.md
D2|Suggestion history entity + exclude recent rule|M3 Suggestion engine|type:feature,area:suggest,prio:P0|docs/issues/D2-suggestion-history-entity-exclude-recent-rule.md
D3|Suggestion SSR pages (dashboard + result + reroll)|M3 Suggestion engine|type:feature,area:ui,prio:P1|docs/issues/D3-suggestion-ssr-pages-dashboard-result-reroll.md
D4|Per-user restaurant flags: favorites and do-not-suggest|M3 Suggestion engine|type:feature,area:suggest,prio:P2|docs/issues/D4-per-user-restaurant-flags-favorites-and-do-not-suggest.md
E1|Define import schema (JSON) and validator|M4 Import connector|type:feature,area:import,prio:P0|docs/issues/E1-define-import-schema-json-and-validator.md
E2|Import UI: upload + preview diff + apply transactionally|M4 Import connector|type:feature,area:import,prio:P0|docs/issues/E2-import-ui-upload-preview-diff-apply-transactionally.md
E3|CSV import support (restaurant list)|M4 Import connector|type:feature,area:import,prio:P2|docs/issues/E3-csv-import-support-restaurant-list.md
F1|Provider connector interface + registry|M5 Provider framework|type:feature,area:provider,prio:P0|docs/issues/F1-provider-connector-interface-registry.md
F2|Sync job runner (manual trigger + scheduled)|M5 Provider framework|type:feature,area:provider,prio:P1|docs/issues/F2-sync-job-runner-manual-trigger-scheduled.md
F3|Implement ImportConnector as provider connector|M5 Provider framework|type:feature,area:provider,prio:P1|docs/issues/F3-implement-importconnector-as-provider-connector.md
F4|Credentials storage module (encrypted at rest)|M5 Provider framework|type:feature,area:provider,prio:P1|docs/issues/F4-credentials-storage-module-encrypted-at-rest.md
G1|Unit tests for diet heuristics and precedence logic|M6 Hardening + release|type:test,area:diet,prio:P0|docs/issues/G1-unit-tests-for-diet-heuristics-and-precedence-logic.md
G2|DB tests for migrations and constraints|M6 Hardening + release|type:test,area:db,prio:P0|docs/issues/G2-db-tests-for-migrations-and-constraints.md
G3|E2E tests (Playwright) for main workflows|M6 Hardening + release|type:test,area:ui,prio:P1|docs/issues/G3-e2e-tests-playwright-for-main-workflows.md
G4|Observability: structured logging + health diagnostics|M6 Hardening + release|type:feature,area:infra,prio:P1|docs/issues/G4-observability-structured-logging-health-diagnostics.md
G5|Documentation pack (README + ops + import schema)|M6 Hardening + release|type:docs,area:infra,prio:P1|docs/issues/G5-documentation-pack-readme-ops-import-schema.md
G6|Release packaging (Docker) + docker-compose|M6 Hardening + release|type:chore,area:infra,prio:P2|docs/issues/G6-release-packaging-docker-docker-compose.md
EOF

echo "Done."
