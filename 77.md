NIP-77: Trust
=============

`draft` `optional` `wot`

This NIP defines a standard for expressing trust in another user. Trust has a specific context and a few optional parameters. A replaceable event of `kind:30077` is used for this purpose.

Trust
-----

The user who signs the Trust event is the truster.
The pubkey of the trusted user MUST be specified in the `"p"` tag of the event. Optionally the relay can be specified where the trusted user's trust events can be found.

The trust context MUST be specified in the `"c"` tag.
The special value `*` represents general trust in the person.
An arbitrary string value (like `science`) can be used to restrict validity of trust. Alternatively, context can be a reference to external description of the context, using `naddr...` or `nevent...` ID's.

The optional tag `"score"` SHOULD be an integer between 0 and 100, inclusive. 100 means full trust and 0 means that the person is not trusted in the specified context at all.

A Trust event is transitive by default (e.g. Alice trusts Bob, Bob trusts Charlie, therefore Alice trusts Charlie). Non-transitive Trust events MUST contain the `["transitive", "false"]` tag.

A Trust event can be revoked by its author. Revoked Trust events MUST contain the `["revoked", "true"]` tag.

Additional tags MAY be used to further describe other properties of the Trust event.

Verbal description of circumstances MAY be added to the `"content"` field.

The `"d"` tag of the replaceable event MUST be a concatenation of the trusted user's pubkey and the context, using a `"/"` as a separator between them.

## Trust event definition

```js
{
  "id": "<id-of-trust-event>",
  "kind": 30077,
  "tags": [
    ["d", "<pubkey-of-trusted-user>/<context>"],
    ["p", "<pubkey-of-trusted-user>", ["<relay1>", ,..]],
    ["c", "<context>"],
    ["transitive", "false"],
    ["score", "100"],
    ["confidence", "80"],
    ...
  ],
  "content": "We worked 2 years together in the factory.",
  "pubkey": "<pubkey-of-truster>",
  "sig": "<signature-of-truster>"
  ...
}
```

## Querying

Trust events can be fetched by REQ filters specifying the truster (`"authors": ["..."]`), the trusted user (`"#p": ["..."]`) or the context (`"#c": ["..."]`), or any combinations of them.

## Notes

Trust events MAY be sent privately to users, relays or filtering algorithms using NIP-59 gift wraps.

When a transitive Trust event is revoked, the whole sub-tree of the web-of-trust disappears. Clients that do the revoking MAY offer the user a way to pick users from the removed sub-tree, if applicable.
