# Contributing to DarkFeature SDK

Thank you for your interest in contributing to DarkFeature SDK! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sdk.git
   cd sdk
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Make your changes
2. Run tests:
   ```bash
   pnpm test
   ```
3. Build packages:
   ```bash
   pnpm build
   ```
4. Commit your changes following the [Conventional Commits](https://www.conventionalcommits.org/) specification
5. Push to your fork
6. Create a Pull Request

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the documentation if needed
3. The PR will be merged once you have the sign-off of at least one other developer
4. Make sure all tests pass and there are no linting errors

## Testing

We use Jest for testing. To run tests:

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @darkfeature/sdk-javascript test

# Run tests in watch mode
pnpm test -- --watch
```

## Building

To build the packages:

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm --filter @darkfeature/sdk-javascript build
```

## Documentation

- Keep documentation up to date
- Add JSDoc comments for new functions and classes
- Update README.md if needed
- Add examples for new features

## Style Guide

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or fixing tests
- `chore`: Changes to the build process or auxiliary tools

Example:

```
feat(javascript): add getFeatures method for multiple feature flags
```

## Release Process

1. Update version numbers:
   ```bash
   pnpm version <version>
   ```
2. Push changes and tags:
   ```bash
   git push origin main --tags
   ```
3. The GitHub workflow will automatically publish the packages to npm

## Questions?

Feel free to:

- Open an issue
