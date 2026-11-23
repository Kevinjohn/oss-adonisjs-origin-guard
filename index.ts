export { parseOrigins, resolvePublicOrigin } from './src/origins.js'
export {
  createOriginGuard,
  createOriginGuard as createOriginCheck,
  isTrustedUnsafeOrigin,
} from './src/origin_check.js'
export { isPrivatePeer } from './src/private_peer.js'
export type { OriginGuardConfig, PublicOrigin, UnsafeRequestHeaders } from './src/types.js'
