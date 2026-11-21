import { ServerFactory } from '@adonisjs/core/factories/http'
import type { ApplicationService } from '@adonisjs/core/types'

export default class ServerProvider {
  constructor(private app: ApplicationService) {}

  register() {
    this.app.container.singleton('server', () =>
      new ServerFactory().merge({ app: this.app }).create()
    )
  }
}
