import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { OriginGuardConfig, UnsafeRequestHeaders } from './types.js'

/**
 * Whether an unsafe request comes from a trusted origin. With `Origin`, it must equal the public
 * origin or an allowed origin exactly; nothing is normalised. Without `Origin`, or with an empty
 * one, only `Sec-Fetch-Site: same-origin` is accepted. `Host` and the request protocol are never
 * consulted.
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
 * and the rest of the stack does not run. Supply origins validated by `resolvePublicOrigin` and
 * `parseOrigins` before startup; the middleware compares request headers against that config without
 * validating the config on each request. Default-export the returned class from a middleware file.
 */
export function createOriginGuard(config: OriginGuardConfig) {
  return class OriginGuardMiddleware {
    async handle({ request, response }: HttpContext, next: NextFn) {
      const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
      if (
        isUnsafeMethod &&
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
