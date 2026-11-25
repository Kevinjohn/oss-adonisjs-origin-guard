import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ExistingMiddleware {
  async handle({ response }: HttpContext, next: NextFn) {
    response.header('x-existing-middleware', 'reached')
    return next()
  }
}
