import strictAssert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { test } from '@japa/runner'
import {
  executedTests,
  planChangedChecks,
  type ChangedFile,
  type PlannedCheckStep,
} from '../../bin/check_changed_plan.js'

const packageJson = new URL('../../package.json', import.meta.url)
const changed = (...paths: string[]): ChangedFile[] =>
  paths.map((path) => ({ path, deleted: false }))

function ran(plan: PlannedCheckStep[]): Record<string, string[]> {
  return Object.fromEntries(
    plan.flatMap((step) => ('command' in step ? [[step.label, step.command]] : []))
  )
}

test('a changed spec runs on its own and requires executed tests', ({ assert }) => {
  const plan = planChangedChecks(changed('tests/guard.spec.ts'))
  const tests = plan.find((step) => step.label === 'tests')

  assert.deepEqual(Object.keys(ran(plan)), ['format', 'lint', 'typecheck', 'tests'])
  assert.deepInclude(tests, {
    command: ['pnpm', 'quick:test', '--files=tests/guard.spec.ts'],
    countsTests: true,
    requiresTests: true,
  })
})

test('package source and manifests run the suite and the build', ({ assert }) => {
  for (const path of ['src/guard.ts', 'package.json', 'pnpm-lock.yaml']) {
    const commands = ran(planChangedChecks(changed(path, 'tests/guard.spec.ts')))
    assert.deepEqual(commands.tests, ['pnpm', 'quick:test'], path)
    assert.deepEqual(commands.build, ['pnpm', 'build'], path)
  }
})

test('files the specs read run the full suite without building the package', ({ assert }) => {
  for (const path of ['tests/helpers.ts', 'CHANGELOG.md', '.github/workflows/checks.yml']) {
    const commands = ran(planChangedChecks(changed(path)))
    assert.deepEqual(commands.tests, ['pnpm', 'quick:test'], path)
    assert.notProperty(commands, 'build', path)
  }
})

test('story-only changes keep the selected suite but do not build the package', ({ assert }) => {
  const plan = planChangedChecks(changed('user-stories/README.md'))
  const commands = ran(plan)

  assert.deepEqual(commands.tests, ['pnpm', 'quick:test'])
  assert.notProperty(commands, 'build')
})

test('lockfile and workspace changes run lint and typecheck', ({ assert }) => {
  for (const path of ['pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    assert.properties(ran(planChangedChecks(changed(path))), ['lint', 'typecheck'], path)
  }
})

test('deleted files select checks but are never passed to tools', ({ assert }) => {
  const commands = ran(
    planChangedChecks([
      { path: 'src/old_module.ts', deleted: true },
      { path: 'tests/old_module.spec.ts', deleted: true },
    ])
  )

  assert.notProperty(commands, 'format')
  assert.deepEqual(commands.typecheck, ['pnpm', 'typecheck'])
  assert.deepEqual(commands.tests, ['pnpm', 'quick:test'])
  assert.notInclude(commands.lint.join(' '), 'old_module')
  assert.deepEqual(
    ran(planChangedChecks([{ path: 'tests/old_module.spec.ts', deleted: true }])).tests,
    ['pnpm', 'quick:test']
  )
})

test('formats only existing files and leaves the lockfile to pnpm', ({ assert }) => {
  const commands = ran(planChangedChecks(changed('README.md')))

  assert.deepEqual(commands.format.slice(-1), ['README.md'])
  assert.include(commands.format, '--ignore-unknown')
  assert.include(commands.format, '--no-error-on-unmatched-pattern')
  assert.deepEqual(ran(planChangedChecks(changed('pnpm-lock.yaml'))).format, [
    'pnpm',
    'format:check',
  ])
})

test('formats changed root filenames that start with a dash as literal paths', async ({
  cleanup,
}) => {
  const root = await mkdtemp(join(tmpdir(), 'origin-guard-changed-format-'))
  cleanup(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, '.prettierrc.json'), '{"semi":true}\n')
  await writeFile(join(root, '-leading.ts'), 'const value={bad:true}\n')
  await writeFile(join(root, 'ordinary.ts'), 'const value = { ordinary: true };\n')

  const format = ran(planChangedChecks(changed('-leading.ts', 'ordinary.ts'))).format
  const prettier = fileURLToPath(import.meta.resolve('prettier/bin/prettier.cjs'))
  const { error, status, stderr, stdout } = spawnSync(
    process.execPath,
    [prettier, ...format.slice(3)],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: '0' },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  strictAssert.ifError(error)
  const output = stripVTControlCharacters(stdout + stderr)
  strictAssert.equal(status, 1, output)
  strictAssert.match(output, /\[warn\] -leading\.ts/)
  strictAssert.doesNotMatch(output, /\[warn\] ordinary\.ts/)
  strictAssert.deepEqual(format.slice(-3), ['--', '-leading.ts', 'ordinary.ts'])
})

