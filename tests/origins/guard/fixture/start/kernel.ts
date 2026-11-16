import { originGuardConfig } from './origin_config.js'

export const configuredOrigins = originGuardConfig
export const loadOriginGuard = () => import('./middleware.js')
