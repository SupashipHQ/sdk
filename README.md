# DarkFeature SDK

A collection of SDKs for DarkFeature that provides feature flag management for various platforms and frameworks.

## Packages

This monorepo contains the following packages:

- [@darkfeature/sdk-javascript](./packages/javascript/README.md) - Core JavaScript SDK for feature flag management

## Quick Start

### JavaScript SDK

```javascript
import { DarkFeature } from "@darkfeature/sdk-javascript";

const client = new DarkFeature({
  apiKey: "your-api-key",
  context: {
    userId: "123",
    environment: "production",
  },
});

// Get a feature flag
const isEnabled = await client.getFeature("my-feature", { fallback: false });

// Get multiple feature flags
const features = await client.getFeatures({
  features: {
    feature1: false,
    feature2: true,
  },
  context: {
    userId: "123",
  },
});
```

For framework-specific examples and detailed documentation, please refer to the individual SDK documentation:

- [React SDK Documentation](./packages/react/README.md)
- [Vue SDK Documentation](./packages/vue/README.md)
- [Angular SDK Documentation](./packages/angular/README.md)

## Development

### Prerequisites

- Node.js >= 16
- pnpm >= 8

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Project Structure

```
.
├── packages/
│   ├── javascript/     # Core JavaScript SDK
├── scripts/            # Build and utility scripts
└── .github/            # GitHub workflows and templates
```

### Versioning and Publishing

We use semantic versioning for our packages. To release a new version:

1. Bump the version:

```bash
pnpm version <version>  # e.g., pnpm version 1.0.0
```

2. Push changes and tags:

```bash
git push origin main --tags
```

The GitHub workflow will automatically publish the packages to npm when a new version tag is pushed.

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `perf:` - Performance improvements
- `test:` - Adding or fixing tests
- `chore:` - Changes to the build process or auxiliary tools

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

- [Documentation](https://darkfeature.com/docs)
- [GitHub Issues](https://github.com/darkfeature/sdk/issues)

## Security

If you discover a security vulnerability, please email security@darkfeature.com. We take security seriously and will respond promptly.
