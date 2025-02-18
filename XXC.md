NIP-XXC
=======

Simple Kanban Board Workflow
----------------------------

`draft` `optional`

This NIP defines a Kanban board workflow, building on [NIP-XXA](XXA.md) for tasks. This proposal allows tasks to be organized within a Kanban board using definable states, linked tasks, and sorting order.

The Kanban board is a simple workflow tool that allows users to visualize tasks in different states of completion. Each task is represented as a card that can be moved between different columns, each representing a different state of completion.

This is useful for use cases similar to apps such as Trello, Asana, Jira, Github Projects, and to model business processes that require multiple stages of completion.

# Kanban board event format

## Event Kind

The `kind` of these events MUST be `35001`, and this is meant to be an _addressable_ event as defined in [NIP-01](01.md).

## Content

The `.content` of a kanban board event MUST be a JSON string defining the permissible states for tasks. The JSON should be in the following format:

```jsonc
{
  "title": <title string>,
  "description": <OPTIONAL description string>,
  "states": [
    {"id": <id string>, "label": <label string>, "color": <OPTIONAL color value>},
    <other possible states>
  ]
}
```

The `states` array MUST contain at least one state object. Each state object MUST have the following fields:
- `id`: A unique identifier for the state within the board. This identifier MUST be unique within the board. (e.g., "todo", "in-progress", "in-review", "done")
- `label`: A human-readable label for the state. (e.g., "To Do", "In Progress", "In Review", "Done")
- `color`: An optional color value for the state, to provide a visual cue. See the "Colors" section below for allowed values.

Other fields MAY be added to the Content JSON, on other NIPs that extend this one.

### Colors

The `color` field can have any of the following values:
- One of the following preset colors:
  - "red"
  - "orange"
  - "yellow"
  - "green"
  - "cyan"
  - "blue"
  - "purple"
- A hex RGB color code (e.g., `#FF0000`).

Clients MAY choose to display the color in the UI, but it is not required. The color is intended only to provide a visual cue to users.

The exact color codes for the preset colors is not specified and is left to the discretion of the client to match their own color scheme.

## Tags

Each task on the Kanban board should be added using an `a` anchor tag. These tags reference the task events defined in [NIP-XXA](XXA.md). The tags are structured as follows, with one dedicated value for the task's current state within the Kanban board:

```jsonc
"tags": [
  ["a", "35000:<32-bytes lowercase hex of task author's pubkey>:<task d-identifier>", "<state id string>"],
  ["a", "35000:<32-bytes lowercase hex of task author's pubkey>:<task d-identifier>", "<state id string>"],
  ["a", "35000:<32-bytes lowercase hex of task author's pubkey>:<task d-identifier>", "<state id string>"],
  // Other tasks can be added similarly.
]
```

The `state id string` MUST match one of the `id` values defined in the Kanban board's `.content` JSON.

Clients SHOULD by default display the tasks in the order they are listed in the `tags` array, from top to bottom. If the client allows users to reorder tasks, the client MUST update the `tags` array sorting order accordingly. However, the client MAY choose to display tasks in a different order based on other criteria, such as due date or priority, sorting filters, etc.

Other required tags:
- `d`: The board's unique identifier

Optional tags:
- `p`: MAY be interpreted as the board's participant list, which could be used by clients and relays to determine who is allowed to view or edit the board, but the exact interpretation is left to the implementation.

### Linking Kanban and Tasks

When a task's status changes within this board, the tag's state value should update to reflect its new position in the workflow sequence.

### Multi-user editing

This NIP explicitly does not define how different users can edit the same board, since different use cases may require different solutions.

However, here are some possible approaches (listed here for inspiration, but not a requirement):
- A single authoritative private/public keypair that represents a group/team of users, and produce/sign new board updates, by having a program listen to [edit requests](XXD.md) from any of the group members, and automatically approving/rejecting them based on the group's rules.
  - This program could be simple or very complex with a lot of rules on who can edit what, when, and how — to fit several business use cases.
- A FROST-like key scheme can be used to require multiple signatures from different users to approve a change to the board.
- A board can be owned and controlled by a single user, publishing the board to private relays (single-user apps)
- A board can be controlled by a single user, but allow other users to view it.
- A client could listen to board events from a group of users and choose to display the board based on the most recent event it has seen from any of the users, or somehow "merge" different users' boards.

## Intended use cases

- Trello-like boards for personal or team task management.
- Business process workflows that require multiple stages of completion.
