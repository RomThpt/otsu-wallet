# Contributing

Otsu is open source and contributions are welcome.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/RomThpt/otsu-wallet.git
cd otsu-wallet

# Install dependencies
pnpm install

# Start the extension in dev mode
pnpm --filter @otsu/extension dev
```

## Project Structure

Otsu is a monorepo using pnpm workspaces:

| Package | Description |
|---------|-------------|
| `@otsu/extension` | Browser extension (Vue 3 + Vite + Tailwind CSS) |
| `@otsu/core` | Framework-agnostic services (keyring, network, auth) |
| `@otsu/api` | Provider API types and dApp integration |
| `@otsu/types` | Shared TypeScript interfaces |
| `@otsu/constants` | Network definitions, reserves, derivation paths |
| `@otsu/eslint-config` | Shared ESLint configuration |

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format:check
```

## Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure all checks pass (`pnpm typecheck && pnpm lint && pnpm test`)
5. Submit a pull request

All PRs must pass CI (typecheck, lint, format, tests, build) before merging.
