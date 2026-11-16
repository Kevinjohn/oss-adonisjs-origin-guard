import { loadOriginConfig } from './origin_config.js'

loadOriginConfig(process.env.APP_URL ?? '')
