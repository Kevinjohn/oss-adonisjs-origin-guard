# @kevinjohn/adonisjs-origin-guard

Origin handling for an AdonisJS 7 application behind a browser:

- parse and validate the origins an application trusts;
- refuse cross-site writes from the `Origin` and `Sec-Fetch-Site` headers, with no token to issue
  or send;
- decide whether a proxy peer is on loopback or a private network.

## Install

Releases are GitHub release tarballs; the package is not on the npm registry.

```sh
pnpm add https://github.com/Kevinjohn/oss-adonisjs-origin-guard/releases/download/v0.4.0/kevinjohn-adonisjs-origin-guard-0.4.0.tgz
```

## Setup

Installation currently requires manual middleware registration; there is no provider or Ace configure hook.
All host trust settings remain host-owned. Invalid settings fail startup without echoing the
rejected value. The [origin configuration helpers](#parse-origins) are also usable without
middleware registration. Since v0.3.0, public types are available from
`@kevinjohn/adonisjs-origin-guard/types`.

## Configuration

The package reads no environment variable; the
host passes every value in. The host must declare `APP_URL` in `start/env.ts`, for example as
`APP_URL: Env.schema.string()`, and optionally `CORS_ORIGINS: Env.schema.string.optional()`,
before reading them from `#start/env`.

Validate the host settings in a module shared by the eagerly loaded kernel and the middleware:

```ts
// start/origin_config.ts
import env from '#start/env'
import { parseOrigins, resolvePublicOrigin } from '@kevinjohn/adonisjs-origin-guard'

export const originCheckConfig = {
  publicOrigin: resolvePublicOrigin(env.get('APP_URL'), env.get('NODE_ENV'), 'APP_URL').origin,
  allowedOrigins: parseOrigins(env.get('CORS_ORIGINS', '')),
}
```

Reading `env` in `start/` rather than `config/` is a deliberate exception to the AdonisJS
convention. AdonisJS imports every `config/` file in every process that boots the application,
with no way to limit them by environment, so validating there would let an origin setting stop
processes that never serve HTTP. A preload file's `adonisrc.ts` entry can list the environments it
runs in, so the validation follows the HTTP kernel: the startup fixture lists
`environment: ['web']`, and a kernel entry with no list also runs in tests and in Ace commands that
start the application. If a `config/` file reads the raw values instead, keep the
`resolvePublicOrigin` and `parseOrigins` calls in the preloaded module so validation still runs
with the kernel.

## Usage

### Refuse cross-site writes

Import that module from `start/kernel.ts` before registering the lazy middleware. AdonisJS imports
the kernel preload file when the application starts; this eager import makes invalid origin
settings stop startup before the HTTP server begins handling requests. Keep the middleware import
lazy, and have it consume the already evaluated configuration. Default-export the server middleware
constructor returned by `createOriginCheck(config)`. Since v0.3.0, `createOriginGuard` is a
compatibility alias for the same factory and can be used in the same example.

```ts
// app/middleware/origin_check_middleware.ts
import { createOriginCheck } from '@kevinjohn/adonisjs-origin-guard'
import { originCheckConfig } from '#start/origin_config'

export default createOriginCheck(originCheckConfig)
```

Register it as server middleware in `start/kernel.ts`, before anything that acts on a write:

```ts
import '#start/origin_config'

server.use([() => import('#middleware/origin_check_middleware')])
```

The origin-check middleware lets `GET`, `HEAD` and `OPTIONS` through. For every other method:

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
settings once during eager startup as shown in the startup example above. The per-request origin check compares headers with that
configuration; it does not parse or revalidate the configured origins on each request.

Turn off Shield's token-based CSRF if this middleware replaces it. A client that sends neither header,
such as a script using a bare HTTP library, must send `Origin`.

### Parse origins

- `parseOrigins(list)` is a public package-root helper that validates a comma-separated configuration
  string and returns canonical HTTP(S) origins as a `string[]`. It trims each entry and skips
  blanks, so an empty or all-blank list returns `[]`. It uses the WHATWG `URL` parser and returns
  `URL.origin` for each valid entry, normalising host case, default ports and a trailing root slash.
- A malformed URL, a non-HTTP(S) scheme, credentials, a parsed path other than `/`, a non-empty
  query or a non-empty fragment is reported as
  `Invalid CORS origin at position <position>: expected a bare HTTP(S) origin`. The message includes
  the one-based position in the original list (including blanks) and omits the rejected value.
- A `*` entry is reported as `CORS requires explicit origins when credentials are enabled`,
  without a list position.
- `resolvePublicOrigin(value, environment, variable)` validates the one origin the application is
  served from and returns `{ origin, secure }`. HTTPS is required in production, and outside
  `localhost`, `127.0.0.1` and `[::1]` in development and test. `variable` names the setting in the
  error message.

### Trust a proxy

`isPrivatePeer(address)` is true for loopback and private networks (`127.0.0.0/8`, `10.0.0.0/8`,
`172.16.0.0/12`, `192.168.0.0/16`, `::1`, `fc00::/7`), including IPv4-mapped IPv6:

```ts
// config/app.ts
import { defineConfig } from '@adonisjs/core/http'
import { isPrivatePeer } from '@kevinjohn/adonisjs-origin-guard'

export const http = defineConfig({ trustProxy: isPrivatePeer })
```

AdonisJS uses `trustProxy` against the immediate socket peer when deciding whether to use forwarded
host and protocol metadata. Its client-IP lookup can walk the `X-Forwarded-For` address chain,
stopping at the first untrusted address. This helper checks address ranges, not proxy identity: only
use it when your network prevents untrusted clients from reaching the app through a trusted private
address. If only specific proxies are trusted, provide a predicate for those peers instead. The
application still needs network rules that control who can supply forwarded headers.

## Configuration errors

Both origin helpers throw `InvalidArgumentsException` from
`@adonisjs/core/exceptions` when configuration is invalid. Applications can recognize these failures with
`error instanceof InvalidArgumentsException`.

## Supported AdonisJS versions

Requires Node 24 or later and `@adonisjs/core` 7.

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
