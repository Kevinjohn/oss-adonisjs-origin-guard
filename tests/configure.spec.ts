import { test } from '@japa/runner'
import { FileSystem } from '@japa/file-system'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageName = '@kevinjohn/adonisjs-origin-guard'
const middlewarePath = `${packageName}/origin_guard_middleware`
const fixtureRoot = new URL('./fixtures/application/', import.meta.url)
const nodeModules = fileURLToPath(new URL('../node_modules/', import.meta.url))
const loader = import.meta.resolve('@poppinss/ts-exec')

const refusal = { status: 403, body: '{"error":"Cross-site request rejected."}' }
const reached = { status: 200, body: 'handler reached' }

function prepareApplication(appPath: string) {
  cpSync(fixtureRoot, appPath, { recursive: true })
  writeFileSync(
    join(appPath, 'package.json'),
    JSON.stringify({
      type: 'module',
      imports: { '#start/*': './start/*.js' },
    })
  )
  writeFileSync(
    join(appPath, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        rewriteRelativeImportExtensions: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    })
  )
  writeFileSync(join(appPath, '.env'), 'NODE_ENV=test\n')
  writeFileSync(join(appPath, '.env.example'), 'NODE_ENV=test\n')
  mkdirSync(join(appPath, 'node_modules/@adonisjs'), { recursive: true })
  for (const dependency of ['core', 'assembler']) {
    symlinkSync(
      join(nodeModules, '@adonisjs', dependency),
      join(appPath, 'node_modules/@adonisjs', dependency),
      'dir'
    )
  }

  symlinkSync(
    join(nodeModules, 'reflect-metadata'),
    join(appPath, 'node_modules/reflect-metadata'),
    'dir'
  )

  // Resolve the package entry points through the host's normal imports while testing source.
  const packagePath = join(appPath, 'node_modules', packageName)
  mkdirSync(packagePath, { recursive: true })
  writeFileSync(
    join(packagePath, 'package.json'),
    JSON.stringify({
      type: 'module',
      exports: { '.': './index.mjs', './origin_guard_middleware': './origin_guard_middleware.mjs' },
    })
  )
  writeFileSync(
    join(packagePath, 'index.mjs'),
    `export * from '${new URL('../index.ts', import.meta.url).href}'\n`
  )
  writeFileSync(
    join(packagePath, 'origin_guard_middleware.mjs'),
    `export { default } from '${new URL('../src/origin_guard_middleware.ts', import.meta.url).href}'\n`
  )
}

function runFixture(appPath: string, args: string[], settings: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'test' }
  for (const key of ['ORIGIN_GUARD_PUBLIC_ORIGIN', 'ORIGIN_GUARD_ALLOWED_ORIGINS', 'ENV_PATH']) {
    delete env[key]
  }
  const result = spawnSync(process.execPath, [`--import=${loader}`, ...args], {
    cwd: appPath,
    encoding: 'utf8',
    env: { ...env, ...settings },
    timeout: 10_000,
    killSignal: 'SIGKILL',
  })
  if (result.error) throw result.error
  return result
}

function startFixture(
  appPath: string,
  publicOrigin: string,
  allowedOrigins?: string,
  environment = 'web'
) {
  return runFixture(appPath, ['boot.ts', environment], {
    ORIGIN_GUARD_PUBLIC_ORIGIN: publicOrigin,
    ...(allowedOrigins === undefined ? {} : { ORIGIN_GUARD_ALLOWED_ORIGINS: allowedOrigins }),
  })
}

function writeResults(stdout: string) {
  const line = stdout.split('\n').find((output) => output.startsWith('WRITE_RESULTS '))
  return line ? JSON.parse(line.slice('WRITE_RESULTS '.length)) : undefined
}

