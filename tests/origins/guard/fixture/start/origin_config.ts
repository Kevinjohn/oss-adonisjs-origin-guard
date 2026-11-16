import { resolvePublicOrigin } from '../../../../../index.js'

export function loadOriginConfig(value: string) {
  return resolvePublicOrigin(value, 'test', 'APP_URL')
}
