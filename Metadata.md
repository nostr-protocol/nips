NIP-Metadata
======

Metadata events
-----------------------------

`draft` `optional`

Defines a protocol for metadata events. Metadata events hold metadata information about other events, or entities

---
## Kind 34578 — Metadata Event

Metadata events use **kind 34578** (addressable). They are distinguished by their `d` tag and the presence of the `["t", "<sub_type>"]` tag. The content of a metadata event always has a json which is encrypted to the author's pubkey. The shape of the json depends on the sub type of the metadata event

| tag | value |
|-----|-------|
| `d` | depends on the sub-type of the metadata event |
| `t` | `"<sub-type>"` — sub-type of the event |

---


## Examples

User metadata event:

```jsonc
{
  "kind": 34578,
  "pubkey": "abc123...",
  "created_at": 1700000000,
  "tags": [
    ["d", "0:abc123..."],
  ],
  "content": "<nip44-ciphertext of json encrypted to abc123>",
  "sig": "..."
}
```