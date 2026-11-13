/** One validated public origin and whether it is served over HTTPS. */
export interface PublicOrigin {
  origin: string
  secure: boolean
}

/**
 * Parses a comma-separated list of origins. Blank entries are skipped and each remaining entry is
 * returned in the serialized form a browser sends in `Origin`.
 * @throws Error when an entry is `*`, since credentialed requests need explicit origins.
 * @throws Error when an entry is not a bare HTTP(S) origin: no credentials, path, query or fragment.
 */
export function parseOrigins(list: string): string[] {
  return list
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      if (origin === '*') {
        throw new Error('CORS requires explicit origins when credentials are enabled')
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
        throw new Error(
          `Invalid CORS origin ${JSON.stringify(origin)}: expected a bare HTTP(S) origin`
        )
      }
      return parsed.origin
    })
}

/**
 * Validates the one origin an application is served from. The value must already be in serialized
 * form (`https://app.example`, no trailing slash). HTTPS is required in production, and outside
 * loopback in every other environment. `variable` names the setting in error messages.
 * @throws Error `<variable> must be a bare HTTP(S) origin`.
 * @throws Error `<variable>: public production origins require HTTPS`.
 * @throws Error `<variable> must use HTTPS outside loopback in development/test`.
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
    throw new Error(`${variable} must be a bare HTTP(S) origin`)
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.origin !== value ||
    url.username ||
    url.password
  )
    throw new Error(`${variable} must be a bare HTTP(S) origin`)
  if (
    url.protocol !== 'https:' &&
    (environment === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  )
    throw new Error(
      environment === 'production'
        ? `${variable}: public production origins require HTTPS`
        : `${variable} must use HTTPS outside loopback in development/test`
    )
  return { origin: url.origin, secure: url.protocol === 'https:' }
}
