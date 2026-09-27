NIP-FE
======

Relay Commands over HTTP
------------------------

`draft` `optional`

A relay MAY answer single client commands over plain HTTP, beside its
websocket. Each request carries one command and gets back that command's
answer, in the relay's own [NIP-01](01.md) frames, and nothing stays open after it:
no live subscription, no connection state, no session to resume.

This serves clients that want an answer rather than a connection — scripts,
serverless functions, crawlers, a page that renders one query — and it makes
[NIP-77](77.md) reconciliation stateless, so any relay instance behind a load balancer
can answer any round of it.

## Endpoints

The endpoints hang off the relay's HTTP URL: the relay URL with `ws://` read
as `http://` and `wss://` as `https://`, host and path unchanged. For a relay
at `wss://relay.example/nostr`, REQ is `POST https://relay.example/nostr/req`.

| path     | body                                               | answer ends on        |
|----------|----------------------------------------------------|-----------------------|
| `/req`   | one filter, or an array of filters                 | `EOSE`, or `CLOSED`   |
| `/count` | one filter, or an array of filters ([NIP-45](45.md))        | `COUNT`, or `CLOSED`  |
| `/event` | one signed event                                   | `OK`                  |
| `/neg`   | `[<filter>, "<hex message>"]`, one NIP-77 round    | `NEG-MSG`, or `NEG-ERR` |

Every request is a `POST` whose body is JSON: what follows the command's
subscription id on the websocket, or the lone object where the command takes
one. Relays SHOULD NOT require a `Content-Type`, so a browser can send these
without a CORS preflight when it carries no `Authorization`.

A relay that serves this NIP lists `FE` in its [NIP-11](11.md) `supported_nips`.

## Answers

The response body is `application/x-ndjson`: one relay-to-client frame per
line, exactly as the relay would send it on the websocket (NIP-01, NIP-45,
NIP-77). The relay picks the subscription id; clients MUST ignore it.

```
POST /req   {"kinds":[1],"limit":2}

["EVENT","http",{"id":"…","kind":1,…}]
["EVENT","http",{"id":"…","kind":1,…}]
["EOSE","http"]
```

The answer ends on the frame in the table's last column, or on a `NOTICE`,
which means the command never ran. The relay then ends the response. **A body
that ends on anything else was cut off**, and clients MUST treat what they got
as incomplete: a REQ with its tail missing looks exactly like a short result.

A REQ is its websocket self with the live part removed: stored events up to
`EOSE`, then the end of the response. Relays SHOULD write each frame as it is
produced (chunked transfer encoding), so a client can act on the first event
before the last one is found; clients MAY read the body incrementally.

## Status

The status is decided by the first frame of the answer.

| first frame                                           | status |
|-------------------------------------------------------|--------|
| `EVENT`, `EOSE`, `COUNT`, `NEG-MSG`, `OK` with `true` | `200`  |
| `OK` with `false` and a `duplicate:` reason           | `200`  |
| a refusal (`CLOSED`, `NEG-ERR`, `OK` with `false`) prefixed `auth-required:` | `401`, with `WWW-Authenticate: Nostr` |
| … prefixed `restricted:` or `blocked:`                | `403`  |
| … prefixed `rate-limited:`                            | `429`, with `Retry-After` |
| … prefixed `error:`                                   | `500`  |
| … with any other prefix, or a `NOTICE`                | `400`  |

A refusal is the whole body, one line. A request the relay cannot read as the
command's arguments is `400` with a `CLOSED` line saying so; one over the
relay's `max_message_length` (NIP-11), measured on the frame the body stands
for, is `413`. A relay too busy to take the request answers `429` (this client)
or `503` (everyone), each with `Retry-After`. A relay with no first frame
within its own time limit answers `503`.

Once a `200` has gone out the status cannot change, so a failure after that —
the store failing mid-answer, the relay's time limit passing, a reader too slow
to keep up — is a last `CLOSED` line in the body.

## Authentication

Where a websocket client would send a [NIP-42](42.md) `AUTH`, an HTTP client sends a
[NIP-98](98.md) `Authorization: Nostr <base64 event>` header with the request. The
event's `u` tag is the endpoint's full URL, its `method` tag is `POST`, and its
`payload` tag is REQUIRED: the hex sha256 of the body. The relay treats the
pubkey as authenticated for that one command, exactly as if it had sent a
NIP-42 `AUTH` on the socket, and as nothing more.

A token authorizes one command, once: relays MUST reject a token whose
`payload` does not match the body and SHOULD reject one they have already
accepted. A relay reachable at more than one address (a `.onion` beside its
clearnet name) accepts a `u` at any of them. An `Authorization` header in any
other scheme (a proxy's `Basic`, an API gateway's `Bearer`) is not addressed to
the relay and MUST be ignored rather than refused.

Unauthenticated requests are answered under the relay's usual rules for an
unauthenticated connection.

## Negentropy

A NIP-77 responder holds no state between rounds except the set it reconciles
against, so `/neg` carries every round whole: the filter and the client's
current message. The relay answers with the next message in a `NEG-MSG`, and
the client sends that into its own reconciliation and posts the result as the
next round, with the same filter, until its side produces no message.

```
POST /neg   [{"kinds":[1]},"61…"]
["NEG-MSG","http","61…"]

POST /neg   [{"kinds":[1]},"61…"]
["NEG-MSG","http","61…"]
```

There is no `NEG-CLOSE`: nothing was opened. Rounds MAY reach different relay
instances. Relays SHOULD cache the matching set per filter between rounds,
since rebuilding it is the expensive part. If the set changes between rounds,
each range is reconciled against the set as it was when that range was last
compared, so an event that arrives mid-sync can be missed until the next sync,
just as with a websocket session whose snapshot predates it. The relay's
NIP-77 limits (such as a cap on the number of matching events, refused with
`NEG-ERR` `blocked:`) apply to every round.

## Browsers, proxies, compression

Relays SHOULD answer CORS preflights for these paths from any origin, allowing
`POST` and the `Authorization` and `Content-Type` headers. No cookies are
involved; credentials are the per-request NIP-98 token.

A relay that compresses a streamed answer SHOULD flush the compressor each
time it flushes frames (a gzip sync flush), or compression holds back the lines
streaming exists to deliver. A relay behind a buffering reverse proxy SHOULD
disable its buffering for these responses (`X-Accel-Buffering: no` for nginx).

## Security considerations

Each request is its own connection, so per-connection limits a relay applies
on its websocket (concurrent subscriptions, one search at a time) do not bound
HTTP clients; relays SHOULD apply their own per-client and global concurrency
limits here. Behind a reverse proxy the client's address is in a header only
that proxy can be trusted to write: relays SHOULD read it only from requests
whose peer is the proxy.

A slow reader must not make the relay hold its answer in memory: relays SHOULD
let socket backpressure reach the producer, and SHOULD drop a client that stops
reading rather than buffer for it.