test.group('Ace configure and AdonisJS startup', (group) => {
  let appPath: string
  const read = (path: string) => readFileSync(join(appPath, path), 'utf8')

  const configure = () => runFixture(appPath, ['ace.ts', 'configure', packageName])

  let fs: FileSystem
  group.setup(async () => {
    appPath = mkdtempSync(join(tmpdir(), 'origin-guard-test-'))
    fs = new FileSystem(appPath)
    try {
      prepareApplication(appPath)
      const first = configure()
      if (first.status !== 0) throw new Error(first.stderr || first.stdout)
    } catch (error) {
      await fs.cleanup()
      throw error
    }
    return () => fs.cleanup()
  })

  test('configures a scratch application and preserves changes when rerun', async ({ assert }) => {
    const config = await fs.contents('config/origin_guard.ts')
    assert.include(config, 'export default defineConfig({')
    assert.include(config, "env.get('ORIGIN_GUARD_PUBLIC_ORIGIN')")
    assert.include(config, "env.get('ORIGIN_GUARD_ALLOWED_ORIGINS')")
    const envSchema = read('start/env.ts')
    assert.include(envSchema, 'ORIGIN_GUARD_PUBLIC_ORIGIN: Env.schema.string()')
    assert.include(envSchema, 'ORIGIN_GUARD_ALLOWED_ORIGINS: Env.schema.string.optional()')
    const kernel = read('start/kernel.ts')
    assert.include(kernel, middlewarePath)
    for (const path of ['.env', '.env.example']) {
      assert.include(read(path), 'ORIGIN_GUARD_PUBLIC_ORIGIN=')
      assert.include(read(path), 'ORIGIN_GUARD_ALLOWED_ORIGINS=')
    }

    const hostConfig = `// Host-owned config\n${config}`
    const hostEnv = 'NODE_ENV=test\nORIGIN_GUARD_PUBLIC_ORIGIN=https://app.example\n'
    writeFileSync(join(appPath, 'config/origin_guard.ts'), hostConfig)
    writeFileSync(join(appPath, '.env'), hostEnv)
    const second = configure()
    assert.equal(second.status, 0, second.stderr || second.stdout)
    assert.equal(read('start/kernel.ts'), kernel)
    assert.equal(read('start/env.ts'), envSchema)
    assert.equal(read('config/origin_guard.ts'), hostConfig)
    assert.equal(read('.env'), hostEnv)
    writeFileSync(join(appPath, '.env'), 'NODE_ENV=test\n')
  })

  test('stops web startup when the public origin is invalid', ({ assert }) => {
    const result = startFixture(appPath, 'http://app.example', '')
    assert.notEqual(result.status, 0)
    assert.notInclude(result.stdout, 'HTTP_START_REACHED')
    assert.include(
      result.stderr,
      'config/origin_guard.ts publicOrigin must use HTTPS outside loopback'
    )
  })

  test('stops web startup for an invalid allowlist without disclosing its contents', ({
    assert,
  }) => {
    const result = startFixture(
      appPath,
      'https://app.example',
      'https://user:dummy-secret@trusted.example'
    )
    assert.notEqual(result.status, 0)
    assert.notInclude(result.stdout, 'HTTP_START_REACHED')
    assert.include(
      result.stderr,
      'config/origin_guard.ts allowedOrigins: Invalid CORS origin at position 1'
    )
    assert.notInclude(result.stderr, 'dummy-secret')
  })

  test('stops web startup for a wildcard allowed origin', ({ assert }) => {
    const result = startFixture(appPath, 'https://app.example', 'https://trusted.example,*')
    assert.notEqual(result.status, 0)
    assert.notInclude(result.stdout, 'HTTP_START_REACHED')
    assert.include(
      result.stderr,
      'config/origin_guard.ts allowedOrigins: CORS requires explicit origins'
    )
  })

  test('serves requests through the registered middleware with valid settings', ({ assert }) => {
    const result = startFixture(appPath, 'https://app.example', 'https://trusted.example')
    assert.equal(result.status, 0, result.stderr)
    assert.include(result.stdout, 'HTTP_START_REACHED')
    assert.deepEqual(writeResults(result.stdout), {
      foreign: refusal,
      listed: reached,
      public: reached,
    })
  })

  test('trusts no additional origins when the allowlist is omitted', ({ assert }) => {
    const fixtureEnv = read('.env')
    writeFileSync(join(appPath, '.env'), 'NODE_ENV=test\n')
    const result = startFixture(appPath, 'https://app.example')
    writeFileSync(join(appPath, '.env'), fixtureEnv)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(writeResults(result.stdout), {
      foreign: refusal,
      listed: refusal,
      public: reached,
    })
  })

  test('validates configuration when a console process boots the application', ({ assert }) => {
    const invalid = startFixture(appPath, 'http://app.example', undefined, 'console')
    assert.notEqual(invalid.status, 0)
    assert.notInclude(invalid.stdout, 'CONSOLE_START_REACHED')
    assert.include(
      invalid.stderr,
      'config/origin_guard.ts publicOrigin must use HTTPS outside loopback'
    )

    const valid = startFixture(appPath, 'https://app.example', undefined, 'console')
    assert.equal(valid.status, 0, valid.stderr)
    assert.include(valid.stdout, 'CONSOLE_START_REACHED')
    assert.notInclude(valid.stdout, 'HTTP_START_REACHED')
  })
})
