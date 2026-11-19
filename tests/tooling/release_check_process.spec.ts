import { execFileSync, spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from '@japa/runner'
import { captureChildOutput } from './child_process.js'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const releaseScript = path.join(repoRoot, 'bin/release_check.sh')
const digest = 'a'.repeat(64)
type Cleanup = (handler: () => void | Promise<void>) => void

async function makeReleaseFixture(
  hashResult: 'missing' | 'failing' | 'malformed' | 'valid',
  cleanup: Cleanup,
  smokeExit = 0
) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'origin-guard-release-check-'))
  cleanup(() => rm(directory, { recursive: true, force: true }))
  const root = path.join(directory, 'checkout')
  const bin = path.join(directory, 'bin')
  await mkdir(path.join(root, 'bin'), { recursive: true })
  await mkdir(bin)
  await writeFile(path.join(root, 'bin/release_check.sh'), await readFile(releaseScript))
  await writeFile(
    path.join(root, 'bin/smoke_packed_package.sh'),
    `#!/bin/bash\nset -e\ntest "$1" = tmp/release/package.tgz\ntest -f "$1"\necho 'smoke checked packed candidate'\nexit ${smokeExit}\n`
  )
  await writeFile(path.join(root, 'package.json'), '{"type":"module","version":"0.1.0"}\n')
  await writeFile(
    path.join(root, 'CHANGELOG.md'),
    '## Unreleased\n\n## 0.1.0 - 2026-11-16\n\nRelease notes.\n'
  )
  const gitEnvironment = { ...process.env }
  for (const key of Object.keys(gitEnvironment)) {
    if (
      key === 'GIT_CONFIG_GLOBAL' ||
      key === 'GIT_CONFIG_SYSTEM' ||
      key === 'GIT_CONFIG_COUNT' ||
      key === 'GIT_CONFIG_PARAMETERS' ||
      key === 'GIT_DIR' ||
      key === 'GIT_WORK_TREE' ||
      key === 'GIT_INDEX_FILE' ||
      key === 'GIT_COMMON_DIR' ||
      key === 'GIT_PREFIX' ||
      /^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key)
    )
      delete gitEnvironment[key]
  }
  const runGit = (commandArguments: string[]) =>
    execFileSync('git', commandArguments, { cwd: root, env: gitEnvironment })
  runGit(['init', '-q'])
  runGit(['config', 'user.email', 'fixture@example.test'])
  runGit(['config', 'user.name', 'Fixture'])
  runGit(['config', 'commit.gpgsign', 'false'])
  runGit(['config', 'core.hooksPath', process.platform === 'win32' ? 'NUL' : '/dev/null'])
  runGit(['remote', 'add', 'origin', 'https://github.com/example/repo.git'])
  runGit(['add', '.'])
  runGit(['commit', '-qm', 'fixture release baseline'])

  await writeFile(
    path.join(bin, 'pnpm'),
    `#!${process.execPath}\nimport { mkdir, writeFile } from 'node:fs/promises'\nconst commandArguments = process.argv.slice(2)\nif (commandArguments[0] === 'build') process.exit(0)\nif (commandArguments[0] === 'pack') { await mkdir('tmp/release', { recursive: true }); await writeFile('tmp/release/package.tgz', 'fixture archive'); process.exit(0) }\nprocess.exit(2)\n`,
    { mode: 0o755 }
  )
  const hashOutput =
    hashResult === 'valid'
      ? `printf '${digest}  %s\\n' "$3"`
      : hashResult === 'malformed'
        ? `printf 'not-a-digest  %s\\n' "$3"`
        : hashResult === 'missing'
          ? `echo 'shasum: command not found' >&2; exit 127`
          : `echo 'shasum failed' >&2; exit 2`
  await writeFile(path.join(bin, 'shasum'), `#!/bin/bash\n${hashOutput}\n`, { mode: 0o755 })
  const outputFile = path.join(directory, 'github-output')
  await writeFile(outputFile, '')
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${path.dirname(process.execPath)}:/usr/bin:/bin`,
    GITHUB_OUTPUT: outputFile,
  }
  delete environment.NODE_OPTIONS
  return { directory, root, outputFile, environment }
}

async function runReleaseCheck(fixture: Awaited<ReturnType<typeof makeReleaseFixture>>) {
  const child = spawn('/bin/bash', ['bin/release_check.sh'], {
    cwd: fixture.root,
    env: fixture.environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const result = captureChildOutput(child)
  return result
}

test('release check fails before notes and output for missing, failing, or malformed digests', async ({
  assert,
  cleanup,
}) => {
  for (const kind of ['missing', 'failing', 'malformed'] as const) {
    const fixture = await makeReleaseFixture(kind, cleanup)
    const result = await runReleaseCheck(fixture)

    assert.notEqual(result.code, 0, `${kind}: ${result.text}`)
    assert.equal(/ready: v/.test(result.text), false)
    assert.equal(await readFile(fixture.outputFile, 'utf8'), '')
    await assert.rejects(() => readFile(path.join(fixture.root, 'tmp/release/notes.md')))
  }
}).timeout(30_000)

test('release check writes the verified 64-character digest on success', async ({
  assert,
  cleanup,
}) => {
  const fixture = await makeReleaseFixture('valid', cleanup)
  const result = await runReleaseCheck(fixture)

  assert.equal(result.code, 0, result.text)
  assert.include(result.text, 'smoke checked packed candidate')
  assert.match(result.text, /ready: v0\.1\.0/)
  assert.include(
    await readFile(path.join(fixture.root, 'tmp/release/notes.md'), 'utf8'),
    `SHA-256: \`${digest}\``
  )
  assert.equal(await readFile(fixture.outputFile, 'utf8'), 'version=0.1.0\ntarball=package.tgz\n')
}).timeout(30_000)

test('release check stops before notes and output if the packed candidate fails its smoke check', async ({
  assert,
  cleanup,
}) => {
  const fixture = await makeReleaseFixture('valid', cleanup, 17)
  const result = await runReleaseCheck(fixture)

  assert.include(result.text, 'smoke checked packed candidate')
  assert.equal(result.code, 17, result.text)
  assert.notInclude(result.text, 'ready: v')
  assert.equal(await readFile(fixture.outputFile, 'utf8'), '')
  await assert.rejects(() => readFile(path.join(fixture.root, 'tmp/release/notes.md')), /ENOENT/)
}).timeout(30_000)
