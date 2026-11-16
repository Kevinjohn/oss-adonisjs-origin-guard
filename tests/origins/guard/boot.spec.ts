import { test } from '@japa/runner'
import { Ignitor } from '@adonisjs/core/ignitor'

const appRoot = new URL('../../../', import.meta.url)
const kernel = new URL('./fixture/start/kernel.ts', import.meta.url)

test.group('eager origin validation during Adonis startup', () => {
  test('stops the application before HTTP startup when APP_URL is invalid', async ({ assert }) => {
    const previousAppUrl = process.env.APP_URL
    process.env.APP_URL = 'http://app.example'

    try {
      const app = new Ignitor(appRoot)
        .tap((application) => {
          application.rcContents({
            preloads: [
              {
                file: () => import(`${kernel.href}?invalid-${Date.now()}`),
                environment: ['web'],
              },
            ],
          })
        })
        .createApp('web')

      await app.init()
      await app.boot()

      let httpStartupReached = false
      await assert.rejects(
        () =>
          app.start(() => {
            httpStartupReached = true
          }),
        /APP_URL must use HTTPS outside loopback in development\/test/
      )

      assert.isFalse(httpStartupReached)
      assert.isFalse(app.isReady)
      await app.terminate()
    } finally {
      if (previousAppUrl === undefined) delete process.env.APP_URL
      else process.env.APP_URL = previousAppUrl
    }
  })

  test('starts the application when APP_URL is valid', async ({ assert }) => {
    const previousAppUrl = process.env.APP_URL
    process.env.APP_URL = 'https://app.example'

    try {
      const app = new Ignitor(appRoot)
        .tap((application) => {
          application.rcContents({
            preloads: [
              {
                file: () => import(`${kernel.href}?valid-${Date.now()}`),
                environment: ['web'],
              },
            ],
          })
        })
        .createApp('web')

      await app.init()
      await app.boot()

      let httpStartupReached = false
      await app.start(() => {
        httpStartupReached = true
      })

      assert.isTrue(httpStartupReached)
      assert.isTrue(app.isReady)
      await app.terminate()
    } finally {
      if (previousAppUrl === undefined) delete process.env.APP_URL
      else process.env.APP_URL = previousAppUrl
    }
  })
})
