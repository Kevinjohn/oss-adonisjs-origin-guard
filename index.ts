export { parseOrigins, resolvePublicOrigin } from './src/origins.js'
export type { PublicOrigin } from './src/origins.js'
export {
  createOriginGuard,
  createOriginGuard as createOriginCheck,
  isTrustedUnsafeOrigin,
} from './src/origin_check.js'
export type { OriginGuardConfig, UnsafeRequestHeaders } from './src/origin_check.js'
export { isPrivatePeer } from './src/private_peer.js'
