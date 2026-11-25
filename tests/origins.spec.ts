import { InvalidArgumentsException } from '@adonisjs/core/exceptions'
import { test } from '@japa/runner'
import { parseOrigins, resolvePublicOrigin } from '../index.ts'

test.group('parseOrigins', () => {
  test('returns each entry in serialized form and skips blanks', ({ assert }) => {
    assert.deepEqual(parseOrigins(''), [])
    assert.deepEqual(
      parseOrigins(' https://wayne.example , ,HTTPS://WAYNE.EXAMPLE:443/,HTTP://LOCALHOST:5173/ '),
      ['https://wayne.example', 'https://wayne.example', 'http://localhost:5173']
    )
  })

  test('refuses a wildcard', ({ assert }) => {
    assert.throws(
      () => parseOrigins('https://wayne.example,*'),
      InvalidArgumentsException,
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
        InvalidArgumentsException,
        'Invalid CORS origin at position 1: expected a bare HTTP(S) origin'
      )
    }
  })

  test('reports the entry position without echoing invalid values', ({ assert }) => {
    const rejected = 'https://user:dummy-secret@wayne.example?token=dummy-query'
    let thrown: unknown
    try {
      parseOrigins(`https://wayne.example, , ${rejected}`)
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, InvalidArgumentsException)
    const message = (thrown as InvalidArgumentsException).message
    assert.include(message, 'Invalid CORS origin at position 3:')
    assert.notInclude(message, rejected)
    assert.notInclude(message, 'dummy-secret')
    assert.notInclude(message, 'dummy-query')
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
        InvalidArgumentsException,
        'APP_URL: public production origins require HTTPS'
      )
    }
  })

  test('refuses plain HTTP outside loopback', ({ assert }) => {
    for (const value of ['http://wayne.example', 'http://127.0.0.2'])
      assert.throws(
        () => resolvePublicOrigin(value, 'test', 'PUBLIC_URL'),
        InvalidArgumentsException,
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
        InvalidArgumentsException,
        'PUBLIC_URL must be a bare HTTP(S) origin'
      )
  })
})
