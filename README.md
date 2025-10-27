# Supaship SDK

A collection of SDKs for Supaship that provides feature flag management for various platforms and frameworks. This monorepo is designed to house multiple SDKs, with more packages planned for the future.

## Packages

This monorepo contains the following packages:

### Core SDKs

- [@supashiphq/sdk-javascript](./packages/javascript/README.md) - Core JavaScript SDK for feature flag management
- [@supashiphq/sdk-react](./packages/react/README.md) - React SDK (hooks and components)

### OpenFeature Providers

- [@supashiphq/openfeature-js-provider](./packages/openfeature-js/README.md) - OpenFeature provider for JavaScript/TypeScript
- [@supashiphq/openfeature-react-provider](./packages/openfeature-react/README.md) - OpenFeature provider for React

More packages will be added in the future to support additional platforms and frameworks.

## Quick Start

### JavaScript SDK

```javascript
import { SupaClient } from '@supashiphq/sdk-javascript'

const client = new SupaClient({
  apiKey: 'api-key',
  environment: 'production',
  context: {
    userID: '123',
    version: '1.0.1',
  },
})

// Get a boolean feature flag
const isEnabled = await client.getFeature('my-feature', { fallback: false })

// Get multiple boolean feature flags
const features = await client.getFeatures({
  features: {
    feature1: false,
    feature2: true,
  },
  context: {
    userID: '123',
  },
})
```

For framework-specific examples and detailed documentation, see:

- [React SDK Documentation](./packages/react/README.md)

## Development

For development setup, workflow, and contribution guidelines, please refer to our [Contributing Guide](./CONTRIBUTING.md).

### Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with automatic validation:

```bash
# Examples of valid commit messages
feat: add new feature
fix(api): resolve authentication issue
docs: update installation guide
test: add unit tests for client

# Test your commit message
echo "feat: your message" | npx commitlint
```

See [.github/COMMIT_CONVENTION.md](./.github/COMMIT_CONVENTION.md) for detailed commit message guidelines.

### Continuous Integration

This repository uses GitHub Actions for automated testing, building, and publishing:

- **CI Pipeline**: Automatically tests and builds packages on pull requests
- **Release Pipeline**: Publishes packages to npm when releases are created
- **Multiple Node.js versions**: Tests against Node.js 18 and 20

See [.github/workflows/README.md](./.github/workflows/README.md) for detailed workflow documentation.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

- [Documentation](https://supaship.com/docs)
- [GitHub Issues](https://github.com/supashiphq/sdk/issues)

## Security

If you discover a security vulnerability, please email feedback@supaship.com. We take security seriously and will respond promptly.
