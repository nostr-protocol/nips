NIP-34seen
==========

Seen At
-------

`draft` `optional` `author:arthurfranca` `author:mikedilger`

Events are desc sorted by first seen at timestamp.

## Motivation

Some `clients` may want to check if `relay` has recently received old events
created before last time they checked.

## Implementation

`Relay` computes `nip34seen` field once upon receiving the event.

The event field is set with the timestamp of the moment the `relay` first became aware of it.

### Javascript

```js
event.nip34seen = Math.floor(Date.now() / 1000)
```
