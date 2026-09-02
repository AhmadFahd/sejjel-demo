# سجّل — the app

Run and build instructions are in the [repository README](../README.md); the
stack and the reasons behind it are in [TECH_STACK.md](../TECH_STACK.md).

```
src/routes/       file-based routes
src/router.tsx    router setup
src/styles.css    Tailwind entry
```

Routes are generated into `src/routeTree.gen.ts` by the dev server and the build.
Run `npm run generate-routes` to regenerate by hand.
