NIP-XXC
=======

Simple Kanban Board Workflow
----------------------------

`draft` `optional`

_Draft note: Some content was taken from https://github.com/nostr-protocol/nips/pull/1665/files, the credit to some of the content and ideas should go to the author_

This NIP defines a Kanban board workflow, and is a **Workflow** as described in [NIP-XXE](XXE.md). This proposal allows tasks to be organized within a Kanban board using definable states, linked tasks, and sorting order.

The Kanban board is a simple workflow tool that allows users to visualize tasks in different states of completion. Each task is represented as a card that can be moved between different columns, each representing a different state of completion.

This is useful for use cases similar to apps such as Trello, Asana, Jira, Github Projects, and to model business processes that require multiple stages of completion.

# Kanban board event format

The Kanban board is an _addressable_ event as defined in [NIP-01](01.md), with `kind:35002`. Here is the format:

```javascript
{
    "created_at": 1740274054, //<Unix timestamp in seconds>
    "kind": 35002,
    "content": "",   // Not used
    "tags": [
        ["d", "<board-d-identifier>"],
        ["title", "<board-title>"],
        ["description", "<board-description>"], // NIP-23 markdown
        ["alt","A board to track my work"], // Human-readable plaintext summary to be shown in non-supporting clients — as per NIP-31

        // List of all columns in the board below ["col","<column-id>","<column-label>", "<optional color value>"]. The order in which they appear MUST match the order here
        ["col", "to-do", "To Do", "gray"],
        ["col", "in-progress", "In Progress", "blue"],
        ["col", "done", "Done", "green"],

        // Clients may designate a 'maintainers' list who can add/edit cards in this board
        [ "p", "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2" ],
        [ "p", "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52" ],
        [ "p", "460c25e682fda7832b52d1f22d3d22b3176d972f60dcdc3212ed8c92ef85065c" ],
    // other fields...
    ]
}
```

To find out which tasks/cards are in the board, clients MUST query [Tracker events](XXE.md) authored by any of the maintainers list AND are linked back to this workflow.

In case there are no `p` tags to designate maintainers, the owner of the board is the only person who can publish cards on the boards.

### Colors

The `color` field for a column can have any of the following values:
- One of the following preset colors:
  - "red"
  - "orange"
  - "yellow"
  - "green"
  - "cyan"
  - "blue"
  - "purple"
  - "gray"
- A hex RGB color code (e.g., `#FF0000`).

Clients MAY choose to display the color in the UI, but it is not required. The color is intended only to provide a visual cue to users, but text labels are always required — for accessibility purposes.

The exact color codes for the preset colors is not specified and is left to the discretion of the client to match their own color scheme.

## Tracker event

As per [NIP-XXE](XXE.md), `kind:35000` tracker events are used for tracking tasks/items within a kanban board.

Furthermore, this NIP makes use of the RESERVED fields in `kind:35000` tracker events, in the following manner:
1. `"content"` MUST be set to the column id representing the state of the task/item, or should be left EMPTY (`""`)
  1. If empty, and the `"tracked_item"` is a second `kind:35000` tracker event, the state/status of the task MUST be the one specified in the second tracker event. If it refers to a column id not present in the current board, the client MAY temporarily display those special columns, or in one catch-all "other" column.
2. The `"rank"` tag is used to denote manual ordering within columns — items MAY be displayed in the ascending order of rank by default
  - **Example:** `["rank","10"]`
3. All other RESERVED tags have the same meaning and use as [NIP-XXA](XXA.md).
  1. If the `"tracked_item"` refers to a `kind:35001` task event ([NIP-XXA](XXA.md)), the Client SHOULD combine/merge tag content for display as follows:
    - `"title"`, `"image"`, `"published_at"`, `"due_at"`, and `"archived"` fields in the tracker SHOULD override the fields on the original `kind:35001` event
    - `"t"` and `"p"` tags SHOULD be combined in both events (set union operation)
  2. If `"tracked_item"` refers to a second `kind:35001` tracker event, the same rules as point `3.1` above apply — recursively — as in a chain.


### Editability and multi-user collaboration

This NIP follows the same standards and rules for multi-user collaboration as [NIP-XXA](XXA.md).

## Intended use cases

- Trello-like boards for personal or team task management.
- Business process workflows that require multiple stages of completion.
- Executive kanban boards that would like to keep track of a specific subset of tasks in other kanban boards — with automatic state changes.
