NIP-CB
======

Kanban Boards
-------

`draft` `optional`

A Kanban Board is a replaceable `kind 37733` event, which includes a list of column events.

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

    // Columns have the format `["a", "<coordinate>", "<name>", "<optional-relay-hint>"]` 
    // and are arranged in the intended order. 
    ["a", "<column-kind>:<pubkey>:<d-identifier>", "To Do", "wss://relay.lol"],
    ["a", "<column-kind>:<pubkey>:<d-identifier>", "In Progress", ""],
    ["a", "<column-kind>:<pubkey>:<d-identifier>", "Done"],
  ]
}
```

Columns are `kind 37734` events containing a list of Kanban cards, which can be of any event kind.
Clients are expected to only support a subset of event kinds when rendering Kanban cards.

```json
{
  "kind": 37734,
  "content": "",
  "tags": [
    // Tags arranged in the intended order.
    ["e", "b7804254d1ae143aeacb50b2504398a43e2f39abd87141036b7f1cc8aec4069e", "<relay-hint>"],
    ["a", "<kind>:<pubkey>:<d-identifier>", "<relay-hint>"],
    ["e", "71cfeb1171960e4ad6f65d7f87c5bf41be9ef4aaf4452fd2f6968c0b340f79d7", "<relay-hint>"],
  ]
}
```
  
## Possible extentions to add later

- Define additional actions a client should perform when adding cards to certain columns 
- Dedicated event kind for Kanban cards
- Multi-user support
