import { parseOrigins, resolvePublicOrigin } from '../../../../../index.js'
import env from './env.js'

export const originGuardConfig = {
  publicOrigin: resolvePublicOrigin(env.get('APP_URL'), env.get('NODE_ENV'), 'APP_URL').origin,
  allowedOrigins: parseOrigins(env.get('CORS_ORIGINS', '')),
}
