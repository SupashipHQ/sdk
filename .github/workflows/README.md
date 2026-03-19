# GitHub Workflows

This directory contains the GitHub Actions workflows for the Supaship SDK project.

## Shared Configuration

All workflows use a shared package configuration system to ensure consistency across the monorepo.

### Package Processing Order

Packages are processed in a specific order defined in `.github/scripts/package-config.sh`:

1. **JavaScript package** (`@supashiphq/javascript-sdk`) - processed first
2. **React package** (`@supashiphq/react-sdk`) - processed second

This order is important because:

- Dependencies are resolved in order (packages with no dependencies first)
- When any package is version bumped, all dependent packages are automatically updated
- Publishing follows the same order to ensure dependencies are available
- The system automatically detects cross-package dependencies in dependencies, devDependencies, and peerDependencies

### Shared Functions

The shared configuration provides:

- Consistent package ordering across workflows
- Common utility functions for package management
- Centralized configuration that's easy to maintain

See [scripts/README.md](../scripts/README.md) for detailed documentation.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Trigger**: Runs on all push events and pull requests to `main` branch

**Purpose**: Continuous integration - tests, linting, and building

**Steps**:

- Install dependencies with pnpm
- Run linting checks
- Run test suite with coverage
- Build all packages
- Verify builds are successful

**No publishing** - this workflow only validates code quality.

### 2. Version Bump Workflow (`version-bump.yml`)

**Trigger**: Manual workflow dispatch via GitHub UI

**Purpose**: Bump package versions and create releases

**Inputs**:

- `version_type`: Choose from major, minor, patch, premajor, preminor, prepatch, or prerelease
- `prerelease_id`: For prerelease versions, choose from: alpha, beta, rc, dev, canary, next (defaults to beta if not specified)

**Steps**:

1. Install/build the workspace
2. Bump versions in root `package.json` and workspace packages (dependency order)
3. **Automatically detect and update cross-package dependencies**:
   - Scans all packages for dependencies on the package being version bumped
   - Updates `dependencies`, `devDependencies`, and `peerDependencies` automatically
   - Works for any number of packages and dependency relationships
4. Update `pnpm-lock.yaml`
5. Create a release branch (`release/x.y.z`) and commit changes
6. Open a pull request to `main` with a reference list of merged PRs since the last release and request review from `sdk-core`
7. After merge, `tag-on-release-pr-merge.yml` creates and pushes the version tag, then creates a GitHub Release
8. `publish.yml` runs from the tag push and publishes packages

If a same-name release branch already exists remotely, the workflow replaces it before pushing (only when there is no open PR for that branch).

**Version Types**:

- **Stable releases**: `major`, `minor`, `patch` → Creates versions like `v1.2.3`
- **Prerelease versions**: `premajor`, `preminor`, `prepatch`, `prerelease` → Creates versions like `v1.2.3-beta.1`

### 3. Publish Workflow (`publish.yml`)

**Trigger**: Automatically when version tags (starting with `v`) are pushed

**Purpose**: Publish packages to npm registry

**Prerelease Detection**:

- Detects prerelease identifiers: `alpha`, `beta`, `rc`, `dev`, `canary`, `next`
- Examples:
  - `v1.2.3-alpha.1` → publishes with `@alpha` tag
  - `v1.2.3-beta.1` → publishes with `@beta` tag
  - `v1.2.3-rc.1` → publishes with `@rc` tag
  - `v1.2.3` → publishes with `@latest` tag

**Steps**:

1. Build all packages
2. Detect release type (stable vs beta) from tag name
3. Publish to npm with appropriate tag:
   - Stable: `npm publish --access public` (uses @latest tag)
   - Prerelease: `npm publish --access public --tag <identifier>` (uses @alpha, @beta, @rc, etc.)
4. Skip already published versions
5. Generate publication summary

## Setup Instructions

### 1. Required Secrets

No additional repository secret is required for version bump PR creation when `GITHUB_TOKEN` is allowed to create PRs.

### 2. npm Package Access

Ensure your npm token has permission to publish to:

- `@supashiphq/javascript-sdk`
- Any other packages in the `packages/` directory

### 3. Repository Permissions

The workflows need these permissions:

- `contents: write` - to push release branches and tags
- `pull-requests: write` - to create release PRs
- `id-token: write` - for npm trusted publishing

Enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**.

## Usage Examples

### Stable Release

1. Go to **Actions** → **Version Bump and Release**
2. Click **Run workflow**
3. Select version type: `patch`, `minor`, or `major`
4. Click **Run workflow**
5. This creates a stable release and automatically publishes to npm with `@latest` tag

### Prerelease (Alpha/Beta/RC)

1. Go to **Actions** → **Version Bump and Release**
2. Click **Run workflow**
3. Select version type: `prepatch`, `preminor`, `premajor`, or `prerelease`
4. Choose prerelease identifier: `alpha`, `beta`, `rc`, `dev`, `canary`, or `next` (optional - defaults to `beta`)
5. Click **Run workflow**
6. This creates a prerelease and automatically publishes to npm with the appropriate tag

### Installing Prerelease Versions

