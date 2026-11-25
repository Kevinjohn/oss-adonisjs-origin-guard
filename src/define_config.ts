import { InvalidArgumentsException } from '@adonisjs/core/exceptions'
import { parseOriginList, resolvePublicOrigin } from './origins.ts'
import type { OriginGuardConfig, OriginGuardOptions } from './types.ts'

/**
 * Validates the host's write origins when AdonisJS loads `config/origin_guard.ts`.
 * The public origin must be canonical. A comma-separated allowlist is optional.
 *
 * @example
 * ```ts
 * import env from '#start/env'
 * import { defineConfig } from '@kevinjohn/adonisjs-origin-guard'
 *
 * export default defineConfig({
 *   publicOrigin: env.get('ORIGIN_GUARD_PUBLIC_ORIGIN'),
 *   allowedOrigins: env.get('ORIGIN_GUARD_ALLOWED_ORIGINS'),
 *   environment: env.get('NODE_ENV'),
 * })
 * ```
 */
export function defineConfig(options: OriginGuardOptions): OriginGuardConfig {
  const { publicOrigin, allowedOrigins = '', environment } = options
  if (!['development', 'production', 'test'].includes(environment)) {
    throw new InvalidArgumentsException(
      'config/origin_guard.ts environment must be development, production or test'
    )
  }

  const { origin } = resolvePublicOrigin(
    publicOrigin,
    environment,
    'config/origin_guard.ts publicOrigin'
  )
  if (typeof allowedOrigins !== 'string') {
    throw new InvalidArgumentsException('config/origin_guard.ts allowedOrigins must be a string')
  }
  return {
    publicOrigin: origin,
    allowedOrigins: parseOriginList(allowedOrigins, 'config/origin_guard.ts allowedOrigins: '),
  }
}
