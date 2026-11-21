# Reference

## Actors and boundaries

- **Application developer**: registers the origin check as server middleware and passes the validated origins in. The package provides no provider, routes, UI or `configure` hook, and reads no environment variable.
- **Operator**: sets the public URL and trusted-origin settings the host passes to US-ORIGIN-02/03, and places any reverse proxy for US-ORIGIN-04.
- **Browser client**: sends `Origin` and `Sec-Fetch-Site`, which the middleware reads for every method other than `GET`, `HEAD` and `OPTIONS`.

## Shared source map

- Public exports: [`index.ts`](../index.ts).
- Origin-check middleware and decision function: [`src/origin_check.ts`](../src/origin_check.ts).
- Public origin and trusted origin parsing: [`src/origins.ts`](../src/origins.ts).
- Private-peer check: [`src/private_peer.ts`](../src/private_peer.ts).
- Contracts and host wiring examples: [README](../README.md). See also the [executable startup fixture](../tests/origins/origin_check/boot.spec.ts) and [packed consumer check](../bin/smoke_packed_package.sh).
- Test evidence: [`tests/origin_check.spec.ts`](../tests/origin_check.spec.ts), [`tests/origins.spec.ts`](../tests/origins.spec.ts), [`tests/private_peer.spec.ts`](../tests/private_peer.spec.ts).

## Availability

`Current` describes callable source once the host registers the middleware, not runtime verification. `Operator` marks setup the host runs at startup or in its HTTP config rather than a per-request action.

## Availability definitions

- **Current:** callable under the stated configuration; not a test result.
- **Hidden:** implementation remains but its ordinary entry or trigger is unavailable.
- **Removed:** historical capability has no current product entry.
- **Demo:** available only in a named demo context.
- **Operator:** installation, configuration or hosting outside ordinary application requests.
- **Planned:** agreed target without an ordinary implemented journey.

See the [portable template](TEMPLATE.md) for writing and diagram maintenance rules.
