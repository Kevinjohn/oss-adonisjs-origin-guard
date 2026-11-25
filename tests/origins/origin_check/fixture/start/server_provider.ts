import { ServerFactory } from '@adonisjs/core/factories/http'
import type { ApplicationService } from '@adonisjs/core/types'

export default class ServerProvider {
  #app: ApplicationService

  constructor(app: ApplicationService) {
    this.#app = app
  }

  register() {
    this.#app.container.singleton('server', () =>
      new ServerFactory().merge({ app: this.#app }).create()
    )
  }
}
