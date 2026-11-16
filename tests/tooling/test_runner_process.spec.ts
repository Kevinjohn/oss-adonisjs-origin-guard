import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { test } from '@japa/runner'
import { outputOf } from './child_process.js'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const runnerPath = path.join(repoRoot, 'bin/test.ts')

async function runSelection(
  body: string | undefined,
  cleanup: (handler: () => void | Promise<void>) => void
) {
  const directory = await mkdtemp(path.join(repoRoot, 'tests/tooling/runner-selection-'))
  cleanup(() => rm(directory, { recursive: true, force: true }))
  const file = path.join(directory, 'selection.spec.ts')
  if (body) await writeFile(file, body)
  const relativeFile = path.relative(repoRoot, file)
  const env = { ...process.env }
  delete env.NODE_OPTIONS
  const child = spawn(
    process.execPath,
    ['--import=@poppinss/ts-exec', '--enable-source-maps', runnerPath, `--files=${relativeFile}`],
    { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  const result = outputOf(child)
  return result
}

test('the real runner rejects skipped-only, todo-only, and empty selections', async ({
  assert,
  cleanup,
}) => {
  const skipped = await runSelection(
    `import { test } from '@japa/runner'\nconsole.log('SKIPPED_FIXTURE_LOADED')\ntest('skipped fixture body', () => {}).skip()\n`,
    cleanup
  )
  assert.equal(skipped.code, 1, skipped.text)
  assert.match(skipped.text, /SKIPPED_FIXTURE_LOADED/)
  assert.match(skipped.text, /No tests executed/)

  const todo = await runSelection(
    `import { test } from '@japa/runner'\nconsole.log('TODO_FIXTURE_LOADED')\ntest('todo fixture')\n`,
    cleanup
  )
  assert.equal(todo.code, 1, todo.text)
  assert.match(todo.text, /TODO_FIXTURE_LOADED/)
  assert.match(todo.text, /No tests executed/)

  const empty = await runSelection(undefined, cleanup)
  assert.equal(empty.code, 1, empty.text)
  assert.equal(/FIXTURE_LOADED/.test(empty.text), false)
  assert.match(empty.text, /No tests executed/)
}).timeout(30_000)
