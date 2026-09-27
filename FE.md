NIP-FE
======

Relay Commands over HTTP
------------------------

`draft` `optional`

A relay MAY answer single client commands over plain HTTP, beside its
websocket. A request carries one command frame, exactly as a client would send
it on the websocket, and gets back that command's answer, exactly as the relay
would send it there. Nothing stays open after it: no live subscription, no
connection state, no session to resume.

This serves clients that want an answer rather than a connection — scripts,
serverless functions, crawlers, a page that renders one query — and any relay
instance behind a load balancer can answer any request. A relay can serve it by
feeding the body to its websocket handler as if it had arrived on a new socket.

## Requests

A request is a `POST` to the relay's HTTP URL: the relay URL with `ws://` read
as `http://` and `wss://` as `https://`, host and path unchanged. Its body is one
[NIP-01](01.md) client frame: `REQ`, `COUNT` ([NIP-45](45.md)) or `EVENT`.

```
POST https://relay.example
["REQ","q1",{"kinds":[1],"limit":2}]
```

The subscription id is the client's to pick, as on the websocket. Relays SHOULD
NOT require a `Content-Type`, so a browser can send these without a CORS
preflight when it carries no `Authorization`. A request with `Content-Type:
application/nostr+json+rpc` is a [NIP-86](86.md) call, not a command.

A relay that serves this NIP lists `FE` in its [NIP-11](11.md) `supported_nips`.

## Answers

The response body is `application/x-ndjson`: one relay-to-client frame per
line, exactly as the relay would send it on the websocket.

```
["EVENT","q1",{"id":"…","kind":1,…}]
["EVENT","q1",{"id":"…","kind":1,…}]
["EOSE","q1"]
```

| command | answer ends on       |
|---------|----------------------|
| `REQ`   | `EOSE`, or `CLOSED`  |
| `COUNT` | `COUNT`, or `CLOSED` |
| `EVENT` | `OK`                 |

The answer ends on the frame in the table, or on a `NOTICE`, which means the
command never ran. The relay then ends the response. **A body that ends on
anything else was cut off**, and clients MUST treat what they got as
incomplete: a REQ with its tail missing looks exactly like a short result.

A REQ is its websocket self with the live part removed: stored events up to
`EOSE`, then the end of the response. Relays SHOULD write each frame as it is
produced (chunked transfer encoding), so a client can act on the first event
before the last one is found; clients MAY read the body incrementally.

## Status

The status is decided by the first frame of the answer.

| first frame                                           | status |
|-------------------------------------------------------|--------|
| `EVENT`, `EOSE`, `COUNT`, `OK` with `true`            | `200`  |
| `OK` with `false` and a `duplicate:` reason           | `200`  |
| a refusal (`CLOSED`, `OK` with `false`) prefixed `auth-required:` | `401`, with `WWW-Authenticate: Nostr` |
| … prefixed `restricted:` or `blocked:`                | `403`  |
| … prefixed `rate-limited:`                            | `429`, with `Retry-After` |
| … prefixed `error:`                                   | `500`  |
| … with any other prefix, or a `NOTICE`                | `400`  |

A refusal is the whole body, one line. The relay may also refuse a request
before running it, with one `NOTICE` line: `400` for a body that is not one
`REQ`, `COUNT` or `EVENT` frame, `413` for one longer than its
`max_message_length` ([NIP-11](11.md)), `429` (this client) or `503` (everyone)
with `Retry-After` when it is too busy to take the request, and `503` when no
first frame came within its own time limit.

Once a `200` has gone out the status cannot change, so a failure after that —
the store failing mid-answer, the relay's time limit passing, a reader too slow
to keep up — is a last `CLOSED` line in the body.

## Authentication

Where a websocket client would send a [NIP-42](42.md) `AUTH`, an HTTP client sends a
[NIP-98](98.md) `Authorization: Nostr <base64 event>` header with the request. The
event's `u` tag is the relay's HTTP URL, its `method` tag is `POST`, and its
`payload` tag is REQUIRED: the hex sha256 of the body. The relay treats the
pubkey as authenticated for that one command, exactly as if it had sent a
NIP-42 `AUTH` on the socket, and as nothing more.

Relays MUST reject a token whose `payload` does not match the body, and one
whose `created_at` is more than 60 seconds away from their own clock. Within
that window a token MAY be used again for the same body: relays need not
remember the tokens they accepted, since sending the same body again only
repeats a read or re-sends an event the relay already has, and a client can
retry a request that failed on the network without signing a new token.

A relay reachable at more than one address (a `.onion` beside its clearnet
name) accepts a `u` at any of them. An `Authorization` header in any other
scheme (a proxy's `Basic`, an API gateway's `Bearer`) is not addressed to the
relay and MUST be ignored rather than refused.

## Browsers, proxies, compression

Relays SHOULD answer CORS preflights for the relay URL from any origin, allowing
`POST` and the `Authorization` and `Content-Type` headers. No cookies are
involved; credentials are the per-request NIP-98 token.

A relay that compresses a streamed answer SHOULD flush the compressor each
time it flushes frames (a gzip sync flush), or compression holds back the lines
streaming exists to deliver. A relay behind a buffering reverse proxy SHOULD
disable its buffering for these responses (`X-Accel-Buffering: no` for nginx).
