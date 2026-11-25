import { defineConfig } from '@adonisjs/core/logger'

export default defineConfig({
  default: 'app',
  loggers: {
    app: { name: 'origin-guard-fixture', enabled: false },
  },
})
