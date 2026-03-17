#!/usr/bin/env bash
# publish.sh — Release a new version of the Supaship Go SDK.
#
# Usage:
#   ./scripts/publish.sh              # prompts for version
#   ./scripts/publish.sh v0.2.0       # uses provided version
#   ./scripts/publish.sh v0.2.0 --dry-run  # validates without creating tags
#
# Requirements:
#   - git
#   - go 1.21+
#   - Clean working tree (or pass --allow-dirty)
#
# How Go module versioning works in this monorepo:
#   The module lives at packages/go/ inside github.com/supashiphq/sdk.
#   Go module proxy expects tags in the form:   packages/go/vX.Y.Z
#   The module is importable as:                github.com/supashiphq/sdk/packages/go
#
#   If you intend to publish as a standalone module (github.com/supashiphq/go-sdk),
#   mirror or move this directory to a dedicated repository and use plain vX.Y.Z tags.

set -euo pipefail

# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[info]${RESET}  $*"; }
success() { echo -e "${GREEN}[ok]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $*"; }
die()     { echo -e "${RED}[error]${RESET} $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
VERSION=""
DRY_RUN=false
ALLOW_DIRTY=false

for arg in "$@"; do
  case "$arg" in
    v[0-9]*)     VERSION="$arg" ;;
    --dry-run)   DRY_RUN=true ;;
    --allow-dirty) ALLOW_DIRTY=true ;;
    -h|--help)
      sed -n '/^# /p' "$0" | sed 's/^# //'
      exit 0
      ;;
    *) die "Unknown argument: $arg" ;;
  esac
done

# ---------------------------------------------------------------------------
# Locate repo and module roots
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"   # packages/go/
REPO_ROOT="$(git -C "$MODULE_DIR" rev-parse --show-toplevel)"
MODULE_REL="$(realpath --relative-to="$REPO_ROOT" "$MODULE_DIR" 2>/dev/null \
              || python3 -c "import os; print(os.path.relpath('$MODULE_DIR','$REPO_ROOT'))")"

# The git tag prefix for a subdirectory module: e.g. "packages/go"
TAG_PREFIX="${MODULE_REL}"

# Read current module path from go.mod
MODULE_PATH="$(grep '^module ' "$MODULE_DIR/go.mod" | awk '{print $2}')"

# ---------------------------------------------------------------------------
# Prompt for version if not supplied
# ---------------------------------------------------------------------------
if [[ -z "$VERSION" ]]; then
  # Try to find the latest existing tag for this module.
  LATEST_TAG="$(git -C "$REPO_ROOT" tag --list "${TAG_PREFIX}/v*" --sort=-version:refname 2>/dev/null | head -1 || true)"
  if [[ -n "$LATEST_TAG" ]]; then
    CURRENT_VER="${LATEST_TAG##*/}"   # strip prefix
    info "Latest published version: ${BOLD}${CURRENT_VER}${RESET}"
  else
    CURRENT_VER="(none)"
    info "No previous version found."
  fi

  echo ""
  read -rp "$(echo -e "${BOLD}Enter version to publish${RESET} (e.g. v0.2.0): ")" VERSION
fi

# ---------------------------------------------------------------------------
# Validate semver format
# ---------------------------------------------------------------------------
if ! [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$ ]]; then
  die "Version must follow semver: v<MAJOR>.<MINOR>.<PATCH>  (got: $VERSION)"
fi

GIT_TAG="${TAG_PREFIX}/${VERSION}"

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  Module  : ${CYAN}${MODULE_PATH}${RESET}"
echo -e "  Version : ${CYAN}${VERSION}${RESET}"
echo -e "  Git tag : ${CYAN}${GIT_TAG}${RESET}"
echo -e "  Dry run : ${DRY_RUN}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
info "Checking prerequisites..."

command -v go >/dev/null 2>&1 || die "'go' is not installed or not in PATH."

