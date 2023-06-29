NIP-36
======

Sensitive Content / Content Warning
-----------------------------------

`draft` `optional` `author:fernandolguevara`

The `content-warning` tag enables users to specify if the event's content needs to be approved by readers to be shown.
Clients can hide the content until the user acts on it.

`l` and `L` tags MAY be also be used as defined in [NIP-32](32.md) with the `content-warning` or other namespace to support
further qualification and querying.

#### Spec

```
tag: content-warning
options:
 - [reason]: optional
```

#### Example

```json
{
    "pubkey": "<pub-key>",
    "created_at": 1000000000,
    "kind": 1,
    "tags": [
      ["t", "hastag"],
      ["L", "content-warning"],
      ["l", "reason", "content-warning"],
      ["L", "social.nos.ontology"],
      ["l", "NS-nud", "social.nos.ontology"],
      ["content-warning", "reason"] /* reason is optional */
    ],
    "content": "sensitive content with #hastag\n",
    "id": "<event-id>"
}
```
