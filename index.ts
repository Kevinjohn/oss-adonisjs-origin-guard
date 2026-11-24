import { createOriginGuard } from './src/origin_check.js'

export { parseOrigins, resolvePublicOrigin } from './src/origins.js'
export { createOriginGuard, isTrustedUnsafeOrigin } from './src/origin_check.js'

/**
 * Builds the same server middleware as `createOriginGuard`.
 *
 * @example
 * ```ts
 * import { createOriginCheck, resolvePublicOrigin } from '@kevinjohn/adonisjs-origin-guard'
 *
 * export default createOriginCheck({
 *   publicOrigin: resolvePublicOrigin('https://app.example', 'production', 'APP_URL').origin,
 * })
 * ```
 */
export const createOriginCheck = createOriginGuard
export { isPrivatePeer } from './src/private_peer.js'
export type { OriginGuardConfig, PublicOrigin, UnsafeRequestHeaders } from './src/types.js'
