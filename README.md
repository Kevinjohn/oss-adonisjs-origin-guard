# @kevinjohn/adonisjs-origin-guard

Origin handling for an AdonisJS 7 application behind a browser:

- parse and validate the origins an application trusts;
- refuse cross-site writes from the `Origin` and `Sec-Fetch-Site` headers, with no token to issue
  or send;
- decide whether a proxy peer is on loopback or a private network.

Requires Node 24 or later and `@adonisjs/core` 7. The package reads no environment variable; the
host passes every value in. The host must declare `APP_URL` in `start/env.ts`, for example as
`APP_URL: Env.schema.string()`, before reading it from `#start/env`.

## Install

Releases are GitHub release tarballs; the package is not on the npm registry.

```sh
pnpm add https://github.com/Kevinjohn/oss-adonisjs-origin-guard/releases/download/v0.1.0/kevinjohn-adonisjs-origin-guard-0.1.0.tgz
```

There is no provider and nothing to configure with `node ace configure`.

## Refuse cross-site writes

Validate the host settings in a module shared by the eagerly loaded kernel and the middleware:

```ts
// start/origin_config.ts
import env from '#start/env'
import { parseOrigins, resolvePublicOrigin } from '@kevinjohn/adonisjs-origin-guard'

export const originGuardConfig = {
  publicOrigin: resolvePublicOrigin(env.get('APP_URL'), env.get('NODE_ENV'), 'APP_URL').origin,
  allowedOrigins: parseOrigins(env.get('CORS_ORIGINS', '')),
}
```

Import that module from `start/kernel.ts` before registering the lazy middleware. AdonisJS loads
the kernel during HTTP startup; this eager import makes invalid origin settings stop boot, before
the first request. Keep the middleware import lazy, and have it consume the already evaluated
configuration:

```ts
// app/middleware/origin_guard_middleware.ts
import { createOriginGuard } from '@kevinjohn/adonisjs-origin-guard'
import { originGuardConfig } from '#start/origin_config'

export default createOriginGuard(originGuardConfig)
```

Register it as server middleware in `start/kernel.ts`, before anything that acts on a write:

```ts
import '#start/origin_config'

server.use([() => import('#middleware/origin_guard_middleware')])
```

The guard lets `GET`, `HEAD` and `OPTIONS` through. For every other method:

| Request                                                     | Outcome  |
| ----------------------------------------------------------- | -------- |
| `Origin` equals the public origin exactly                   | accepted |
| `Origin` equals an allowed origin exactly                   | accepted |
| No or empty `Origin`, `Sec-Fetch-Site: same-origin`         | accepted |
| No or empty `Origin`, any other or no `Sec-Fetch-Site`      | refused  |
| Any other `Origin`, including `null`, whatever else is sent | refused  |

A refusal answers `403` with `{ "error": "Cross-site request rejected." }` and the rest of the
stack does not run. `Origin` is compared as sent: nothing is normalised, and `Host` and the request
protocol are never consulted. `isTrustedUnsafeOrigin(headers, config)` is the same decision as a
function.

Pass a `publicOrigin` produced by `resolvePublicOrigin` and `allowedOrigins` produced by
`parseOrigins` (or an equivalent validated serialized HTTP(S) origin list). Validate host-owned
settings once during eager startup as shown below. The per-request guard compares headers with that
configuration; it does not parse or revalidate the configured origins on each request.

Turn off Shield's token-based CSRF if this guard replaces it. A client that sends neither header,
such as a script using a bare HTTP library, must send `Origin`.

## Parse origins

- `parseOrigins(list)` takes a comma-separated string and returns each origin in the form a browser
  sends. It throws on `*` and on any entry whose WHATWG-parsed URL has credentials, a path other
  than `/`, a non-empty query or a non-empty fragment. Errors report the one-based entry position
  without echoing the rejected value. Parsing normalizes equivalent URL spellings, such as host
  case, default ports and a root slash, before returning `URL.origin`.
- `resolvePublicOrigin(value, environment, variable)` validates the one origin the application is
  served from and returns `{ origin, secure }`. HTTPS is required in production, and outside
  `localhost`, `127.0.0.1` and `[::1]` in development and test. `variable` names the setting in the
  error message.

## Trust a proxy

`isPrivatePeer(address)` is true for loopback and private networks (`127.0.0.0/8`, `10.0.0.0/8`,
`172.16.0.0/12`, `192.168.0.0/16`, `::1`, `fc00::/7`), including IPv4-mapped IPv6:

```ts
// config/app.ts
import { isPrivatePeer } from '@kevinjohn/adonisjs-origin-guard'

export const http = defineConfig({ trustProxy: isPrivatePeer })
```

AdonisJS uses `trustProxy` against the immediate socket peer when deciding whether to use forwarded
host and protocol metadata. Its client-IP lookup can walk the `X-Forwarded-For` address chain,
stopping at the first untrusted address. This helper checks address ranges, not proxy identity: only
use it when your network prevents untrusted clients from reaching the app through a trusted private
address. If only specific proxies are trusted, provide a predicate for those peers instead. The
application still needs network rules that control who can supply forwarded headers.

## Development

Contributors use Node 24, selected by the repository's development tooling. The published package
supports Node 24 and later.

```sh
pnpm install
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check:changed [--static] [base]` runs the checks the files changed since `base` (default
`origin/main`) need: format, lint, types, the changed specs, the full suite when source or
manifests changed, and the build. `--static` leaves out the full suite and the build.

## License

MIT
