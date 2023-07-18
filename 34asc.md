NIP-34asc
=========

Ascending
---------

`draft` `optional` `author:arthurfranca`

Events with older `created_at` are retrieved first.

## Motivation

For thread building it may better showing first comments at top to make it easier to understand
the context of newer comments.

## Implementation

`Relay` computes `nip34asc` field once upon receiving the event.

The lower the `created_at`, the higher `nip34asc` will be.

### Javascript

```js
function getNip34asc (createdAt) {
  const maxDateNowSeconds = 8640000000000 // 8.64e15 ms / 1000

  // Make it lower the greater the ts is (the newer the createdAt is)
  // maxDateNowSeconds - -maxDateNowSeconds equals 17280000000000 and is lower than Number.MAX_SAFE_INTEGER
  return maxDateNowSeconds - createdAt
}

event.nip34asc = getNip34asc(event.created_at)
```
