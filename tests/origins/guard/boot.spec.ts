import { test } from '@japa/runner'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const fixtureRoot = new URL('./fixture/', import.meta.url)
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const bootstrap = `
  import { Ignitor } from '@adonisjs/core/ignitor'

  const appRoot = new URL(${JSON.stringify(fixtureRoot.href)})
  const kernel = new URL('./start/kernel.ts', appRoot)
  const app = new Ignitor(appRoot).tap((application) => {
    application.rcContents({
      preloads: [{ file: () => import(kernel.href), environment: ['web'] }],
    })
  }).createApp('web')

  await app.init()
  await app.boot()
  await app.start(() => console.log('HTTP_START_REACHED'))
  await app.terminate()
`

function startFixture(appUrl: string, corsOrigins: string) {
  return spawnSync(
    process.execPath,
    ['--import=@poppinss/ts-exec', '--input-type=module', '-e', bootstrap],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, APP_URL: appUrl, CORS_ORIGINS: corsOrigins, NODE_ENV: 'test' },
    }
  )
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
  })
})
