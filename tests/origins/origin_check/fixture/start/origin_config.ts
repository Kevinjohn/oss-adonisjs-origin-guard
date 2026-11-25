import { parseOrigins, resolvePublicOrigin } from '../../../../../index.ts'
import env from './env.ts'

export const originCheckConfig = {
  publicOrigin: resolvePublicOrigin(env.get('APP_URL'), env.get('NODE_ENV'), 'APP_URL').origin,
  allowedOrigins: parseOrigins(env.get('CORS_ORIGINS', '')),
}
