NIP-FA
======

Kind-scoped follows
-------------------

`draft` `optional`

This NIP defines kind `967`, a kind-scoped follow event.

```jsonc
{
  "kind": 967,
  "tags": [
    ["p", "<followed-pubkey>", 'relay-url'],
    ["k", "<some-kind>"],
    ["k", "<some-other-kind>"]
  ]
}
```

Multiple `p` tags and multiple `k` tags are allowed.

The `k` tag(s) define the scope of the follows.

### Unfollow action

Unfollowing is done by deleting the follow event, copying over the `k` tags from the follow event.

```jsonc
{
  "kind": 5,
  "tags": [
    ["e", "<follow-event-id>"],
    ["k", "<some-kind>"],
    ["k", "<some-other-kind>"]
  ]
}
```

### Constructing specialized follow lists

A client can fetch the events of the kinds they are interested in, and perhaps adjacent kinds if they choose to. For example, a client specialized in videos might also want to extend its computed follow list to include events related to live streams.

Clients can use the last `kind:967` and `kind:5` tagged with a `k` they care about and use the last `created_at` they have seen to REQ for updates.
