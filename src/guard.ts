import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/** The origins an unsafe request may come from, in the serialized form browsers send. */
export interface OriginGuardConfig {
  /** The origin the application is served from. */
  publicOrigin: string
  /** Further origins trusted for writes, for example the CORS origin list. */
  allowedOrigins?: readonly string[]
}

/** The two request headers the decision reads. */
export interface UnsafeRequestHeaders {
  origin?: string
  fetchSite?: string
}

/**
 * Whether an unsafe request comes from a trusted origin. With `Origin`, it must equal the public
 * origin or an allowed origin exactly; nothing is normalised. Without `Origin`, only
 * `Sec-Fetch-Site: same-origin` is accepted. `Host` and the request protocol are never consulted.
 */
export function isTrustedUnsafeOrigin(
  { origin, fetchSite }: UnsafeRequestHeaders,
  config: OriginGuardConfig
): boolean {
  if (!origin) return fetchSite === 'same-origin'
  return origin === config.publicOrigin || (config.allowedOrigins ?? []).includes(origin)
}

/**
 * Builds a server middleware that refuses every request other than GET, HEAD and OPTIONS unless
 * `isTrustedUnsafeOrigin` accepts it. A refusal answers 403 `{ error: 'Cross-site request rejected.' }`
 * and the rest of the stack does not run. Default-export the returned class from a middleware file.
 */
export function createOriginGuard(config: OriginGuardConfig) {
  return class OriginGuardMiddleware {
    async handle({ request, response }: HttpContext, next: NextFn) {
      const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
      if (
        unsafe &&
        !isTrustedUnsafeOrigin(
          { origin: request.header('origin'), fetchSite: request.header('sec-fetch-site') },
          config
        )
      ) {
        return response.forbidden({ error: 'Cross-site request rejected.' })
      }
      return next()
    }
  }
}
