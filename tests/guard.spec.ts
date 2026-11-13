import { test } from '@japa/runner'
import { HttpContextFactory, RequestFactory } from '@adonisjs/core/factories/http'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createOriginGuard, isTrustedUnsafeOrigin } from '../index.js'

const config = {
  publicOrigin: 'https://wayne.example',
  allowedOrigins: ['http://localhost:5173'],
}

const cases: { name: string; headers: Record<string, string>; trusted: boolean }[] = [
  { name: 'admits the public origin', headers: { origin: 'https://wayne.example' }, trusted: true },
  {
    name: 'admits an allowed origin',
    headers: { origin: 'http://localhost:5173' },
    trusted: true,
  },
  {
    name: 'admits a same-origin fetch without Origin',
    headers: { 'sec-fetch-site': 'same-origin' },
    trusted: true,
  },
  { name: 'refuses a write with neither Origin nor Sec-Fetch-Site', headers: {}, trusted: false },
  {
    name: 'refuses a same-site write without Origin',
    headers: { 'sec-fetch-site': 'same-site' },
    trusted: false,
  },
  {
    name: 'refuses an Origin that only matches after normalising',
    headers: { origin: 'HTTPS://WAYNE.EXAMPLE/' },
    trusted: false,
  },
  {
    name: 'refuses a mismatched Origin despite Sec-Fetch-Site same-origin',
    headers: { 'origin': 'https://lexcorp.example', 'sec-fetch-site': 'same-origin' },
    trusted: false,
  },
  {
    name: 'refuses a hostile Origin matched by a spoofed Host',
    headers: { origin: 'https://lexcorp.example', host: 'lexcorp.example' },
    trusted: false,
  },
  {
    name: 'refuses an http Origin for the https public host',
    headers: { origin: 'http://wayne.example' },
    trusted: false,
  },
]

function context(method: string, headers: Record<string, string>) {
  const req = new IncomingMessage(new Socket())
  req.method = method
  req.url = '/heroes'
  req.headers = headers
  const res = new ServerResponse(req)
  return new HttpContextFactory()
    .merge({ request: new RequestFactory().merge({ req, res }).create() })
    .create()
}

test.group('isTrustedUnsafeOrigin', () => {
  test('{name}')
    .with(cases)
    .run(({ assert }, { headers, trusted }) => {
      assert.equal(
        isTrustedUnsafeOrigin(
          { origin: headers.origin, fetchSite: headers['sec-fetch-site'] },
          config
        ),
        trusted
      )
    })

  test('trusts only the public origin when no allowed origins are configured', ({ assert }) => {
    const only = { publicOrigin: 'https://wayne.example' }
    assert.isTrue(isTrustedUnsafeOrigin({ origin: 'https://wayne.example' }, only))
    assert.isFalse(isTrustedUnsafeOrigin({ origin: 'http://localhost:5173' }, only))
  })
})

test.group('createOriginGuard', () => {
  const Guard = createOriginGuard(config)

  test('POST {name}')
    .with(cases)
    .run(async ({ assert }, { headers, trusted }) => {
      const ctx = context('POST', headers)
      let reached = false
      await new Guard().handle(ctx, async () => {
        reached = true
      })
      assert.equal(reached, trusted)
      if (!trusted) {
        assert.equal(ctx.response.getStatus(), 403)
        assert.deepEqual(ctx.response.getBody(), { error: 'Cross-site request rejected.' })
      }
    })

  test('lets {$self} through without checking headers')
    .with(['GET', 'HEAD', 'OPTIONS'])
    .run(async ({ assert }, method) => {
      let reached = false
      await new Guard().handle(context(method, { origin: 'https://lexcorp.example' }), async () => {
        reached = true
      })
      assert.isTrue(reached)
    })

  test('guards {$self}')
    .with(['PUT', 'PATCH', 'DELETE'])
    .run(async ({ assert }, method) => {
      const ctx = context(method, { origin: 'https://lexcorp.example' })
      let reached = false
      await new Guard().handle(ctx, async () => {
        reached = true
      })
      assert.isFalse(reached)
      assert.equal(ctx.response.getStatus(), 403)
    })
})
