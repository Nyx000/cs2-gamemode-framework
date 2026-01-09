# Contributing

## Getting started

1. Fork and clone the repo
2. `cd dev && bun install`
3. `bun run dev` to start watch mode
4. Make your changes
5. `bun run check` to verify lint + types pass
6. Open a PR

## Code style

- Run `bun run format` before committing
- TypeScript strict mode is on, don't use `any` unless absolutely necessary
- Features go in `dev/src/features/your-feature/`
- Keep features self-contained - don't reach into other features

## Feature structure

```
dev/src/features/your-feature/
├── index.ts      # Exports createYourFeature function
├── types.ts      # TypeScript interfaces (optional)
├── config.ts     # Constants/configuration (optional)
└── other.ts      # Internal modules as needed
```

The `index.ts` must export a function matching `create[FeatureName]` that returns a `Feature`.

## Pull requests

- One feature/fix per PR
- Update docs if you're changing behavior
- Add yourself to contributors if you want

## Reporting bugs

Open an issue with:
- What you expected
- What happened
- Steps to reproduce
- CS2 build version if relevant

## Questions

Open an issue or discussion. There's no Discord yet.
