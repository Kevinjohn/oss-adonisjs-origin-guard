#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT=$PWD
TARBALL="$REPOSITORY_ROOT/$1"
SMOKE_DIRECTORY=$(mktemp -d)
trap 'rm -rf -- "$SMOKE_DIRECTORY"' EXIT

cd "$SMOKE_DIRECTORY"
mkdir -p node_modules/@kevinjohn/adonisjs-origin-guard node_modules/@adonisjs node_modules/@types
tar -xzf "$TARBALL" --strip-components=1 -C node_modules/@kevinjohn/adonisjs-origin-guard
# Use the peer and Node types from the frozen release install. Only the archive supplies this package.
ln -s "$REPOSITORY_ROOT/node_modules/@adonisjs/core" node_modules/@adonisjs/core
ln -s "$REPOSITORY_ROOT/node_modules/@types/node" node_modules/@types/node

cat > consumer.mts <<'TYPESCRIPT'
import assert from 'node:assert/strict'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import {
  createOriginGuard,
  createOriginCheck,
  isPrivatePeer,
  isTrustedUnsafeOrigin,
  parseOrigins,
  resolvePublicOrigin,
  type OriginGuardConfig,
  type PublicOrigin,
  type UnsafeRequestHeaders,
} from '@kevinjohn/adonisjs-origin-guard'
import type {
  OriginGuardConfig as SubpathConfig,
  PublicOrigin as SubpathOrigin,
  UnsafeRequestHeaders as SubpathHeaders,
} from '@kevinjohn/adonisjs-origin-guard/types'

const publicOrigin: PublicOrigin = resolvePublicOrigin('https://app.example', 'production', 'APP_URL')
assert.deepEqual(publicOrigin, { origin: 'https://app.example', secure: true })

const config: OriginGuardConfig = { publicOrigin: publicOrigin.origin }
const headers: UnsafeRequestHeaders = { origin: publicOrigin.origin }
const sameConfig: SubpathConfig = config
const sameOrigin: SubpathOrigin = publicOrigin
const sameHeaders: SubpathHeaders = headers
assert.equal(createOriginCheck, createOriginGuard)
assert.equal(isTrustedUnsafeOrigin(sameHeaders, sameConfig), true)
assert.equal(sameOrigin.origin, publicOrigin.origin)
assert.equal(typeof parseOrigins, 'function')
assert.equal(typeof isPrivatePeer, 'function')
assert.equal(isTrustedUnsafeOrigin(headers, config), true)

const middleware: { handle(context: HttpContext, next: NextFn): Promise<unknown> } =
  new (createOriginGuard(config))()
assert.equal(typeof middleware.handle, 'function')
// The type entry has a runtime target, so a side-effect import or re-export of it resolves.
await import('@kevinjohn/adonisjs-origin-guard/types')

// These errors prove the root declarations resolve through to the implementation declarations.
if (false) {
  // @ts-expect-error The origin-check declaration requires a config.
  createOriginGuard()
  // @ts-expect-error The origins declaration requires a list.
  parseOrigins()
  // @ts-expect-error The private-peer declaration requires an address.
  isPrivatePeer()
}
TYPESCRIPT

# The AdonisJS peer declares optional integrations that are absent in a minimal consumer.
"$REPOSITORY_ROOT/node_modules/.bin/tsc" --noEmit --strict --skipLibCheck --module nodenext consumer.mts
node consumer.mts