test('formatter configuration checks the whole tree', ({ assert }) => {
  for (const path of [
    '.prettierignore',
    '.editorconfig',
    'package.json',
    'prettier.config.js',
    'pnpm-lock.yaml',
  ])
    assert.deepEqual(ran(planChangedChecks(changed(path))).format, ['pnpm', 'format:check'], path)
})

test('lint allows no warnings and skips files ESLint ignores', async ({ assert }) => {
  assert.deepEqual(ran(planChangedChecks(changed('index.ts'))).lint, ['pnpm', 'lint'])
  // The repository's own lint script carries the zero-warning limit for every caller.
  const manifest = JSON.parse(await readFile(packageJson, 'utf8'))
  assert.include(manifest.scripts.lint, '--max-warnings 0')
  assert.notProperty(ran(planChangedChecks(changed('tmp/x.ts'))), 'lint')
})

test('--static names each selected suite in a skip line instead of running it', ({ assert }) => {
  const plan = planChangedChecks(changed('src/guard.ts', 'package.json', 'README.md'), {
    static: true,
  })

  assert.deepEqual(Object.keys(ran(plan)), ['format', 'lint', 'typecheck'])
  for (const [label, skip] of [
    ['test suite', '--static leaves out pnpm quick:test'],
    ['build', '--static leaves out pnpm build'],
  ])
    assert.deepInclude(plan, { label, skip })
})

test('--static still runs the changed specs on their own', ({ assert }) => {
  const plan = planChangedChecks(changed('src/guard.ts', 'tests/guard.spec.ts'), {
    static: true,
  })

  assert.deepEqual(ran(plan).tests, ['pnpm', 'quick:test', '--files=tests/guard.spec.ts'])
  assert.deepInclude(plan, { label: 'test suite', skip: '--static leaves out pnpm quick:test' })
  assert.deepInclude(planChangedChecks(changed('src/guard.ts'), { static: true }), {
    label: 'tests',
    skip: 'no test files changed',
  })
})

test('--static plans a spec-only change exactly as the default does', ({ assert }) => {
  assert.deepEqual(
    planChangedChecks(changed('tests/guard.spec.ts'), { static: true }),
    planChangedChecks(changed('tests/guard.spec.ts'))
  )
})

test('counts executed tests from the Japa summary', ({ assert }) => {
  assert.equal(executedTests('\u001b[2mTests\u001b[22m  335 passed, 2 skipped (337)'), 335)
  assert.equal(executedTests('Tests  14 passed, 1 failed (15)'), 15)
  assert.equal(executedTests('Tests  1 regression (1)'), 1)
  assert.equal(executedTests('Tests  2 passed, 1 regression, 3 skipped (6)'), 3)
  assert.equal(executedTests(' NO TESTS EXECUTED '), 0)
})

test('the package script runs the check:changed entry point', async ({ assert }) => {
  const scripts = JSON.parse(await readFile(packageJson, 'utf8')).scripts

  assert.equal(
    scripts['check:changed'],
    'node --import=@poppinss/ts-exec --enable-source-maps bin/check_changed.ts'
  )
})
