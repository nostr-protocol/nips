NIP-48
======

Proxy Tags
----------

`draft` `optional` `author:alexgleason`

Nostr events bridged from other protocols such as ActivityPub can link back to the source object by including a `"proxy"` tag, in the form:

```
["proxy", <id>, <protocol>]
```

Where:

- `<id>` is the ID of the source object. The ID format varies depending on the protocol. The ID must be universally unique, regardless of the protocol.
- `<protocol>` is the name of the protocol, e.g. `"activitypub"`.

Clients may use this information to reconcile duplicated content bridged from other protocols, or to display a link to the source object.

Proxy tags may be added to any event kind, and doing so indicates that the event did not originate on the Nostr protocol, and instead originated elsewhere on the web.

### Supported protocols

This list may be extended in the future.

| Protocol | ID format | Example |
| -------- | --------- | ------- |
| `activitypub` | URL | `https://gleasonator.com/objects/9f524868-c1a0-4ee7-ad51-aaa23d68b526` |
| `atproto` | AT URI | `at://did:plc:zhbjlbmir5dganqhueg7y4i3/app.bsky.feed.post/3jt5hlibeol2i` |
| `rss` | URL with guid fragment | `https://soapbox.pub/rss/feed.xml#https%3A%2F%2Fsoapbox.pub%2Fblog%2Fmostr-fediverse-nostr-bridge` |
| `web` | URL | `https://twitter.com/jack/status/20` |

### Examples

ActivityPub object:

```json
{
  "kind": 1,
  "content": "I'm vegan btw",
  "tags": [
    [
      "proxy",
      "https://gleasonator.com/objects/8f6fac53-4f66-4c6e-ac7d-92e5e78c3e79",
      "activitypub"
    ]
  ],
  "pubkey": "79c2cae114ea28a981e7559b4fe7854a473521a8d22a66bbab9fa248eb820ff6",
  "created_at": 1691091365,
  "id": "55920b758b9c7b17854b6e3d44e6a02a83d1cb49e1227e75a30426dea94d4cb2",
  "sig": "a72f12c08f18e85d98fb92ae89e2fe63e48b8864c5e10fbdd5335f3c9f936397a6b0a7350efe251f8168b1601d7012d4a6d0ee6eec958067cf22a14f5a5ea579"
}
```

### See also

- [FEP-fffd: Proxy Objects](https://codeberg.org/fediverse/fep/src/branch/main/fep/fffd/fep-fffd.md)
- [Mostr bridge](https://mostr.pub/)