import { inject } from '@adonisjs/core'
// The container uses this class at runtime through emitted decorator metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Config } from '@adonisjs/core/config'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isTrustedUnsafeOrigin } from './origin_check.ts'
import type { OriginGuardConfig } from './types.ts'

/** Refuses unsafe requests whose headers do not establish a trusted write origin. */
@inject()
export default class OriginGuardMiddleware {
  #config: OriginGuardConfig | undefined

  constructor(config: Config) {
    this.#config = config.get<OriginGuardConfig>('origin_guard')
  }

  async handle({ request, response }: HttpContext, next: NextFn) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return next()

    if (
      !this.#config ||
      !isTrustedUnsafeOrigin(
        { origin: request.header('origin'), fetchSite: request.header('sec-fetch-site') },
        this.#config
      )
    ) {
      return response.forbidden({ error: 'Cross-site request rejected.' })
    }
    return next()
  }
}
