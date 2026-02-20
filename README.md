# Delivery Roulette (DE) - Backlog bootstrap

This package contains:
- docs/ARCHITECTURE.md (reference architecture)
- docs/GITHUB_SPEC.md (high-level spec)
- docs/issues/*.md (issue bodies)
- create_issues.sh (creates labels, milestones, issues via gh CLI)

Usage (from your repository root):
1) Copy this package contents into your repository (at least docs/ and create_issues.sh)
2) Ensure gh CLI is installed and authenticated: gh auth login
3) Run: ./create_issues.sh
4) Run: ./link_dependencies.sh (rewrites the 'Dependencies' section in each issue to link to the created issue numbers)
