#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT=$PWD
case "$1" in
  /*) TARBALL=$1 ;;
  *) TARBALL="$REPOSITORY_ROOT/$1" ;;
esac
TS_LOADER=$(node --input-type=module -e "console.log(import.meta.resolve('@poppinss/ts-exec'))")
SMOKE_DIRECTORY=$(mktemp -d)
trap 'rm -rf -- "$SMOKE_DIRECTORY"' EXIT

cd "$SMOKE_DIRECTORY"
mkdir -p node_modules/@kevinjohn/adonisjs-origin-guard node_modules/@adonisjs node_modules/@types
tar -xzf "$TARBALL" --strip-components=1 -C node_modules/@kevinjohn/adonisjs-origin-guard
# Use the peer and Node types from the frozen release install. Only the archive supplies this package.
ln -s "$REPOSITORY_ROOT/node_modules/@adonisjs/core" node_modules/@adonisjs/core
ln -s "$REPOSITORY_ROOT/node_modules/@adonisjs/assembler" node_modules/@adonisjs/assembler
ln -s "$REPOSITORY_ROOT/node_modules/@types/node" node_modules/@types/node
ln -s "$REPOSITORY_ROOT/node_modules/reflect-metadata" node_modules/reflect-metadata

cat > consumer.mts <<'TYPESCRIPT'
import 'reflect-metadata'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Config } from '@adonisjs/core/config'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import {
  configure,
  defineConfig,
  stubsRoot,
  isPrivatePeer,
  isTrustedUnsafeOrigin,
  parseOrigins,
  resolvePublicOrigin,
  type OriginGuardConfig,
  type OriginGuardOptions,
  type PublicOrigin,
  type UnsafeRequestHeaders,
} from '@kevinjohn/adonisjs-origin-guard'
import type {
  OriginGuardConfig as SubpathConfig,
  OriginGuardOptions as SubpathOptions,
  PublicOrigin as SubpathOrigin,
  UnsafeRequestHeaders as SubpathHeaders,
} from '@kevinjohn/adonisjs-origin-guard/types'
import OriginGuardMiddleware from '@kevinjohn/adonisjs-origin-guard/origin_guard_middleware'

const publicOrigin: PublicOrigin = resolvePublicOrigin('https://app.example', 'production', 'APP_URL')
assert.deepEqual(publicOrigin, { origin: 'https://app.example', secure: true })

const options: OriginGuardOptions = {
  publicOrigin: publicOrigin.origin,
  environment: 'production',
}
const sameOptions: SubpathOptions = options
const config: OriginGuardConfig = defineConfig(sameOptions)
const headers: UnsafeRequestHeaders = { origin: publicOrigin.origin }
const sameConfig: SubpathConfig = config
const sameOrigin: SubpathOrigin = publicOrigin
const sameHeaders: SubpathHeaders = headers
assert.equal(typeof configure, 'function')
assert.ok(existsSync(join(stubsRoot, 'config/origin_guard.stub')))
assert.equal(isTrustedUnsafeOrigin(sameHeaders, sameConfig), true)
assert.equal(sameOrigin.origin, publicOrigin.origin)
assert.equal(typeof parseOrigins, 'function')
assert.equal(typeof isPrivatePeer, 'function')
assert.equal(isTrustedUnsafeOrigin(headers, config), true)

const middleware: { handle(context: HttpContext, next: NextFn): Promise<unknown> } =
  new OriginGuardMiddleware(new Config({ origin_guard: config }))
assert.equal(typeof middleware.handle, 'function')
// The type entry has a runtime target, so a side-effect import or re-export of it resolves.
await import('@kevinjohn/adonisjs-origin-guard/types')

// These errors prove the root declarations resolve through to the implementation declarations.
if (false) {
  // @ts-expect-error The defineConfig declaration requires options.
  defineConfig()
  // @ts-expect-error The origins declaration requires a list.
  parseOrigins()
  // @ts-expect-error The private-peer declaration requires an address.
  isPrivatePeer()
}
TYPESCRIPT

# The AdonisJS peer declares optional integrations that are absent in a minimal consumer.
"$REPOSITORY_ROOT/node_modules/.bin/tsc" --noEmit --strict --skipLibCheck --module nodenext consumer.mts
node consumer.mts

# Run the packaged configure hook and middleware through the host's actual framework entry points.
cp -R "$REPOSITORY_ROOT/tests/fixtures/application/." .
cat > package.json <<'JSON'
{"type":"module","imports":{"#start/*":"./start/*.js"}}
JSON
cat > tsconfig.json <<'JSON'
{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext","rewriteRelativeImportExtensions":true}}
JSON
printf 'NODE_ENV=test\n' > .env
cp .env .env.example
env -u ENV_PATH NODE_ENV=test node --import="$TS_LOADER" ace.ts configure @kevinjohn/adonisjs-origin-guard
OUTPUT=$(env -u ENV_PATH NODE_ENV=test ORIGIN_GUARD_PUBLIC_ORIGIN=https://app.example \
  ORIGIN_GUARD_ALLOWED_ORIGINS=https://trusted.example node --import="$TS_LOADER" boot.ts)
printf '%s\n' "$OUTPUT"
[[ "$OUTPUT" == *'HTTP_START_REACHED'* ]]
[[ "$OUTPUT" == *'WRITE_RESULTS {"foreign":{"status":403,"body":"{\"error\":\"Cross-site request rejected.\"}"},"listed":{"status":200,"body":"handler reached"},"public":{"status":200,"body":"handler reached"}}'* ]]
