# US-ORIGIN-02 — Validate the public origin

As an application operator, I want the origin my application is served from checked when the application starts so that a malformed or insecure setting stops the boot instead of weakening the origin check.

**Status:** Operator.
**Access:** Operator who sets the host's public URL setting (for example `APP_URL`); host code passes it in, since the package reads no environment variable.
**Entry:** `resolvePublicOrigin(value, environment, variable)`, called from an eagerly imported host startup/config module. The HTTP kernel imports that module before registering the lazy origin-check middleware; the middleware consumes the resulting configuration.
**Documentation:** [Parse origins](../README.md#parse-origins).
**Source:** [origins](../src/origins.ts).
**Coverage:** [Origin tests](../tests/origins.spec.ts).

## Acceptance criteria

| Input         | Control    | Required/default/conditions                                                                                                                               |
| ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | Argument 1 | Required. Must exactly equal its own `new URL(value).origin`, for example `https://app.example`: no credentials, trailing slash, path, query or fragment. |
| `environment` | Argument 2 | Required. `production`, `development` or `test`.                                                                                                          |
| `variable`    | Argument 3 | Required. The setting's name, used only in error messages.                                                                                                |

- A valid value returns `{ origin, secure }`, where `secure` is true for HTTPS.
- HTTPS is required in production. Plain HTTP is accepted in development and test only on `localhost`, `127.0.0.1` or `[::1]`.
- The host declares `APP_URL` in the `start/env.ts` schema (for example, `APP_URL: Env.schema.string()`) before reading it through `#start/env`.
- A value that does not parse, is not HTTP(S), carries credentials or differs from its serialized origin throws `<variable> must be a bare HTTP(S) origin` during HTTP startup. Invalid configuration prevents the app reaching ready state or handling requests.
- Plain HTTP throws `<variable>: public production origins require HTTPS` in production. In development and test it throws `<variable> must use HTTPS outside loopback in development/test` unless the hostname is `localhost`, `127.0.0.1` or `[::1]`. The host corrects the setting and restarts.

The comparison uses the complete input string. Host case, an explicit default port or a trailing slash that changes on serialisation fails the bare-origin check. A canonical non-default port remains part of the origin.

## User flow

```mermaid
flowchart TD
    A["Operator sets the public URL"] --> B["Application starts and validates it"]
    B --> C{"Bare HTTP(S) origin?"}
    C -->|No| D["Boot stops with a bare-origin error; correct the setting"]
    C -->|Yes| E{"HTTPS, or HTTP in development/test on localhost, 127.0.0.1 or [::1]?"}
    E -->|No| F["Boot stops with an HTTPS error; correct the setting"]
    E -->|Yes| G["Application receives the validated origin and HTTPS flag; it can pass the origin to the origin check"]
    D --> A
    F --> A
```

## Code flow

Scope: package validation; reading the setting and using `secure` are host-owned.

```mermaid
flowchart TD
    A["resolvePublicOrigin(value, environment, variable)"] --> B["new URL(value)"]
    B --> C{"Parses, http or https, url.origin === value, no credentials?"}
    C -->|No| D["throw variable must be a bare HTTP(S) origin"]
    C -->|Yes| E{"protocol not https and (production or hostname not loopback)?"}
    E -->|Yes| F["throw production or development/test HTTPS error"]
    E -->|No| G["return { origin, secure }"]
```

**Code references:** [resolvePublicOrigin](../src/origins.ts), [PublicOrigin](../src/origins.ts).
