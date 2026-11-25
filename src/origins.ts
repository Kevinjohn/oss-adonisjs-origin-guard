import { InvalidArgumentsException } from '@adonisjs/core/exceptions'
import type { PublicOrigin } from './types.ts'

/**
 * Parses a comma-separated list of origins with the WHATWG `URL` parser. Blank entries are skipped;
 * each remaining entry is returned as `URL.origin`, normalizing spellings such as host case,
 * default ports and a trailing root slash before checking the parsed URL's components.
 * @throws InvalidArgumentsException when an entry is `*`, since credentialed requests need explicit
 * origins.
 * @throws InvalidArgumentsException when an entry is malformed, uses a non-HTTP(S) scheme, has
 * credentials, a path other than `/`, a non-empty query or a non-empty fragment. The message reports
 * its one-based list position without echoing the entry.
 *
 * @example
 * ```ts
 * import { parseOrigins } from '@kevinjohn/adonisjs-origin-guard'
 *
 * const allowedOrigins = parseOrigins('https://admin.example, https://portal.example')
 * ```
 */
export function parseOrigins(list: string): string[] {
  return list
    .split(',')
    .map((origin, index) => ({ origin: origin.trim(), position: index + 1 }))
    .filter(({ origin }) => Boolean(origin))
    .map(({ origin, position }) => {
      if (origin === '*') {
        throw new InvalidArgumentsException(
          'CORS requires explicit origins when credentials are enabled'
        )
      }
      let parsed: URL | undefined
      try {
        parsed = new URL(origin)
      } catch {
        // Reported below with the same message as any other malformed entry.
      }
      if (
        !parsed ||
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.pathname !== '/' ||
        parsed.search ||
        parsed.hash
      ) {
        throw new InvalidArgumentsException(
          `Invalid CORS origin at position ${position}: expected a bare HTTP(S) origin`
        )
      }
      return parsed.origin
    })
}

/**
 * Validates the one origin an application is served from. The value must already be in serialized
 * form (`https://app.example`, no trailing slash). HTTPS is required in production, and outside
 * loopback in every other environment. `variable` names the setting in error messages.
 * @throws InvalidArgumentsException `<variable> must be a bare HTTP(S) origin`.
 * @throws InvalidArgumentsException `<variable>: public production origins require HTTPS`.
 * @throws InvalidArgumentsException when HTTP is used outside loopback in development or test.
 *
 * @example
 * ```ts
 * import { resolvePublicOrigin } from '@kevinjohn/adonisjs-origin-guard'
 *
 * const { origin, secure } = resolvePublicOrigin('https://app.example', 'production', 'APP_URL')
 * ```
 */
export function resolvePublicOrigin(
  value: string,
  environment: 'production' | 'development' | 'test',
  variable: string
): PublicOrigin {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new InvalidArgumentsException(`${variable} must be a bare HTTP(S) origin`)
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.origin !== value ||
    url.username ||
    url.password
  )
    throw new InvalidArgumentsException(`${variable} must be a bare HTTP(S) origin`)
  if (
    url.protocol !== 'https:' &&
    (environment === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  )
    throw new InvalidArgumentsException(
      environment === 'production'
        ? `${variable}: public production origins require HTTPS`
        : `${variable} must use HTTPS outside loopback in development/test`
    )
  return { origin: url.origin, secure: url.protocol === 'https:' }
}
