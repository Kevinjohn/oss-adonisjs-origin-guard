# US-ORIGIN-04 — Trust a proxy on a private network

As an application operator, I want AdonisJS to trust forwarded headers only from loopback or private-network addresses so that it can use the client address and protocol supplied by a reverse proxy on the same host or network.

**Status:** Operator.
**Access:** Operator who controls `config/app.ts` and the proxy placement.
**Entry:** `isPrivatePeer(address)`, passed as AdonisJS's `http.trustProxy` option.
**Documentation:** [Trust a proxy](../README.md#trust-a-proxy).
**Source:** [private peer check](../src/private_peer.ts).
**Coverage:** [Private peer tests](../tests/private_peer.spec.ts).

## Acceptance criteria

| Input     | Control    | Required/default/conditions                    |
| --------- | ---------- | ---------------------------------------------- |
| `address` | Argument 1 | Required. The peer address AdonisJS passes in. |

- Returns true for `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `::1` and `fc00::/7`, including IPv4-mapped IPv6 such as `::ffff:10.0.0.1`.
- Returns false for every other address, and for anything that is not an IP address. It never throws.
- Which networks a deployment's proxy uses, and whether a private peer is trustworthy there, stay the operator's decision.

## User flow

```mermaid
flowchart TD
    A["Operator sets trustProxy to isPrivatePeer"] --> B["Request arrives from a peer"]
    B --> C{"Peer on loopback or a private network?"}
    C -->|Yes| D["Application uses the forwarded client address and protocol"]
    C -->|No| E["Application ignores forwarded headers and uses the peer itself"]
```

## Code flow

Scope: package address check; applying forwarded headers is AdonisJS's `trustProxy` handling.

```mermaid
flowchart TD
    A["isPrivatePeer(address)"] --> B["strip ::ffff: prefix from dotted IPv4-mapped form"]
    B --> C{"isIP(ip) is 0?"}
    C -->|Yes| D["return false"]
    C -->|No| E["privatePeers.check(ip, ipv4 or ipv6)"]
    E --> F["return match"]
```

**Code references:** [isPrivatePeer](../src/private_peer.ts#L16).
