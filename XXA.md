NIP-XXA
=======

Tasks
-----

`draft` `optional`

This NIP defines `kind:35000` (an _addressable event_) for tasks, generally referred to as "tasks", "to-do items", or "reminders".

This NIP intentionally does not define any information about workflows, states, authorization mechanisms, or any other complex task management features, as the needs and requirements for these vary greatly between different applications and use cases. This NIP is meant to be used only as a base for more complex task management systems, and only focuses on the basic information that models a task itself.

Workflows, states, and other task management features can be implemented on top of this NIP, and can be shared between different applications and services using the same base task model.

## Format and Structure of Task Events

### Event Kind

The `kind` of these events MUST be `35000`, which is an _addressable event_ as defined in [NIP-01](01.md).

### Content

The `.content` of these events MUST be used as the description of a task, and should be a string text in [Github Flavored Markdown syntax](https://github.github.com/gfm), with the following constraints:
- MUST NOT hard line-break paragraphs of text, such as arbitrary line breaks at 80 column boundaries.
- MUST NOT support adding HTML to Markdown.
- MUST NOT support adding JavaScript to Markdown.

Clients MAY render any inline [Nostr URI](21.md) into a rich interactive object or widget, to allow for easy navigation and interaction with the referenced content, or as simple hyperlinks.

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

### Editability

These tasks are meant to be editable, so they should include a `d` tag with an identifier for the task. Clients should take care to only publish and read these events from relays that implement that. If they don't do that they should also take care to hide old versions of the same tasks they may receive.

For simplicity and flexibility, this NIP does not define a specific mechanism to allow groups of users to edit the same task. This is deliberately left out to allow for different implementations to be built on top of this NIP in a way that best suits the needs of a particular use case. Examples of possible implementations include:
- A single user is assigned to a task, and only that user can edit the task.
- The task is signed using a collaborative signing mechanism, such as a multi-signature or FROST-like scheme.
- The task is signed by an authoritative keypair representing a group/company, and members of a group need to request changes to the task from that entity using [edit requests](XXD.md) or other mechanisms.

### Linking

The task may be linked to using the [NIP-19](19.md) `naddr` code along with the `a` tag.

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
