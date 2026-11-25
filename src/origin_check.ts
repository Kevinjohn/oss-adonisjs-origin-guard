import type { OriginGuardConfig, UnsafeRequestHeaders } from './types.ts'

/**
 * Whether an unsafe request comes from a trusted origin. With `Origin`, it must equal the public
 * origin or an allowed origin exactly; nothing is normalised. Without `Origin`, or with an empty
 * one, only `Sec-Fetch-Site: same-origin` is accepted. `Host` and the request protocol are never
 * consulted.
 *
 * @example
 * ```ts
 * import { isTrustedUnsafeOrigin } from '@kevinjohn/adonisjs-origin-guard'
 * import type { HttpContext } from '@adonisjs/core/http'
 *
 * function acceptsWrite({ request }: HttpContext) {
 *   return isTrustedUnsafeOrigin(
 *     { origin: request.header('origin'), fetchSite: request.header('sec-fetch-site') },
 *     { publicOrigin: 'https://app.example' }
 *   )
 * }
 * ```
 */
export function isTrustedUnsafeOrigin(
  { origin, fetchSite }: UnsafeRequestHeaders,
  config: OriginGuardConfig
): boolean {
  if (!origin) return fetchSite === 'same-origin'
  return origin === config.publicOrigin || (config.allowedOrigins ?? []).includes(origin)
}
