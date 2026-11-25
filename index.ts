import { createOriginGuard } from './src/origin_check.ts'

export { parseOrigins, resolvePublicOrigin } from './src/origins.ts'
export { createOriginGuard, isTrustedUnsafeOrigin } from './src/origin_check.ts'

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
export { isPrivatePeer } from './src/private_peer.ts'
export type { OriginGuardConfig, PublicOrigin, UnsafeRequestHeaders } from './src/types.ts'
