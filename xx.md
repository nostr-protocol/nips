NIP-XX
======

Offset Filter Attribute
-------------------

`draft` `optional` `author:egge7`

Relays may support an additional Filter attribute `offset`, which combined with `limit` allows Clients to get ranges of events.

### Motivation

In order to reduce data usage when fetching historic data, clients need to paginate their subscriptions. With the currently available filter attributes this can become quite complicated, especially when handling subscriptions to multiple relays with different states. By introducing the `offset` attribute we allow Clients to easily build paginated subscriptions.

### Example

Page 1
```json
{
  "authors": [<followedPubkeys>],
  "kinds": [1],
  "limit": 25
}
```
Page 2
```json
{
  "authors": [<followedPubkeys>],
  "kinds": [1],
  "limit": 25,
  "offset": 25
}
```