GO_VERSION="$(go version | awk '{print $3}' | sed 's/go//')"
REQUIRED_GO="1.21"
if [[ "$(printf '%s\n' "$REQUIRED_GO" "$GO_VERSION" | sort -V | head -1)" != "$REQUIRED_GO" ]]; then
  die "Go $REQUIRED_GO+ required, found $GO_VERSION"
fi
success "Go $GO_VERSION"

# Check for existing tag.
if git -C "$REPO_ROOT" rev-parse "$GIT_TAG" >/dev/null 2>&1; then
  die "Tag ${GIT_TAG} already exists. Bump the version."
fi

# Check working tree.
if [[ "$ALLOW_DIRTY" == false ]]; then
  if ! git -C "$REPO_ROOT" diff --quiet || ! git -C "$REPO_ROOT" diff --cached --quiet; then
    die "Working tree has uncommitted changes. Commit or stash them first, or pass --allow-dirty."
  fi
  success "Working tree is clean"
fi

# ---------------------------------------------------------------------------
# Checks: vet, build, test
# ---------------------------------------------------------------------------
info "Running go vet..."
(cd "$MODULE_DIR" && go vet ./...) || die "go vet failed."
success "go vet passed"

info "Running go build..."
(cd "$MODULE_DIR" && go build ./...) || die "go build failed."
success "go build passed"

# Run tests only if test files exist.
TEST_FILES="$(find "$MODULE_DIR" -name '*_test.go' 2>/dev/null | head -1 || true)"
if [[ -n "$TEST_FILES" ]]; then
  info "Running go test..."
  (cd "$MODULE_DIR" && go test ./...) || die "go test failed."
  success "go test passed"
else
  warn "No test files found — skipping go test."
fi

# ---------------------------------------------------------------------------
# Dry-run exit point
# ---------------------------------------------------------------------------
if [[ "$DRY_RUN" == true ]]; then
  echo ""
  warn "Dry run complete. No tags were created."
  echo -e "  Would create tag: ${BOLD}${GIT_TAG}${RESET}"
  exit 0
fi

# ---------------------------------------------------------------------------
# Confirm
# ---------------------------------------------------------------------------
echo ""
read -rp "$(echo -e "${BOLD}Create and push tag ${GIT_TAG}? [y/N]${RESET} ")" CONFIRM
case "$CONFIRM" in
  [yY][eE][sS]|[yY]) ;;
  *) info "Aborted."; exit 0 ;;
esac

# ---------------------------------------------------------------------------
# Tag and push
# ---------------------------------------------------------------------------
echo ""
info "Creating annotated tag ${GIT_TAG}..."
git -C "$REPO_ROOT" tag -a "$GIT_TAG" -m "release: ${MODULE_PATH} ${VERSION}"
success "Tag created: ${GIT_TAG}"

info "Pushing tag to origin..."
git -C "$REPO_ROOT" push origin "$GIT_TAG"
success "Tag pushed."

# ---------------------------------------------------------------------------
# Post-publish: warm up GOPROXY
# ---------------------------------------------------------------------------
echo ""
info "Warming up the Go module proxy (optional — may take a few seconds)..."
PROXY_URL="https://proxy.golang.org/${MODULE_PATH}/@v/${VERSION}.info"
if curl -sf "$PROXY_URL" >/dev/null 2>&1; then
  success "Module proxy acknowledged ${VERSION}."
else
  warn "Proxy fetch returned non-200 (the module may still take a minute to be indexed)."
  warn "Check manually: ${PROXY_URL}"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}Released ${MODULE_PATH}@${VERSION}${RESET}"
echo ""
echo -e "  Install with:"
echo -e "    ${BOLD}go get ${MODULE_PATH}@${VERSION}${RESET}"
echo ""
echo -e "  View on pkg.go.dev:"
echo -e "    ${BOLD}https://pkg.go.dev/${MODULE_PATH}@${VERSION}${RESET}"
echo ""
