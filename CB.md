NIP-CB
======

Kanban Boards
-------

`draft` `optional`

A Kanban Board is a replaceable `kind 37733` event, which includes a list of column names and a mapping to their associated content.
Columns can contain any nostr event.
Clients are expected to only support a subset of event kinds when rendering Kanban cards.
 

```json
{
  "kind": 37733,
  "content": "",
  "tags": [
    ["d", "<board-identifier>"],
    ["title", "Board Title"],
    ["description", "Board Description"],

    // Use an `E` or `A` tag to associate the board with another event. 
    // For example a GitRepositoryAnnouncement:
    ["A", "30617:<pubkey>:<repo-identifier>"],

    // Columns arranged in the intended order. 
    // Column IDs should be lowercase and alphanumeric.
    ["col", "col-id-1", "To Do"],
    ["col", "col-id-2", "In Progress"],
    ["col", "col-id-2", "Done"],

    // Mapping of events to Column IDs.
    // Tags arranged in the intended order.
    ["e", "b7804254d1ae143aeacb50b2504398a43e2f39abd87141036b7f1cc8aec4069e", "col-id-1"],
    ["a", "<kind>:<pubkey>:<d-identifier>", "col-id-1"],
    ["e", "71cfeb1171960e4ad6f65d7f87c5bf41be9ef4aaf4452fd2f6968c0b340f79d7", "col-id-2"],
  ]
}
```

## Possible extentions to add later

- Dedicated event kind for Kanban Cards
- Multi-user support
