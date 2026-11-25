import { defineConfig, drivers } from '@adonisjs/core/encryption'

export default defineConfig({
  default: 'gcm',
  list: {
    gcm: drivers.aes256gcm({ id: 'gcm', keys: ['fixture-key-not-used-outside-this-test'] }),
  },
})
