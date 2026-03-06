#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PACKAGE_NAME="$(php -r '$j=json_decode(file_get_contents("composer.json"), true); echo $j["name"];')"
PACKAGE_VERSION="${1:-}"

echo "Validating composer.json for $PACKAGE_NAME ..."
composer validate --strict

echo "Installing dependencies ..."
composer install --no-interaction --prefer-dist

echo "Running tests ..."
composer test

if [[ -n "$PACKAGE_VERSION" ]]; then
  if [[ ! "$PACKAGE_VERSION" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9\.-]+)?$ ]]; then
    echo "Version must look like 1.2.3 or v1.2.3[-suffix]"
    exit 1
  fi

  TAG_NAME="$PACKAGE_VERSION"
  if [[ ! "$TAG_NAME" =~ ^v ]]; then
    TAG_NAME="v$TAG_NAME"
  fi

  if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo "Tag $TAG_NAME already exists."
    exit 1
  fi

  echo
  echo "Ready to tag release:"
  echo "  git tag $TAG_NAME"
  echo "  git push origin $TAG_NAME"
else
  echo
  echo "No version argument provided."
  echo "Optional usage: ./scripts/publish.sh 1.2.3"
fi

echo
echo "Packagist release checklist:"
echo "1) Push your tagged commit to GitHub"
echo "2) Ensure package is registered on Packagist as $PACKAGE_NAME"
echo "3) Trigger Packagist update webhook (if not automatic)"
echo "4) Verify new version appears on packagist.org"
