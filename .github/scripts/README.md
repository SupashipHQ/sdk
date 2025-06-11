# GitHub Workflow Scripts

This directory contains shared scripts used across GitHub workflows to maintain consistency and reduce duplication.

## package-config.sh

Shared configuration script that defines package processing order and common utilities for monorepo package management.

### Package Order

The script defines a specific processing order for packages:

```bash
PACKAGE_ORDER=("javascript" "react")
```

This ensures that:

1. **JavaScript package** is always processed first (since React depends on it)
2. **React package** is processed second (allowing dependency updates from JavaScript)

### Functions

#### `get_package_info(package_path)`

Extracts package name and version from package.json

#### `package_exists(package_name)`

Checks if a package directory exists and has a valid package.json

#### `process_packages_in_order(action)`

Processes packages in the defined order, calling the action-specific handler function.

### Usage

To use this configuration in a workflow:

```bash
# Source the shared configuration
source .github/scripts/package-config.sh

# Define your action handler
process_myaction() {
  local package_name="$1"
  local package_path="$2"

  # Your action logic here
  echo "Processing $package_name at $package_path"
}

# Process packages in order
process_packages_in_order "myaction"
```

### Used By

- **version-bump.yml**: For version bumping and dependency updates
- **publish.yml**: For NPM publishing in correct order

This ensures both workflows use the same package ordering and maintain consistency across the monorepo management process.
