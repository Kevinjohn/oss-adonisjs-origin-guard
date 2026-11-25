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
