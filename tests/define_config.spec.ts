import { InvalidArgumentsException } from '@adonisjs/core/exceptions'
import { test } from '@japa/runner'
import { defineConfig } from '../index.ts'

test.group('defineConfig', () => {
  const options = { publicOrigin: 'https://app.example', environment: 'production' } as const

  test('defaults to trusting no additional origins', ({ assert }) => {
    assert.deepEqual(defineConfig(options), {
      publicOrigin: 'https://app.example',
      allowedOrigins: [],
    })
  })

  test('normalizes the additional trusted origins', ({ assert }) => {
    assert.deepEqual(
      defineConfig({
        ...options,
        allowedOrigins: ' HTTPS://ADMIN.EXAMPLE:443/, ,http://localhost:5173 ',
      }),
      {
        publicOrigin: 'https://app.example',
        allowedOrigins: ['https://admin.example', 'http://localhost:5173'],
      }
    )
  })

  test('rejects an unsupported environment', ({ assert }) => {
    assert.throws(
      () => {
        // @ts-expect-error JavaScript callers can supply an unsupported environment.
        defineConfig({ ...options, environment: 'staging' })
      },
      InvalidArgumentsException,
      'config/origin_guard.ts environment must be development, production or test'
    )
  })

  test('rejects a non-string allowlist', ({ assert }) => {
    assert.throws(
      () => {
        // @ts-expect-error JavaScript callers can supply the wrong type.
        defineConfig({ ...options, allowedOrigins: [] })
      },
      InvalidArgumentsException,
      'config/origin_guard.ts allowedOrigins must be a string'
    )
  })
})
