# Reference

## Actors and boundaries

- **Application developer**: registers the guard as server middleware and passes the validated origins in. The package provides no provider, routes, UI or `configure` hook, and reads no environment variable.
- **Operator**: sets the public URL and trusted-origin settings the host passes to US-ORIGIN-02/03, and places any reverse proxy for US-ORIGIN-04.
- **Browser client**: sends `Origin` and `Sec-Fetch-Site`, which the guard reads for every method other than `GET`, `HEAD` and `OPTIONS`.

## Shared source map

- Public exports: [`index.ts`](../index.ts).
- Write guard and decision function: [`src/guard.ts`](../src/guard.ts).
- Public origin and trusted origin parsing: [`src/origins.ts`](../src/origins.ts).
- Private-peer check: [`src/private_peer.ts`](../src/private_peer.ts).
- Contracts and host wiring examples: [README](../README.md). There is no separate guide.
- Test evidence: [`tests/guard.spec.ts`](../tests/guard.spec.ts), [`tests/origins.spec.ts`](../tests/origins.spec.ts), [`tests/private_peer.spec.ts`](../tests/private_peer.spec.ts).

## Availability

`Current` describes callable source once the host registers the middleware, not runtime verification. `Operator` marks setup the host runs at startup or in its HTTP config rather than a per-request action.

## Availability definitions

- **Current:** callable under the stated configuration; not a test result.
- **Hidden:** implementation remains but its ordinary entry or trigger is unavailable.
- **Removed:** historical capability has no current product entry.
- **Demo:** available only in a named demo context.
- **Operator:** installation, configuration or hosting outside ordinary application requests.
- **Planned:** agreed target without an ordinary implemented journey.

No runtime application journey was exercised for this documentation change. See the [portable template](TEMPLATE.md) for writing and diagram maintenance rules.
