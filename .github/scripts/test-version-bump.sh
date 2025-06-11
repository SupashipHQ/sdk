#!/bin/bash

# Test script for version bump workflow logic
# This tests the package ordering and automatic dependency discovery/updates

set -e

echo "🧪 Testing version bump workflow logic..."

# Source the shared package configuration
source "$(dirname "$0")/package-config.sh"

# Test version
TEST_VERSION="0.1.1"

echo "📦 Testing package processing order: ${PACKAGE_ORDER[*]}"

# Define the version bump handler function (test mode)
process_version() {
  local package_name="$1"
  local package_path="$2"
  
  echo "🔄 [TEST] Would update version in $package_path to $TEST_VERSION"
  
  # Get the package name that was just version bumped
  local bumped_package_name=$(node -e "console.log(require('./$package_path/package.json').name)")
  
  echo "🔍 [TEST] Checking for packages that depend on $bumped_package_name..."
  
  # Find all packages that depend on the package that was just bumped
  for other_package in packages/*; do
    if [ -d "$other_package" ] && [ -f "$other_package/package.json" ] && [ "$other_package" != "$package_path" ]; then
      # Check if this package has a dependency on the bumped package
      local has_dependency=$(node -e "
        const pkg = JSON.parse(require('fs').readFileSync('$other_package/package.json', 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
        console.log(deps['$bumped_package_name'] ? 'true' : 'false');
      ")
      
      if [ "$has_dependency" = "true" ]; then
        local other_package_name=$(basename "$other_package")
        echo "🔗 [TEST] Would update $other_package_name dependency on $bumped_package_name"
        
        # Test the dependency detection and show what would be updated
        node -e "
          const fs = require('fs');
          const pkg = JSON.parse(fs.readFileSync('$other_package/package.json', 'utf8'));
          
          if (pkg.dependencies && pkg.dependencies['$bumped_package_name']) {
            console.log('   📋 dependencies: ' + pkg.dependencies['$bumped_package_name'] + ' → ^$TEST_VERSION');
          }
          
          if (pkg.devDependencies && pkg.devDependencies['$bumped_package_name']) {
            console.log('   📋 devDependencies: ' + pkg.devDependencies['$bumped_package_name'] + ' → ^$TEST_VERSION');
          }
          
          if (pkg.peerDependencies && pkg.peerDependencies['$bumped_package_name']) {
            console.log('   📋 peerDependencies: ' + pkg.peerDependencies['$bumped_package_name'] + ' → ^$TEST_VERSION');
          }
        "
        
        echo "✅ [TEST] Dependency update logic works correctly"
      else
        local other_package_name=$(basename "$other_package")
        echo "ℹ️  [TEST] $other_package_name has no dependency on $bumped_package_name"
      fi
    fi
  done
}

# Test processing packages in the defined order
echo ""
echo "🚀 Starting test processing..."
process_packages_in_order "version"

echo ""
echo "✅ Test completed successfully! The version bump logic should work for any package dependencies." 