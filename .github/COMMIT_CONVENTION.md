# Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types

| Type       | Description              | Example                                     |
| ---------- | ------------------------ | ------------------------------------------- |
| `feat`     | A new feature            | `feat(auth): add OAuth2 login`              |
| `fix`      | A bug fix                | `fix(api): handle null response`            |
| `docs`     | Documentation changes    | `docs: update README installation`          |
| `style`    | Code style changes       | `style: fix indentation in utils`           |
| `refactor` | Code refactoring         | `refactor(client): simplify error handling` |
| `perf`     | Performance improvements | `perf: optimize feature flag lookup`        |
| `test`     | Adding or fixing tests   | `test: add coverage for edge cases`         |
| `chore`    | Build/maintenance tasks  | `chore: update dependencies`                |
| `ci`       | CI configuration changes | `ci: add automated testing workflow`        |
| `build`    | Build system changes     | `build: add rollup configuration`           |
| `revert`   | Revert a previous commit | `revert: undo breaking change in API`       |

## Rules

- ✅ Use lowercase for `type` and `scope`
- ✅ Keep the header under 72 characters
- ✅ Don't end the subject with a period
- ✅ Use imperative mood ("add feature" not "added feature")
- ✅ Add scope when applicable (e.g., `feat(javascript): ...`)

## Examples

```bash
# Good examples
feat: add user authentication
fix(api): resolve timeout issues
docs(readme): update installation instructions
test(client): add unit tests for retry logic
chore: bump dependencies to latest versions

# Bad examples (will be rejected)
Add user authentication          # Missing type
feat: Add user authentication.   # Ends with period
FEAT: add authentication        # Uppercase type
feat: add user authentication system with OAuth2 and JWT tokens that supports multiple providers  # Too long
```

## Testing

Test your commit message before committing:

```bash
# Test a specific message
echo "feat: add new feature" | npx commitlint

# Test the setup
pnpm commitlint:test
```
