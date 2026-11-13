# @kevinjohn/adonisjs-origin-guard

Origin handling for an AdonisJS 7 application behind a browser:

- parse and validate the origins an application trusts;
- refuse cross-site writes from the `Origin` and `Sec-Fetch-Site` headers, with no token to issue
  or send;
- decide whether a proxy peer is on loopback or a private network.

Requires Node 24 or later and `@adonisjs/core` 7. The package reads no environment variable; the
host passes every value in.

## Install

Releases are GitHub release tarballs; the package is not on the npm registry.

```sh
pnpm add https://github.com/Kevinjohn/oss-adonisjs-origin-guard/releases/download/v0.1.0/kevinjohn-adonisjs-origin-guard-0.1.0.tgz
```

There is no provider and nothing to configure with `node ace configure`.

## Refuse cross-site writes

Create a middleware file that default-exports the guard:

```ts
// app/middleware/origin_guard_middleware.ts
import {
  createOriginGuard,
  parseOrigins,
  resolvePublicOrigin,
} from '@kevinjohn/adonisjs-origin-guard'
import env from '#start/env'

const publicOrigin = resolvePublicOrigin(env.get('APP_URL'), env.get('NODE_ENV'), 'APP_URL')

export default createOriginGuard({
  publicOrigin: publicOrigin.origin,
  allowedOrigins: parseOrigins(env.get('CORS_ORIGINS', '')),
})
```

Register it as server middleware in `start/kernel.ts`, before anything that acts on a write:

```ts
server.use([() => import('#middleware/origin_guard_middleware')])
```

The guard lets `GET`, `HEAD` and `OPTIONS` through. For every other method:

| Request                                            | Outcome  |
| -------------------------------------------------- | -------- |
| `Origin` equals the public origin exactly          | accepted |
| `Origin` equals an allowed origin exactly          | accepted |
| No `Origin`, `Sec-Fetch-Site: same-origin`         | accepted |
| No `Origin`, any other or no `Sec-Fetch-Site`      | refused  |
| Any other `Origin`, whatever else the request says | refused  |

A refusal answers `403` with `{ "error": "Cross-site request rejected." }` and the rest of the
stack does not run. `Origin` is compared as sent: nothing is normalised, and `Host` and the request
protocol are never consulted. `isTrustedUnsafeOrigin(headers, config)` is the same decision as a
function.

Turn off Shield's token-based CSRF if this guard replaces it. A client that sends neither header,
such as a script using a bare HTTP library, must send `Origin`.

## Parse origins

- `parseOrigins(list)` takes a comma-separated string and returns each origin in the form a browser
  sends. It throws on `*` and on any entry that is not a bare HTTP(S) origin (credentials, a path, a
  query or a fragment).
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

## Development

```sh
pnpm install
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
