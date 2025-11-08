#!/bin/bash

# Shared package configuration for GitHub workflows
# This script defines the package ordering and common functions used across workflows

# Define package order: javascript first, then react
export PACKAGE_ORDER=("javascript" "react" "vue")

# Function to get package information
get_package_info() {
    local package_path="$1"
    
    if [ -f "$package_path/package.json" ]; then
        local package_name=$(node -p "require('./$package_path/package.json').name" 2>/dev/null)
        local package_version=$(node -p "require('./$package_path/package.json').version" 2>/dev/null)
        
        echo "name=$package_name;version=$package_version"
    else
        echo "error=package.json not found"
    fi
}

# Function to check if package directory exists
package_exists() {
    local package_name="$1"
    local package_path="packages/$package_name"
    
    [ -d "$package_path" ] && [ -f "$package_path/package.json" ]
}

# Function to process packages in order
process_packages_in_order() {
    local action="$1"  # The action to perform (e.g., "build", "publish", "version")
    
    echo "📦 Processing packages in order: ${PACKAGE_ORDER[*]}"
    
    for package_name in "${PACKAGE_ORDER[@]}"; do
        local package_path="packages/$package_name"
        
        if package_exists "$package_name"; then
            echo "🔄 Processing $package_name..."
            
            # Call the action function if it exists
            if declare -f "process_$action" > /dev/null; then
                "process_$action" "$package_name" "$package_path"
            else
                echo "⚠️  No handler defined for action: $action"
            fi
        else
            echo "⚠️  Package directory $package_path not found or missing package.json"
        fi
    done
} 