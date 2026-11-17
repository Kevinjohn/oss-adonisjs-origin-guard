import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

function loadRoutes(APP_URL) {
  const result = spawnSync(process.execPath, ['ace', 'list:routes'], {
    env: { ...process.env, NODE_ENV: 'production', APP_URL },
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  return { status: result.status, output: result.stdout + result.stderr }
}

test('the starter loads its routes with a public HTTPS origin', () => {
  const { status, output } = loadRoutes('https://app.example.com')
  assert.equal(status, 0, output)
  assert.match(output, /GET\s+\//)
})

test('an insecure production origin stops the starter during boot', () => {
  const { status, output } = loadRoutes('http://app.example.com')
  assert.equal(status, 1, output)
  assert.match(output, /APP_URL: public production origins require HTTPS/)
})
