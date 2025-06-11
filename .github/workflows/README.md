# GitHub Workflows

This directory contains the GitHub Actions workflows for the DarkFeature SDK project.

## Shared Configuration

All workflows use a shared package configuration system to ensure consistency across the monorepo.

### Package Processing Order

Packages are processed in a specific order defined in `.github/scripts/package-config.sh`:

1. **JavaScript package** (`@darkfeature/sdk-javascript`) - processed first
2. **React package** (`@darkfeature/sdk-react`) - processed second

This order is important because:

- The React package depends on the JavaScript package
- When JavaScript is version bumped, React's dependency is automatically updated
- Publishing follows the same order to ensure dependencies are available

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

1. Run full test suite to ensure code quality
2. Bump version in root `package.json` and all workspace packages
3. Update `pnpm-lock.yaml` to reflect new versions
4. Commit changes to main branch
5. Create and push git tag (e.g., `v1.2.3` or `v1.2.3-beta.1`)
6. Create GitHub release (marked as prerelease for beta versions)

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

Add these secrets in your GitHub repository settings:

- `NPM_ACCESS_TOKEN`: Your npm access token with publish permissions
  - Go to [npm Access Tokens](https://www.npmjs.com/settings/tokens)
  - Generate a **Granular Access Token** or **Classic Token**
  - Ensure it has publish access to your packages
  - Add it to GitHub repository secrets

### 2. npm Package Access

Ensure your npm token has permission to publish to:

- `@darkfeature/sdk-javascript`
- Any other packages in the `packages/` directory

### 3. Repository Permissions

The workflows need these permissions (automatically granted):

- `contents: write` - to create releases and push tags
- `id-token: write` - for npm publishing

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
npm install @darkfeature/sdk-javascript@alpha

# Install latest beta
npm install @darkfeature/sdk-javascript@beta

# Install latest release candidate
npm install @darkfeature/sdk-javascript@rc

# Install specific version
npm install @darkfeature/sdk-javascript@1.2.3-beta.1
```

## Workflow Benefits

1. **Automated Quality Gates**: Tests must pass before any release
2. **Consistent Versioning**: All packages stay in sync
3. **Automatic Publishing**: No manual npm publish commands
4. **Beta Release Support**: Proper prerelease handling
5. **Duplicate Prevention**: Won't republish existing versions
6. **Audit Trail**: Full history of releases in GitHub
7. **Manual Control**: You decide when to release, no automatic releases on merge

## Troubleshooting

### Failed Publishing

If publishing fails:

1. Check `NPM_ACCESS_TOKEN` is valid and has correct permissions
2. Verify package names in `package.json` files are correct
3. Ensure you have publish rights to the npm packages
4. Check for any npm registry outages

### Version Conflicts

If you need to fix a failed release:

1. Manually delete the git tag: `git tag -d v1.2.3 && git push origin :v1.2.3`
2. Reset the version in package.json files if needed
3. Re-run the version bump workflow

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
