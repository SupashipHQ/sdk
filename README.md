# Supaship SDK

A collection of SDKs for Supaship that provides feature flag management for various platforms and frameworks. This monorepo is designed to house multiple SDKs, with more packages planned for the future.

## Packages

This monorepo contains the following packages:

- [@supashiphq/sdk-javascript](./packages/javascript/README.md) - Core JavaScript SDK for feature flag management

More packages will be added in the future to support additional platforms and frameworks.

## Quick Start

### JavaScript SDK

```javascript
import { DarkFeatureClient } from '@supashiphq/sdk-javascript'

const client = new DarkFeatureClient({
  apiKey: 'environment-api-key',
  context: {
    userId: '123',
    version: '1.0.1',
  },
})

// Get a feature flag
const isEnabled = await client.getFeature('my-feature', { fallback: false })

// Get multiple feature flags
const features = await client.getFeatures({
  features: {
    feature1: false,
    feature2: true,
  },
  context: {
    userId: '123',
  },
})
```

For framework-specific examples and detailed documentation, please refer to the individual SDK documentation:

- [React SDK Documentation](./packages/react/README.md)
- [Vue SDK Documentation](./packages/vue/README.md)
- [Angular SDK Documentation](./packages/angular/README.md)

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
