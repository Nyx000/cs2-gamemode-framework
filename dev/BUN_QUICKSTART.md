# Bun Quickstart Guide

This project uses **Bun** as its JavaScript runtime, package manager, bundler, and test runner. Bun is significantly
faster than Node.js and npm, providing a seamless development experience.

## What is Bun?

Bun is an all-in-one JavaScript toolkit that replaces:

- **Runtime**: Node.js
- **Package Manager**: npm, yarn, pnpm
- **Bundler**: esbuild, webpack, rollup
- **Test Runner**: jest, vitest

## Installation & Updates

### Install Bun (Unix/Linux/WSL)

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # Reload shell to use bun
```

### Update Bun

```bash
bun upgrade
```

### Verify Installation

```bash
bun --version
```

## Essential Commands for This Project

### Development Workflow

```bash
# Start development mode (compile + deploy in watch mode)
bun run dev:watch

# Just compile TypeScript (watch mode)
bun run dev:compile

# Just deploy to game directory (watch mode)
bun run dev:deploy

# Interactive dev helper (recommended for beginners)
bun run dev
```

### Build & Deploy

```bash
# Full build (features + type-check + compile)
bun run build

# Quick compile only
bun run compile

# Deploy to game directory (one-time)
bun run deploy

# Clean deploy (removes old files first)
bun run deploy:clean

# Fresh start (clear cache + clean deploy)
bun run fresh
```

### Code Quality

```bash
# Lint TypeScript files
bun run lint

# Type check without emitting files
bun run type-check

# Run both lint and type-check
bun run check

# Format code with Prettier
bun run format
```

### Maintenance

```bash
# Stop all dev processes
bun run stop

# Restart dev processes
bun run restart

# Check process status
bun run status

# View logs
bun run logs

# Clear CS2 cache files
bun run clear-cache

# Sync type definitions from game files
bun run sync-types
```

## Package Management with Bun

### Install Dependencies

```bash
# Install all dependencies from package.json
bun install

# Add a new package
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>

# Remove a package
bun remove <package-name>

# Update all packages
bun update
```

### Why Bun is Faster

- **Native bundler**: No need for separate esbuild/webpack
- **Fast installs**: Bun installs packages 10-25x faster than npm
- **Built-in TypeScript**: No need for ts-node or extra compilation
- **Native watch mode**: Built-in file watching without external tools

## Key Differences from Node.js/npm

| Task             | npm                 | Bun              |
| ---------------- | ------------------- | ---------------- |
| Install packages | `npm install`       | `bun install`    |
| Add package      | `npm install pkg`   | `bun add pkg`    |
| Remove package   | `npm uninstall pkg` | `bun remove pkg` |
| Run script       | `npm run build`     | `bun run build`  |
| Execute file     | `node script.js`    | `bun script.js`  |
| Run TypeScript   | `ts-node script.ts` | `bun script.ts`  |

## Performance Benefits in This Project

1. **Faster Builds**: Bun's native bundler replaces esbuild with similar speed but better integration
2. **Instant TypeScript**: No transpilation step needed - Bun runs TypeScript directly
3. **Hot Reload**: Native file watching is faster and more reliable
4. **Smaller Dependencies**: Removed `esbuild` and `npm-run-all` - Bun handles these natively

## Troubleshooting

### Command not found: bun

```bash
# Reload your shell configuration
source ~/.bashrc
# or
source ~/.zshrc
```

### Slow first run

Bun caches modules after the first run. Subsequent executions will be much faster.

### Check for updates regularly

```bash
bun upgrade
```

## Learn More

- **Official Docs**: https://bun.sh/docs
- **API Reference**: https://bun.sh/docs/api
- **Discord Community**: https://bun.sh/discord
- **GitHub**: https://github.com/oven-sh/bun

## Project-Specific Notes

- All build scripts now use `Bun.build` API instead of esbuild
- Scripts use `#!/usr/bin/env bun` shebang for direct execution
- Parallel script execution uses shell `&` instead of npm-run-all
- TypeScript is compiled on-the-fly - no intermediate .js files in src/
