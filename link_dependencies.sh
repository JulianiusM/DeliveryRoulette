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

OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
if [ -z "${OWNER_REPO}" ]; then
  echo "Error: Could not determine repository."
  exit 1
fi

echo "Using repository: ${OWNER_REPO}"
echo "Building key -> issue number map..."

ISSUES_JSON="$(gh issue list --state all --limit 200 --json number,title)"

python3 - <<'PY'
import json, os, re, subprocess, tempfile

issues = json.loads(os.environ["ISSUES_JSON"])

key_to_num = {}
for it in issues:
    title = it.get("title", "")
    m = re.match(r'^([A-Z]\d+):\s', title)
    if not m:
        continue
    key_to_num[m.group(1)] = it["number"]

def gh_view_body(num: int) -> str:
    return subprocess.check_output(
        ["gh", "issue", "view", str(num), "--json", "body", "-q", ".body"],
        text=True
    )

def update_dependencies_section(body: str, key_to_num: dict):
    '''
    Returns (updated_body, missing_keys).

    Rewrites the '## Dependencies' section into linked bullets that reference the
    correct GitHub issue numbers. Uses markers for idempotency.
    '''
    lines = body.splitlines()

    # Find "## Dependencies"
    try:
        start_idx = next(i for i, l in enumerate(lines) if l.strip() == "## Dependencies")
    except StopIteration:
        return body, []

    # Find end of section: next "## " heading or EOF
    end_idx = len(lines)
    for i in range(start_idx + 1, len(lines)):
        if lines[i].startswith("## "):
            end_idx = i
            break

    section = lines[start_idx + 1:end_idx]

    # Parse dependency keys from "- A3" style lines
    dep_keys = []
    for l in section:
        s = l.strip()
        m = re.match(r'^-\s*([A-Z]\d+)\s*$', s)
        if m:
            dep_keys.append(m.group(1))
            continue
        m2 = re.match(r'^-\s*([A-Z]\d+(?:\s*,\s*[A-Z]\d+)*)\s*$', s)
        if m2:
            dep_keys.extend([x.strip() for x in m2.group(1).split(",") if x.strip()])

    # If already rewritten, recover from "- Blocked by #123 (A3)"
    if not dep_keys:
        for l in section:
            s = l.strip()
            m = re.match(r'^-\s*Blocked by\s+#\d+\s+\(([A-Z]\d+)\)\s*$', s)
            if m:
                dep_keys.append(m.group(1))

    # De-duplicate preserving order
    seen = set()
    dep_keys = [k for k in dep_keys if not (k in seen or seen.add(k))]

    missing = [k for k in dep_keys if k not in key_to_num]

    new_section = [
        "## Dependencies",
        "<!-- DEPENDENCIES:START (auto-managed by link_dependencies.sh) -->",
    ]

    if dep_keys:
        for k in dep_keys:
            if k in key_to_num:
                new_section.append(f"- Blocked by #{key_to_num[k]} ({k})")
            else:
                new_section.append(f"- Blocked by (missing issue for key: {k})")
    else:
        new_section.append("- None")

    new_section.append("<!-- DEPENDENCIES:END -->")

    updated_lines = lines[:start_idx] + new_section + lines[end_idx:]
    return ("\n".join(updated_lines).rstrip() + "\n"), missing

def gh_edit_body(num: int, new_body: str) -> None:
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as f:
        f.write(new_body)
        path = f.name
    try:
        subprocess.check_call(["gh", "issue", "edit", str(num), "--body-file", path])
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass

touched = 0
missing_total = {}

# Process in stable key order (A1..)
def sort_key(k: str):
    return (k[0], int(k[1:]))

for key in sorted(key_to_num.keys(), key=sort_key):
    num = key_to_num[key]
    body = gh_view_body(num)
    new_body, missing = update_dependencies_section(body, key_to_num)
    if new_body != body:
        gh_edit_body(num, new_body)
        touched += 1
        print(f"Updated dependencies for {key} (#{num})")
    if missing:
        missing_total[key] = missing

print(f"Done. Updated {touched} issue(s).")

if missing_total:
    print("Warning: Some dependency keys were not found as issues:")
    for k, deps in missing_total.items():
        print(f"- {k}: missing {', '.join(deps)}")
PY
