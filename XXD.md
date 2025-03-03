NIP-XXD
=======

Event Edit Requests
-------------------

`draft` `optional`

This NIP introduces a protocol allowing any Nostr user to submit an edit request for any addressable event initially authored by another user. It aims to streamline collaborative editing while maintaining clear identification of original and requested contents.

## Edit Request Event Kind

Edit requests are a `kind: 1501` **regular** event with the following structure:

### Event Structure

An edit request consists of a JSON object with the following structure:

```jsonc
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the edit requestor>,
  "created_at": <Unix timestamp in seconds>,
  "kind": 1501,
  "content": "{
    \"tags\": <proposed new tag contents>,
    \"content\": <proposed new content string>
  }",
  "tags": [
    ["a", "<kind integer>:<32-bytes lowercase hex of the original author pubkey>:<d tag value>", "<relay-url>"] // Coordinates to the event being edited
  ],
  "sig": <64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data>
}
```

### Tags

- `a` (anchor): Required. Points to the addressable event that the user wants to edit.

### Content

The `.content` field is a JSON string containing the proposed changes (new ".content" and ".tags") to the original event. It should contain all contents that the requestor would like to see in the updated event (i.e. Not just the changes, but the full new content).

## Edit Request response event

The author of the original event can respond to an edit request by creating a `kind: 1502` **regular** event with the following structure:

```jsonc
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key>,
  "created_at": <Unix timestamp in seconds>,
  "kind": 1502,
  "content": "<APPROVE|REJECT>",
  "tags": [
    ["e", "<32-bytes lowercase hex of the kind:1501 edit request event id>", "<relay-url>"] // Reference to the edit request event
  ],
  "sig": <64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data>
}
```

This event is used simply to communicate the author's decision on the edit request, in order to provide the requester with feedback on the proposed changes. Clients and relays SHOULD send these events to improve the user experience by providing feedback on the edit request, so that the requester's client can update the UI accordingly.

## Edit Request Workflow

1. A user creates an edit request event with the proposed changes and tags pointing to the event to be edited.
2. The edit request is broadcasted to the network.
3. The author of the original event receives the edit request. The author can either approve or reject the edit request:
    - If the author approves the edit request, they create a response event with the `APPROVE` content, applies the proposed changes to the original event, and broadcasts the updated event.
    - If the author rejects the edit request, they create a response event with the `REJECT` content.

## Intended Use Cases

- Apps/Features that enable collaborative enhancements in articles, posts, or any addressable nostr event.
- Enabling nostr entities to be collaboratively editable by multiple users (e.g. Tasks, Kanban boards, wikis, etc).
  - This can be through a human editorial flow, or through automated systems that automatically approve or reject edit requests based on programmatic rules.
