NIP-CB
======

Kanban Boards
-------

`draft` `optional`

A Kanban Board is a replaceable `kind 37733` event, which includes a list of column names and a mapping to their associated content.

Columns can contain any nostr event.

Clients are expected to only support a subset of event kinds when rendering Kanban cards.

When a column holds a large number of cards, these cards SHOULD be placed into a `kind 37734 Column reserve` event to prevent the `kind 37733` event from getting too large.


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

    // Column items `["e/a", "<event-id/coordinate>", "<col-id>", "<optional-relay-hint>"]` arranged in the intended order
    ["e", "<event-id>", "col-id-1", "wss://relay.lol"],
    ["a", "<event-coordinate>", "col-id-1", ""],
    ["e", "<event-id>", "col-id-2"],
    ["e", "<event-id>", "col-id-3"],

    // Optional column reserve for holding large amount of cards 
    // `["r", "37734:<pubkey>:<d-identifier", "<col-id>", "<optional-relay-hint>"]`
    ["r", "37734:<pubkey>:<d-identifier", "col-id-3", "wss://relay.lol"],
  ]
}
```

## Column reserve

A column reserve is a replaceable `kind 37734` event that contains a list of Kanban cards, used to offload and reduce the size of the original `kind 37733` event. Its usage is optional but recommended for columns with a large amount of cards.

```json
{
  "kind": 37734,
  "content": "",
  "tags": [
    ["d", "<column-identifier>"],
    
    // Tags arranged in the intended order.
    ["e", "b7804254d1ae143aeacb50b2504398a43e2f39abd87141036b7f1cc8aec4069e", "<relay-hint>"],
    ["a", "<kind>:<pubkey>:<d-identifier>", "<relay-hint>"],
    ["e", "71cfeb1171960e4ad6f65d7f87c5bf41be9ef4aaf4452fd2f6968c0b340f79d7", "<relay-hint>"],
  ]
}
```
  
## Possible extentions to add later

- Different column types
- Dedicated event kind for Kanban cards
- Multi-user support
