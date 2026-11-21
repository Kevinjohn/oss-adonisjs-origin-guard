import { test } from '@japa/runner'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const fixtureRoot = new URL('./fixture/', import.meta.url)
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const bootstrap = `
  import { createServer } from 'node:http'
  import { Ignitor } from '@adonisjs/core'
  const appRoot = new URL(${JSON.stringify(fixtureRoot.href)})
  const kernel = new URL('./start/kernel.ts', appRoot)
  const serverProvider = new URL('./start/server_provider.ts', appRoot)
  const app = new Ignitor(appRoot).tap((application) => {
    application.rcContents({
      providers: [() => import(serverProvider.href)],
      preloads: [{ file: () => import(kernel.href), environment: ['web'] }],
    })
  }).createApp('web')

  await app.init()
  await app.boot()
  await app.start(async () => {
    const server = await app.container.make('server')
    await server.boot()

    const httpServer = createServer(server.handle.bind(server))
    await new Promise((resolve, reject) => {
      httpServer.once('error', reject)
      httpServer.listen(0, '127.0.0.1', resolve)
    })

    const { port } = httpServer.address()
    console.log('HTTP_START_REACHED')
    try {
      const refused = await fetch('http://127.0.0.1:' + port + '/write', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      })
      const accepted = await fetch('http://127.0.0.1:' + port + '/write', {
        method: 'POST',
        headers: { origin: 'https://trusted.example' },
      })
      console.log(
        'GUARD_RESULTS',
        JSON.stringify({
          refused: refused.status,
          refusedBody: await refused.json(),
          accepted: accepted.status,
          acceptedBody: await accepted.text(),
        })
      )
    } finally {
      await new Promise((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve()))
      )
    }
  })
  await app.terminate()
`

function startFixture(appUrl: string, corsOrigins: string) {
  const result = spawnSync(
    process.execPath,
    ['--import=@poppinss/ts-exec', '--input-type=module', '-e', bootstrap],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, APP_URL: appUrl, CORS_ORIGINS: corsOrigins, NODE_ENV: 'test' },
      timeout: 10_000,
      killSignal: 'SIGKILL',
    }
  )
  if (result.error)
    throw new Error(`Could not complete Adonis startup fixture: ${result.error.message}`)
  return result
}

test.group('eager origin validation during Adonis startup', () => {
  test('stops startup when APP_URL is invalid', ({ assert }) => {
    const result = startFixture('http://app.example', '')

    assert.notEqual(result.status, 0)
    assert.notInclude(result.stdout, 'HTTP_START_REACHED')
    assert.include(result.stderr, 'APP_URL must use HTTPS outside loopback in development/test')
  })

  test('stops startup for invalid CORS_ORIGINS when APP_URL is valid', ({ assert }) => {
    const result = startFixture('https://app.example', 'https://user:dummy-secret@trusted.example')

    assert.notEqual(result.status, 0)
    assert.notInclude(result.stdout, 'HTTP_START_REACHED')
    assert.include(result.stderr, 'Invalid CORS origin')
  })

  test('starts when both APP_URL and CORS_ORIGINS are valid', ({ assert }) => {
    const result = startFixture('https://app.example', 'https://trusted.example')

    assert.equal(result.status, 0, result.stderr)
    assert.include(result.stdout, 'HTTP_START_REACHED')
    assert.include(
      result.stdout,
      'GUARD_RESULTS {"refused":403,"refusedBody":{"error":"Cross-site request rejected."},"accepted":200,"acceptedBody":"guard reached"}'
    )
  })
})