Users can install prerelease versions with specific tags:

```bash
# Install latest alpha
npm install @supashiphq/javascript-sdk@alpha

# Install latest beta
npm install @supashiphq/javascript-sdk@beta

# Install latest release candidate
npm install @supashiphq/javascript-sdk@rc

# Install specific version
npm install @supashiphq/javascript-sdk@1.2.3-beta.1
```

## Workflow Benefits

1. **Automated Quality Gates**: Tests must pass before any release
2. **Consistent Versioning**: All packages stay in sync
3. **Automatic Dependency Management**: Cross-package dependencies updated automatically
4. **Automatic Publishing**: No manual npm publish commands
5. **Beta Release Support**: Proper prerelease handling
6. **Scalable**: Works with any number of packages and complex dependency relationships
7. **Duplicate Prevention**: Won't republish existing versions
8. **Audit Trail**: Full history of releases in GitHub
9. **Manual Control**: You decide when to release, no automatic releases on merge

## Troubleshooting

### Failed Publishing

If publishing fails:

1. Check `NPM_AUTH_TOKEN` is valid and has correct permissions
2. Verify package names in `package.json` files are correct
3. Ensure you have publish rights to the npm packages
4. Check for any npm registry outages

### Version Conflicts

If you need to fix a failed release:

1. Manually delete the git tag: `git tag -d v1.2.3 && git push origin :v1.2.3`
2. Reset the version in package.json files if needed
3. Re-run the version bump workflow

### Version Bump Errors

If the version bump workflow fails with npm dependency errors:

**Error**: `Cannot read properties of null (reading 'edgesOut')`

**Cause**: This error occurs when using `npm pkg set` in a pnpm workspace, causing dependency resolution conflicts.

**Solution**: The workflow has been updated to use Node.js directly for dependency updates:

- Uses `node -e` scripts instead of `npm pkg set`
- Safely updates package.json files without npm dependency conflicts
- Works correctly with pnpm workspaces

**Testing**: The workflow has been tested to ensure dependency updates work correctly with pnpm workspaces.

### Pull Request Creation Fails

**Error**: `GraphQL: GitHub Actions is not permitted to create or approve pull requests (createPullRequest)`

**Cause**: The workflow is attempting to create a PR with `GITHUB_TOKEN`, but repository policy blocks this action.

**Fix**: Enable GitHub Actions PR creation in repository Actions settings.

## Recommended Branching Strategy

### 🎯 **Recommended: Main Branch Strategy**

**Use main branch for all releases** - This is the simplest and most straightforward approach:

**Pros:**

- ✅ **Simple**: Single source of truth
- ✅ **No complexity**: No need to manage multiple branches
- ✅ **Fast iteration**: Immediate feedback on prereleases
- ✅ **Easy maintenance**: All code lives in one place
- ✅ **GitHub flow compatible**: Standard practice for most projects

**Process:**

1. **Development**: Feature branches → PR → main
2. **Alpha releases**: Test early features from main
3. **Beta releases**: Stabilize features from main
4. **RC releases**: Final testing from main
5. **Stable releases**: Production ready from main

**Example workflow:**

```bash
# Feature development
git checkout -b feature/new-api
# ... work on feature
git push -u origin feature/new-api
# Create PR → merge to main

# Alpha release (test new features)
Actions → Version Bump → prepatch + alpha → v1.1.0-alpha.1

# Beta release (stabilize features)
Actions → Version Bump → prerelease + beta → v1.1.0-beta.1

# Release candidate
Actions → Version Bump → prerelease + rc → v1.1.0-rc.1

# Stable release
Actions → Version Bump → patch → v1.1.0
```

### 🏢 **Alternative: Release Branch Strategy**

**Use separate branches for release preparation** - More complex but better for enterprise workflows:

**Pros:**

- ✅ **Isolation**: Stable code separate from development
- ✅ **Hotfixes**: Easy to patch stable releases
- ✅ **Enterprise friendly**: Matches traditional release processes

**Cons:**

- ❌ **Complex**: Multiple branches to maintain
- ❌ **Merge conflicts**: Need to sync changes between branches
- ❌ **Slower**: More overhead for simple projects

**Process:**

1. **Development**: Feature branches → PR → main (development)
2. **Release prep**: Create `release/v1.1.0` branch from main
3. **Prereleases**: Alpha/beta/rc from release branch
4. **Stable release**: Final release from release branch
5. **Maintenance**: Hotfixes on release branch, merge back to main

### 🔥 **My Recommendation**

**Use the Main Branch Strategy** because:

1. **Your SDK is relatively simple** - No need for complex branching
2. **Fast iteration** - Prereleases help catch issues quickly
3. **Modern approach** - Matches how most npm packages are released
4. **Less maintenance** - Focus on code quality, not branch management
5. **Better for open source** - Contributors only need to understand main branch

The workflows I've created are designed to work perfectly with the main branch strategy. You can always evolve to a more complex branching strategy later if your project grows and requires it.

**Bottom line**: Start simple with main branch releases. The quality gates (tests + manual release triggers) provide sufficient protection for production releases.
