export { configure } from './configure.ts'
export { stubsRoot } from './stubs/main.ts'
export { defineConfig } from './src/define_config.ts'
export { parseOrigins, resolvePublicOrigin } from './src/origins.ts'
export { isTrustedUnsafeOrigin } from './src/origin_check.ts'
export { isPrivatePeer } from './src/private_peer.ts'
export type {
  OriginGuardConfig,
  OriginGuardOptions,
  PublicOrigin,
  UnsafeRequestHeaders,
} from './src/types.ts'
