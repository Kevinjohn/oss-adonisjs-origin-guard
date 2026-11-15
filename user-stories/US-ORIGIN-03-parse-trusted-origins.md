# US-ORIGIN-03 — Parse the trusted origin list

As an application operator, I want a comma-separated list of trusted origins validated and normalised when the application starts so that CORS and the write guard trust exactly the origins I meant, never a wildcard.

**Status:** Operator.
**Access:** Operator who sets the host's trusted-origin setting (for example `CORS_ORIGINS`); host code passes it in.
**Entry:** `parseOrigins(list)`, called from host code such as the guard's middleware file or CORS config.
**Documentation:** [Parse origins](../README.md#parse-origins).
**Source:** [origins](../src/origins.ts).
**Coverage:** [Origin tests](../tests/origins.spec.ts).

## Acceptance criteria

| Input  | Control    | Required/default/conditions                                                                                    |
| ------ | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `list` | Argument 1 | Required string. Comma-separated; entries are trimmed and blank entries skipped. An empty string returns `[]`. |

- Each entry is returned in the serialized form a browser sends in `Origin` (for example a trailing `/` is dropped and the host is lower-cased).
- `*` throws `CORS requires explicit origins when credentials are enabled`.
- An entry that does not parse, is not HTTP(S), or has credentials, a path, a query or a fragment throws `Invalid CORS origin "<entry>": expected a bare HTTP(S) origin`. The host corrects the setting and restarts.

## User flow

```mermaid
flowchart TD
    A["Operator sets the trusted origin list"] --> B["Application starts and parses it"]
    B --> C{"Any entry is a wildcard or not a bare HTTP(S) origin?"}
    C -->|Yes| D["Boot stops naming the entry; correct the setting"]
    D --> A
    C -->|No| E["CORS and the write guard trust exactly the listed origins"]
```

## Code flow

Scope: package parsing; passing the result to CORS or `createOriginGuard` is host-owned.

```mermaid
flowchart TD
    A["parseOrigins(list)"] --> B["split on comma, trim, drop blanks"]
    B --> C{"entry === '*'?"}
    C -->|Yes| D["throw CORS requires explicit origins"]
    C -->|No| E["new URL(entry)"]
    E --> F{"Parses, http or https, no credentials, path '/', no query or fragment?"}
    F -->|No| G["throw Invalid CORS origin"]
    F -->|Yes| H["return parsed.origin for each entry"]
```

**Code references:** [parseOrigins](../src/origins.ts#L13).
