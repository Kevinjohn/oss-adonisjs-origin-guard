# Origin Guard integration decisions

- For the 2026-11-25 unreleased alignment, target fresh installations for
  [#83](https://github.com/Kevinjohn/oss-adonisjs-origin-guard/issues/83),
  [#84](https://github.com/Kevinjohn/oss-adonisjs-origin-guard/issues/84) and
  [#85](https://github.com/Kevinjohn/oss-adonisjs-origin-guard/issues/85).
  The middleware factories were retired. Keep the standalone origin parsing, request decision
  and proxy helpers available independently of middleware installation.
- The application supplies its public origin explicitly, with no inferred host or default trust.
  AdonisJS loads and validates the app-owned `config/origin_guard.ts` in every process that
  boots the application. Ace configure itself can run before those settings are populated.
  The middleware uses the core provider's Config binding and needs no package provider.

## Consumer adoption

Capacity Lens and the Starter Examples pin the released v0.4.0 tarball. Their installed
behavior changes when they choose to update the pin after the next release.

- Capacity Lens consumes the old factory in `apps/backend/app/middleware/origin_guard_middleware.ts`.
  On adoption, add `apps/backend/config/origin_guard.ts` with `defineConfig`. Pass
  `publicOrigin.origin` from `#config/public_origin`, `corsOrigins.join(',')` from
  `#config/cors`, and `env.get('NODE_ENV')` from `#start/env`. This reuses the host's
  `CAPACITYLENS_PUBLIC_URL` or `APP_URL` and its CORS or development origins.
  Replace the local middleware import in `apps/backend/start/kernel.ts` with
  `() => import('@kevinjohn/adonisjs-origin-guard/origin_guard_middleware')` in the existing
  slot after the security-headers middleware. Remove the retired local factory wrapper and keep
  just that one server-stack entry.
- The API, Hypermedia, Inertia React and Inertia Vue Starter Examples call the standalone
  `resolvePublicOrigin` helper in their `start/public_origin.ts` files. They can update the pin
  without running Ace configure or changing any middleware.
