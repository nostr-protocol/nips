NIP-XXA
=======

Tasks
-----

`draft` `optional`

This NIP defines `kind:35001` (an _addressable event_) for tasks, generally referred to as "tasks", "to-do items", or "reminders".

This NIP intentionally does not define any information about workflows, states, authorization mechanisms, or any other complex task management features, as the needs and requirements for these vary greatly between different applications and use cases. This NIP is meant to be used only as a base for more complex task management systems, and only focuses on the basic information that models a task itself.

Workflows, states, and other task management features can be implemented on top of this NIP, and can be shared between different applications and services using the same base task model.

## Format and Structure of Task Events

### Event Kind

The `kind` of these events MUST be `35000`, which is an _addressable event_ as defined in [NIP-01](01.md).

### Content

The `.content` of these events MUST be used as the description of a task, and should be a string text in Markdown format, following [NIP-23](23.md) conventions.

Clients MAY render any inline [Nostr URI](21.md) into a rich interactive object or widget, to allow for easy navigation and interaction with the referenced content with improved user experience, or as simple hyperlinks.

### Metadata and Tags

- `"d"`, for a unique identifier for the task

Other metadata fields can be added as tags to the event as necessary. Here we standardize a few that may be useful, although they remain strictly optional:
- `"title"`, for the task title
- `"image"`, for a URL pointing to an image to be shown along with the title
- `"published_at"`, for the timestamp in unix seconds (stringified) of the first time the task was created
- `"due_at"`, for the timestamp in unix seconds (stringified) of the due date of the task
- `"archived"`, for a boolean value indicating whether the task is archived or not. If the task is archived, it SHOULD be generally hidden from the user interface, unless the user specifically requests to see archived tasks.
- `"t"`, for generic tags that can be used to categorize the task, which can be any string (e.g. `"work"`, `"personal"`, `"urgent"`, etc.)
- `"p"`, for referencing other users and their roles in the task (See below)

Other tags can be added as necessary, but they should be standardized and documented in a separate NIP. Clients SHOULD ignore any tags they do not understand.

#### Referencing Users

The `p` tag is used to reference other users and their roles in the task. The tag should be an array with the following structure:

```jsonc
["p", "<32-bytes hex of a pubkey>", "<optional role>"]
```

The role is optional, and this NIP only standardizes the following values:
- (Empty): The user is mentioned or CC'd in the task, but has no specific role.
- `"assignee"`: The user is assigned to the task.
- `"client"`: The user is the client or requester of the task.
- (Any other value): Any other role that is not standardized by this NIP, which for the purposes of this NIP is treated the same as an empty role.

### Editability and multi-user collaboration

These tasks are editable in the same way as any other addressable event. To keep in compliance with [NIP-01](01.md), the authoring pubkey is the ultimate authority on the source of truth for the task data.

For clarity, clients and servers MUST NOT decide on a source of truth based on a set of events signed by different pubkeys, because that will break anchor tags of addressable events and is in violation of [NIP-01](01.md).

This does not constrain the possibilities and use cases, because any possible multi-user editing logic can be implemented using some combination of:
- [Edit Requests](XXD.md) to propose changes to the task, with _(optionally)_ scripts that listens to them and approves/rejects based on any arbitrarily complex logic.
- FROST signature schemes (or any other multisig/key-splitting technique) to split the private key that signs these events and allow n-of-N multisig schemes

## Example Event

```json
{
  "kind": 35000,
  "created_at": 1675642635,
  "content": "This task is a placeholder for the description of the task. It should be written in [Markdown](https://github.github.com/gfm). Here is another task: nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu. Please talk to this user for more information: nostr:npub13v47pg9dxjq96an8jfev9znhm0k7ntwtlh9y335paj9kyjsjpznqzzl3l8",
  "tags": [
    ["d", "333e500a-7d80-4e7b-beb1-ad1956a6150a"],
    ["title", "Example task"],
    ["published_at", "1296962229"],
    ["t", "examples"],
    ["p", "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87", "assignee"],
    ["due_at", "1298962229"]
  ],
  "pubkey": "...",
  "id": "..."
}
```
