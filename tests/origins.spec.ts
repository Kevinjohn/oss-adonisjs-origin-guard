import { test } from '@japa/runner'
import { parseOrigins, resolvePublicOrigin } from '../index.js'

test.group('parseOrigins', () => {
  test('returns each entry in serialized form and skips blanks', ({ assert }) => {
    assert.deepEqual(parseOrigins(''), [])
    assert.deepEqual(parseOrigins(' https://wayne.example , ,HTTP://LOCALHOST:5173/ '), [
      'https://wayne.example',
      'http://localhost:5173',
    ])
  })

  test('refuses a wildcard', ({ assert }) => {
    assert.throws(
      () => parseOrigins('https://wayne.example,*'),
      'CORS requires explicit origins when credentials are enabled'
    )
  })

  test('refuses anything that is not a bare HTTP(S) origin', ({ assert }) => {
    for (const invalid of [
      'https://wayne.example/path',
      'https://user@wayne.example',
      'https://user:secret@wayne.example',
      'https://wayne.example?query',
      'https://wayne.example#fragment',
      'ftp://wayne.example',
      'wayne.example',
    ]) {
      assert.throws(
        () => parseOrigins(invalid),
        `Invalid CORS origin ${JSON.stringify(invalid)}: expected a bare HTTP(S) origin`
      )
    }
  })
})

test.group('resolvePublicOrigin', () => {
  test('accepts HTTPS in every environment', ({ assert }) => {
    for (const environment of ['production', 'development', 'test'] as const)
      assert.deepEqual(resolvePublicOrigin('https://wayne.example', environment, 'APP_URL'), {
        origin: 'https://wayne.example',
        secure: true,
      })
  })

  test('accepts plain HTTP on loopback outside production only', ({ assert }) => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      const origin = `http://${host}:8787`
      for (const environment of ['development', 'test'] as const)
        assert.deepEqual(resolvePublicOrigin(origin, environment, 'APP_URL'), {
          origin,
          secure: false,
        })
      assert.throws(
        () => resolvePublicOrigin(origin, 'production', 'APP_URL'),
        'APP_URL: public production origins require HTTPS'
      )
    }
  })

  test('refuses plain HTTP outside loopback', ({ assert }) => {
    for (const value of ['http://wayne.example', 'http://127.0.0.2'])
      assert.throws(
        () => resolvePublicOrigin(value, 'test', 'PUBLIC_URL'),
        'PUBLIC_URL must use HTTPS outside loopback in development/test'
      )
  })

  test('refuses a value that is not a bare HTTP(S) origin', ({ assert }) => {
    for (const value of [
      '',
      'garbage',
      'ftp://localhost',
      'https://wayne.example/',
      'https://user:password@wayne.example',
      'https://wayne.example/path',
      'https://wayne.example?query',
      'https://wayne.example#fragment',
    ])
      assert.throws(
        () => resolvePublicOrigin(value, 'test', 'PUBLIC_URL'),
        'PUBLIC_URL must be a bare HTTP(S) origin'
      )
  })
})
