# @kevinjohn/adonisjs-origin-guard

Origin handling for an AdonisJS 7 application behind a browser:

- parse and validate the origins an application trusts;
- refuse cross-site writes from the `Origin` and `Sec-Fetch-Site` headers, with no token to issue
  or send;
- decide whether a proxy peer is on loopback or a private network.

## Install

Releases are distributed as GitHub release tarballs. The configure hook described below is
unreleased. For the published v0.4.0 setup and installation, use the
[v0.4.0 README](https://github.com/Kevinjohn/oss-adonisjs-origin-guard/blob/v0.4.0/README.md).

To try the unreleased setup, run `pnpm build && pnpm pack` in this repository. In your AdonisJS
application, install that archive and run the configure command by package name:

```sh
pnpm add /absolute/path/to/kevinjohn-adonisjs-origin-guard-0.4.0.tgz
node ace configure @kevinjohn/adonisjs-origin-guard
```

The configure command needs the application's `@adonisjs/assembler` development dependency.

## What the configure hook changes

- Creates `config/origin_guard.ts`.
- Adds the origin settings to `start/env.ts` and inserts blank placeholders for new settings in existing
  `.env` and `.env.example` files.
- Registers `@kevinjohn/adonisjs-origin-guard/origin_guard_middleware` at the front of the server
  middleware stack in `start/kernel.ts`.

You can rerun the command after editing the generated config or filling in the environment values.

## Configuration

Set `ORIGIN_GUARD_PUBLIC_ORIGIN` to the canonical public origin of your application, such as
`https://app.example`. For local development and tests, you can use HTTP on `localhost`, `127.0.0.1`
or `[::1]` with the application's port. Set `ORIGIN_GUARD_ALLOWED_ORIGINS` only if additional
origins should be allowed to write. Use a comma-separated list of trusted HTTP(S) origins.

The generated config reads your application's environment settings:

```ts
// config/origin_guard.ts
import env from '#start/env'
import { defineConfig } from '@kevinjohn/adonisjs-origin-guard'

export default defineConfig({
  publicOrigin: env.get('ORIGIN_GUARD_PUBLIC_ORIGIN'),
  allowedOrigins: env.get('ORIGIN_GUARD_ALLOWED_ORIGINS'),
  environment: env.get('NODE_ENV'),
})
```

The application owns these settings. Set them in each environment that boots the application,
including when running Ace commands that boot it. AdonisJS evaluates `defineConfig` when it
loads the config during boot, before the first request. An omitted allowlist trusts only the
public origin when a request sends `Origin`.

## Usage

### Refuse cross-site writes

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

`defineConfig`, `parseOrigins` and `resolvePublicOrigin` throw `InvalidArgumentsException` from
`@adonisjs/core/exceptions` for invalid origin settings. The configuration errors from
`defineConfig` identify the key in `config/origin_guard.ts` and omit the rejected value. Correct
the setting and restart the application.

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
