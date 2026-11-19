import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import os from 'node:os'
import path from 'node:path'
import { test } from '@japa/runner'
import { isAlive, outputOf, waitForFile, waitForPid } from './child_process.js'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const runnerPath = path.join(repoRoot, 'bin/check_changed.ts')
const plannerPath = path.join(repoRoot, 'bin/check_changed_plan.ts')

type FixtureOptions = {
  command?: 'normal' | 'hang' | 'missing'
  hook?: 'record-term' | 'fail-reap'
  inheritedEnv?: NodeJS.ProcessEnv
  onDirectory?: (directory: string) => void
  failSetup?: boolean
}

type Fixture = {
  directory: string
  root: string
  bin: string
  log: string
  ready: string
  commandPid: string
  termSent: string
  base: string
  env: NodeJS.ProcessEnv
  child?: ChildProcess
}

async function fixture(options: FixtureOptions = {}): Promise<Fixture> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'origin-guard-check-changed-'))
  try {
    options.onDirectory?.(directory)
    if (options.failSetup) throw new Error('fixture setup failed')
    const root = path.join(directory, 'checkout')
    const bin = path.join(directory, 'bin')
    const supportBin = path.join(directory, 'support-bin')
    await mkdir(path.join(root, 'bin'), { recursive: true })
    await mkdir(bin)
    await mkdir(supportBin)
    await writeFile(path.join(root, 'bin/check_changed.ts'), await readFile(runnerPath))
    await writeFile(path.join(root, 'bin/check_changed_plan.ts'), await readFile(plannerPath))
    await writeFile(path.join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(path.join(root, 'README.md'), 'fixture baseline\n')
    await symlink(path.join(repoRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')

    const git = execFileSync('which', ['git'], { encoding: 'utf8' }).trim()
    await symlink(git, path.join(supportBin, 'git'))
    const gitEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...options.inheritedEnv,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: path.join(directory, 'empty-gitconfig'),
      GIT_CONFIG_COUNT: '0',
      GIT_CONFIG_PARAMETERS: '',
      GIT_CONFIG: path.join(directory, 'empty-gitconfig'),
    }
    for (const key of [
      'GIT_DIR',
      'GIT_WORK_TREE',
      'GIT_INDEX_FILE',
      'GIT_COMMON_DIR',
      'GIT_OBJECT_DIRECTORY',
      'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    ]) {
      delete gitEnv[key]
    }
    const runGit = (args: string[]) =>
      execFileSync(git, args, { cwd: root, env: gitEnv, stdio: 'ignore' })
    runGit(['init', '-q'])
    runGit(['config', 'user.email', 'fixture@example.test'])
    runGit(['config', 'user.name', 'Fixture'])
    runGit(['config', 'commit.gpgsign', 'false'])
    runGit(['config', 'core.hooksPath', path.join(directory, 'empty-hooks')])
    await mkdir(path.join(directory, 'empty-hooks'))
    runGit(['add', '.'])
    runGit(['commit', '-qm', 'fixture baseline'])
    const base = execFileSync(git, ['rev-parse', 'HEAD'], {
      cwd: root,
      env: gitEnv,
      encoding: 'utf8',
    }).trim()
    await writeFile(path.join(root, 'src-trigger.ts'), 'export const changed = true\n')
    runGit(['add', 'src-trigger.ts'])
    runGit(['commit', '-qm', 'select static checks'])
    const log = path.join(directory, 'commands.log')
    const ready = path.join(directory, 'descendant.pid')
    const commandPid = path.join(directory, 'command.pid')
    const termSent = path.join(directory, 'term-sent')
    await writeFile(log, '')

    await writeFile(
      path.join(root, 'worker.js'),
      `import { writeFile } from 'node:fs/promises'\nprocess.on('SIGTERM', () => {})\nawait writeFile(${JSON.stringify(ready)}, String(process.pid))\nsetInterval(() => {}, 1000)\n`
    )
    if (options.command !== 'missing') {
      const commandPath = path.join(bin, 'pnpm')
      await writeFile(
        commandPath,
        `#!${process.execPath}\nimport { spawn } from 'node:child_process'\nimport { readFile, writeFile } from 'node:fs/promises'\nconst args = process.argv.slice(2)\nawait writeFile(${JSON.stringify(commandPid)}, String(process.pid))\nawait writeFile(${JSON.stringify(log)}, (await readFile(${JSON.stringify(log)}, 'utf8')) + args.join(' ') + '\\n')\nif (process.env.CHECK_CHANGED_HANG === '1') {\n  spawn(process.execPath, ['worker.js'], { cwd: process.cwd(), stdio: 'ignore' })\n  for (let attempt = 0; attempt < 250; attempt++) {\n    if (await readFile(${JSON.stringify(ready)}, 'utf8').catch(() => '')) break\n    await new Promise((resolve) => setTimeout(resolve, 20))\n  }\n  setInterval(() => {}, 1000)\n}\n`,
        { mode: 0o755 }
      )
    }

    if (options.hook) {
      const hookPath = path.join(directory, 'process-hook.cjs')
      const recordTerm = options.hook === 'record-term'
      await writeFile(
        hookPath,
        `const original = process.kill.bind(process)\nlet killedGroup = null\nprocess.kill = (pid, signal) => {\n  if (pid < 0 && signal === 'SIGTERM') require('node:fs').writeFileSync(${JSON.stringify(termSent)}, 'yes')\n  if (pid < 0 && signal === 'SIGKILL') { killedGroup = pid; return original(pid, signal) }\n  if (${recordTerm ? 'false' : 'true'} && pid === killedGroup && signal === 0) return true\n  return original(pid, signal)\n}\n`
      )
    }

    await chmod(directory, 0o755)
    const env: NodeJS.ProcessEnv = {
      ...gitEnv,
      PATH: `${bin}${path.delimiter}${supportBin}`,
    }
    delete env.NODE_OPTIONS
    delete env.CHECK_CHANGED_HANG
    if (options.command === 'hang') env.CHECK_CHANGED_HANG = '1'
    if (options.hook) {
      env.NODE_OPTIONS =
        `${env.NODE_OPTIONS ?? ''} --require=${path.join(directory, 'process-hook.cjs')}`.trim()
    }
    return { directory, root, bin, log, ready, commandPid, termSent, base, env }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}

function launch(f: Fixture): ChildProcess {
  const child = spawn(
    process.execPath,
    ['--import=@poppinss/ts-exec', path.join(f.root, 'bin/check_changed.ts'), '--static', f.base],
    { cwd: f.root, env: f.env, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  f.child = child
  return child
}

function assertOnlyFormatCommand(log: string): void {
  assert.deepEqual(log.trimEnd().split('\n'), [
    'exec prettier --check --ignore-unknown --no-error-on-unmatched-pattern -- src-trigger.ts worker.js',
  ])
}

test('command log assertions reject later lint and typecheck invocations', () => {
  for (const command of ['lint', 'typecheck']) {
    assert.throws(() =>
      assertOnlyFormatCommand(
        `exec prettier --check --ignore-unknown --no-error-on-unmatched-pattern -- src-trigger.ts worker.js\n${command}\n`
      )
    )
  }
})

async function readOwnedPid(filePath: string): Promise<number | undefined> {
  let content: string
  try {
    content = await readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
  const value = content.trim()
  const pid = Number(value)
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(pid)) {
    throw new Error(`Invalid owned PID in ${filePath}`)
  }
  return pid
}

async function stillAlive(pids: number[], timeoutMs: number): Promise<number[]> {
  const deadline = Date.now() + timeoutMs
  while (true) {
    const alive: number[] = []
    for (const pid of pids) if (await isAlive(pid)) alive.push(pid)
    if (alive.length === 0 || Date.now() >= deadline) return alive
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

async function cleanupFixture(f: Fixture): Promise<void> {
  const failures: unknown[] = []
  const readPid = async (filePath: string): Promise<number | undefined> => {
    try {
      return await readOwnedPid(filePath)
    } catch (error) {
      failures.push(error)
      return undefined
    }
  }
  const commandPid = await readPid(f.commandPid)
  const workerPid = await readPid(f.ready)
  const runnerPid = f.child?.pid
  const pids = [runnerPid, commandPid, workerPid].filter((pid): pid is number => pid !== undefined)
  const signal = (pid: number, name: NodeJS.Signals): void => {
    try {
      process.kill(pid, name)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') failures.push(error)
    }
  }

  let alive = await stillAlive(pids, 0)
  if (runnerPid && alive.includes(runnerPid)) signal(runnerPid, 'SIGTERM')
  if (
    commandPid &&
    process.platform !== 'win32' &&
    (alive.includes(commandPid) || (workerPid && alive.includes(workerPid)))
  )
    signal(-commandPid, 'SIGTERM')
  if (workerPid && alive.includes(workerPid)) signal(workerPid, 'SIGTERM')
  alive = await stillAlive(pids, 500)
  if (alive.length > 0) {
    if (commandPid && process.platform !== 'win32') signal(-commandPid, 'SIGKILL')
    if (workerPid) signal(workerPid, 'SIGKILL')
    if (runnerPid) signal(runnerPid, 'SIGKILL')
    alive = await stillAlive(pids, 1000)
    if (alive.length > 0)
      failures.push(new Error(`Owned processes did not exit: ${alive.join(', ')}`))
  }
  f.child?.stdout?.destroy()
  f.child?.stderr?.destroy()
  f.child?.unref()
  try {
    await rm(f.directory, { recursive: true, force: true })
  } catch (error) {
    failures.push(error)
  }
  if (failures.length) throw new AggregateError(failures, 'Fixture cleanup failed')
}

test('runs selected static checks normally and observes a missing command spawn error', async ({
  cleanup,
}) => {
  const normal = await fixture()
  cleanup(() => cleanupFixture(normal))
  const normalChild = launch(normal)
  const normalOutput = outputOf(normalChild)
  const normalResult = await normalOutput
  assert.equal(normalResult.code, 0, normalResult.text)
  assert.match(normalResult.text, /pass format/)
  assert.match(await readFile(normal.log, 'utf8'), /exec prettier --check/)

  const missing = await fixture({ command: 'missing' })
  cleanup(() => cleanupFixture(missing))
  const missingChild = launch(missing)
  const missingOutput = outputOf(missingChild)
  const missingResult = await missingOutput
  assert.equal(missingResult.code, 1, missingResult.text)
  assert.match(missingResult.text, /spawn failed: spawn pnpm ENOENT/)
  assert.doesNotMatch(missingResult.text, /UnhandledPromiseRejection|unhandledRejection/)
}).timeout(30_000)

test('TERM-resistant descendants receive KILL, are reaped, and block later selected checks', async ({
  cleanup,
}) => {
  const f = await fixture({ command: 'hang' })
  cleanup(() => cleanupFixture(f))
  const child = launch(f)
  const output = outputOf(child)
  const descendantPid = await waitForPid(f.ready)
  child.kill('SIGTERM')
  const result = await output
  assert.equal(result.code, 143, result.text)
  assert.match(result.text, /fail format \(exit killed\)/)
  assertOnlyFormatCommand(await readFile(f.log, 'utf8'))
  assert.equal(await isAlive(descendantPid), false)
  assert.doesNotMatch(result.text, /UnhandledPromiseRejection|unhandledRejection/)
}).timeout(20_000)

test('a second signal escalates immediately while the first signal determines the exit code', async ({
  cleanup,
}) => {
  const f = await fixture({ command: 'hang', hook: 'record-term' })
  cleanup(() => cleanupFixture(f))
  const child = launch(f)
  const output = outputOf(child)
  const descendantPid = await waitForPid(f.ready)
  child.kill('SIGTERM')
  await waitForFile(f.termSent)
  child.kill('SIGINT')
  const result = await output
  assert.equal(result.code, 143, result.text)
  assert.equal(await isAlive(descendantPid), false)
  assertOnlyFormatCommand(await readFile(f.log, 'utf8'))
}).timeout(15_000)

test('reports failed final reap and retains the first signal result', async ({ cleanup }) => {
  const f = await fixture({ command: 'hang', hook: 'fail-reap' })
  cleanup(() => cleanupFixture(f))
  const child = launch(f)
  const output = outputOf(child)
  await waitForPid(f.ready)
  child.kill('SIGTERM')
  const result = await output
  assert.equal(result.code, 143, result.text)
  assert.match(result.text, /cleanup failed:.*did not exit after SIGKILL/s)
  assertOnlyFormatCommand(await readFile(f.log, 'utf8'))
  assert.doesNotMatch(result.text, /UnhandledPromiseRejection|unhandledRejection/)
}).timeout(20_000)

test('interrupt settles a never-closing owned child and releases its live local handles', async ({
  cleanup,
}) => {
  const f = await fixture()
  cleanup(() => cleanupFixture(f))
  const hook = path.join(f.directory, 'never-close.cjs')
  await writeFile(
    hook,
    `
const cp = require('node:child_process')
const { EventEmitter } = require('node:events')
const { PassThrough } = require('node:stream')
cp.spawn = () => {
 const child = new EventEmitter(); child.pid = 99999999; child.exitCode = child.signalCode = null
 child.stdout = new PassThrough(); child.stderr = new PassThrough()
 const liveHandle = setInterval(() => {}, 1000)
 child.unref = () => { clearInterval(liveHandle); console.log('LOCAL_HANDLE_RELEASED') }
 setImmediate(() => { child.stdout.write('partial output'); process.emit('SIGTERM') })
 return child
}
process.kill = () => true
let clock = 0; Date.now = () => (clock += 6000)
require('node:module').syncBuiltinESMExports()
`
  )
  f.env.NODE_OPTIONS = `${f.env.NODE_OPTIONS ?? ''} --require=${hook}`
  const child = launch(f)
  const output = outputOf(child)
  const result = await output
  assert.equal(result.code, 143, result.text)
  assert.match(result.text, /did not exit after SIGKILL/)
  assert.match(result.text, /partial output/)
  assert.match(result.text, /LOCAL_HANDLE_RELEASED/)
  assert.equal(await readFile(f.log, 'utf8'), '')
}).timeout(10_000)

test('exit collector registers before exit and includes output drained before close', async () => {
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const child = Object.assign(new EventEmitter(), {
    stdout,
    stderr,
  }) as unknown as ChildProcess
  const result = outputOf(child)
  child.emit('exit', 0, null)
  stdout.write('last stdout')
  stderr.write(' and stderr')
  child.emit('close', 0, null)
  assert.deepEqual(await result, { code: 0, signal: null, text: 'last stdout and stderr' })
})

test('PID readiness waits for a complete record and preserves read errors', async ({ cleanup }) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'origin-guard-pid-readiness-'))
  cleanup(() => rm(directory, { recursive: true, force: true }))
  const pidFile = path.join(directory, 'pid')
  await writeFile(pidFile, '')
  const pending = waitForPid(pidFile, 1000)
  await writeFile(pidFile, '12345')
  assert.equal(await pending, 12345)
  await assert.rejects(waitForPid(directory, 100), { code: 'EISDIR' })
})

test('fixture removes its directory when setup fails', async () => {
  let directory: string | undefined
  await assert.rejects(
    fixture({
      onDirectory: (value) => (directory = value),
      failSetup: true,
    }),
    /fixture setup failed/
  )
  assert.ok(directory)
  await assert.rejects(readFile(directory, 'utf8'), { code: 'ENOENT' })
})

test('fixture ignores hostile inherited Git configuration and Node preloads', async ({
  cleanup,
}) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'origin-guard-hostile-settings-'))
  cleanup(() => rm(directory, { recursive: true, force: true }))
  const hooks = path.join(directory, 'hooks')
  await mkdir(hooks)
  await writeFile(path.join(hooks, 'pre-commit'), '#!/bin/sh\nexit 1\n', { mode: 0o755 })
  const globalConfig = path.join(directory, 'global-gitconfig')
  await writeFile(globalConfig, `[commit]\n gpgsign = true\n[core]\n hooksPath = ${hooks}\n`)
  const preload = path.join(directory, 'poison.cjs')
  await writeFile(preload, `throw new Error('unexpected inherited preload')\n`)
  const f = await fixture({
    inheritedEnv: {
      GIT_CONFIG_GLOBAL: globalConfig,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'commit.gpgsign',
      GIT_CONFIG_VALUE_0: 'true',
      NODE_OPTIONS: `--require=${preload}`,
    },
  })
  cleanup(() => cleanupFixture(f))
  const result = await outputOf(launch(f))
  assert.equal(result.code, 0, result.text)
  const log = await readFile(f.log, 'utf8')
  assert.deepEqual(log.trimEnd().split('\n'), [
    'exec prettier --check --ignore-unknown --no-error-on-unmatched-pattern -- src-trigger.ts worker.js',
    'lint',
    'typecheck',
  ])
})

for (const signalFails of [false, true]) {
  test(`timeout settles a nonclosing child when signal delivery ${signalFails ? 'fails' : 'succeeds'}`, async ({
    cleanup,
  }) => {
    const f = await fixture()
    cleanup(() => cleanupFixture(f))
    const hook = path.join(f.directory, 'timeout-hook.cjs')
    await writeFile(
      hook,
      `
const cp = require('node:child_process')
const { EventEmitter } = require('node:events')
const { PassThrough } = require('node:stream')
const originalTimeout = global.setTimeout
global.setTimeout = (callback, ms, ...args) => ms === 900000 ? originalTimeout(callback, 0, ...args) : originalTimeout(callback, ms, ...args)
cp.spawn = () => {
 const child = new EventEmitter(); child.pid = 99999999; child.exitCode = child.signalCode = null
 child.stdout = new PassThrough(); child.stderr = new PassThrough()
 const liveHandle = setInterval(() => {}, 1000)
 child.unref = () => { clearInterval(liveHandle); console.log('LOCAL_HANDLE_RELEASED') }
 process.nextTick(() => child.stdout.write('partial output'))
 return child
}

process.kill = (_pid, signal) => {
 if (signal === 'SIGKILL' && ${signalFails}) { const error = new Error('signal denied'); error.code = 'EPERM'; throw error }
 if (signal === 0) { const error = new Error('gone'); error.code = 'ESRCH'; throw error }
 return true
}
require('node:module').syncBuiltinESMExports()
`
    )
    f.env.NODE_OPTIONS = `--require=${hook}`
    const result = await outputOf(launch(f))
    assert.equal(result.code, 1, result.text)
    assert.match(result.text, /stopped after 15 minutes/)
    assert.match(result.text, /partial output/)
    assert.match(result.text, /LOCAL_HANDLE_RELEASED/)
    assert.equal(await readFile(f.log, 'utf8'), '')
    if (signalFails) assert.match(result.text, /timeout cleanup failed: signal denied/)
  }).timeout(10_000)
}

for (const groupExits of [true, false]) {
  test(`timeout waits for group cleanup after the child closes (group exits: ${groupExits})`, async ({
    cleanup,
  }) => {
    const f = await fixture()
    cleanup(() => cleanupFixture(f))
    const hook = path.join(f.directory, 'timeout-close-hook.cjs')
    await writeFile(
      hook,
      `
const cp = require('node:child_process')
const { EventEmitter } = require('node:events')
const { PassThrough } = require('node:stream')
const originalTimeout = global.setTimeout
const originalInterval = global.setInterval
const originalSpawn = cp.spawn
const now = Date.now
let child
let groupChecked = false
let timeoutArmed = false
global.setTimeout = (callback, ms, ...args) => {
  if (ms === 900000 && !timeoutArmed) {
    timeoutArmed = true
    return originalTimeout(callback, 0, ...args)
  }
  return originalTimeout(callback, ms, ...args)
}
global.setInterval = (callback, ms, ...args) => ms === 40
  ? originalInterval(() => {
      Date.now = () => now() + 6000
      try { callback() } finally { Date.now = now }
    }, ms, ...args)
  : originalInterval(callback, ms, ...args)
cp.spawn = (...args) => {
  if (child) {
    console.log(groupChecked ? 'LATER_STEP_AFTER_PROBE' : 'LATER_STEP_BEFORE_PROBE')
    return originalSpawn(...args)
  }
  child = new EventEmitter()
  child.pid = 99999999
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.unref = () => {}
  return child
}
process.kill = (_pid, signal) => {
  if (signal === 'SIGKILL') { child.emit('close', null, 'SIGKILL'); return true }
  if (signal === 0) {
    groupChecked = true
    console.log('GROUP_CHECKED')
    if (!${groupExits}) return true
    const error = new Error('gone'); error.code = 'ESRCH'; throw error
  }
  throw new Error('unexpected signal: ' + signal)
}
require('node:module').syncBuiltinESMExports()
`
    )
    f.env.NODE_OPTIONS = `--require=${hook}`
    const result = await outputOf(launch(f))
    assert.equal(result.code, 1, result.text)
    assert.match(result.text, /fail format \(exit killed\)/)
    assert.match(result.text, /GROUP_CHECKED/)
    assert.doesNotMatch(result.text, /LATER_STEP_BEFORE_PROBE/)
    if (groupExits) {
      assert.match(result.text, /GROUP_CHECKED[\s\S]*LATER_STEP_AFTER_PROBE/)
      assert.match(result.text, /pass lint/)
    } else {
      assert.match(
        result.text,
        /cleanup failed: The owned process group did not exit after SIGKILL/
      )
      assert.doesNotMatch(result.text, /LATER_STEP_AFTER_PROBE/)
      assert.equal(await readFile(f.log, 'utf8'), '')
    }
  }).timeout(10_000)
}

test('interrupt settles a nonclosing child after successful cleanup', async ({ cleanup }) => {
  const f = await fixture()
  cleanup(() => cleanupFixture(f))
  const hook = path.join(f.directory, 'interrupt-hook.cjs')
  await writeFile(
    hook,
    `
const cp = require('node:child_process')
const { EventEmitter } = require('node:events')
const { PassThrough } = require('node:stream')
cp.spawn = () => {
 const child = new EventEmitter(); child.pid = 99999999; child.exitCode = child.signalCode = null
 child.stdout = new PassThrough(); child.stderr = new PassThrough()
 const liveHandle = setInterval(() => {}, 1000)
 child.unref = () => { clearInterval(liveHandle); console.log('LOCAL_HANDLE_RELEASED') }
 setImmediate(() => process.emit('SIGTERM'))
 return child
}
process.kill = (_pid, signal) => {
 if (signal === 0) { const error = new Error('gone'); error.code = 'ESRCH'; throw error }
 return true
}
require('node:module').syncBuiltinESMExports()
`
  )
  f.env.NODE_OPTIONS = `--require=${hook}`
  const result = await outputOf(launch(f))
  assert.equal(result.code, 143, result.text)
  assert.match(result.text, /LOCAL_HANDLE_RELEASED/)
  assert.equal(await readFile(f.log, 'utf8'), '')
}).timeout(10_000)

test('fixture Git commands cannot target an inherited repository or index', async ({ cleanup }) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'origin-guard-host-repository-'))
  cleanup(() => rm(directory, { recursive: true, force: true }))
  const host = path.join(directory, 'host')
  await mkdir(host)
  const git = execFileSync('which', ['git'], { encoding: 'utf8' }).trim()
  const hostEnv = {
    PATH: process.env.PATH,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(directory, 'empty-gitconfig'),
  }
  const hostGit = (args: string[]) =>
    execFileSync(git, args, { cwd: host, env: hostEnv, encoding: 'utf8' }).trim()
  hostGit(['init', '-q'])
  hostGit(['config', 'user.email', 'host@example.test'])
  hostGit(['config', 'user.name', 'Host'])
  hostGit(['config', 'commit.gpgsign', 'false'])
  hostGit(['config', 'core.hooksPath', path.join(directory, 'empty-hooks')])
  await writeFile(path.join(host, 'README.md'), 'host baseline\n')
  hostGit(['add', '.'])
  hostGit(['commit', '-qm', 'host baseline'])
  const headBefore = hostGit(['rev-parse', 'HEAD'])
  const indexBefore = await readFile(path.join(host, '.git/index'))

  const f = await fixture({
    inheritedEnv: {
      GIT_DIR: path.join(host, '.git'),
      GIT_WORK_TREE: host,
      GIT_INDEX_FILE: path.join(host, '.git/index'),
    },
  })
  cleanup(() => cleanupFixture(f))
  const result = await outputOf(launch(f))
  assert.equal(result.code, 0, result.text)
  assert.equal(hostGit(['rev-parse', 'HEAD']), headBefore)
  assert.deepEqual(await readFile(path.join(host, '.git/index')), indexBefore)
  assert.equal(hostGit(['status', '--porcelain']), '')
})

test('fixture cleanup reaps a TERM-resistant descendant after readiness fails', async ({
  cleanup,
}) => {
  const f = await fixture({ command: 'hang' })
  cleanup(() => cleanupFixture(f))
  const result = outputOf(launch(f))
  const workerPid = await waitForPid(f.ready)
  const commandPid = await waitForPid(f.commandPid)
  await assert.rejects(async () => {
    try {
      throw new Error('readiness assertion failed')
    } finally {
      await cleanupFixture(f)
    }
  }, /readiness assertion failed/)
  assert.equal(await isAlive(workerPid), false)
  assert.equal(await isAlive(commandPid), false)
  assert.equal(await isAlive(f.child!.pid!), false)
  await assert.rejects(readFile(f.directory, 'utf8'), { code: 'ENOENT' })
  await result
}).timeout(10_000)
