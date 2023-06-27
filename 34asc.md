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
// Use this same value even if your programming language allows a higher one
const maxDateNowSeconds = 8640000000000 // 8.64e15 ms / 1000
// Equals 17280000000000. It is ok because it is lower than Number.MAX_SAFE_INTEGER
// We multiply by 2 because of "ts = seconds + maxDateNowSeconds" below
const maxTs = maxDateNowSeconds * 2
const maxSecondsLength = maxTs.toString().length

function getNip34asc (createdAt, id = '') {
  // The id length must always be the same to not affect sorting
  // All relays must use the same length
  if (id.length !== 64) { throw new Error('Wrong id length') }
  let seconds = Math.trunc(createdAt) // Make sure it is int instead of float
  if (Number.isNaN(seconds)) { throw new Error('Wrong createdAt') }
  seconds = Math.max(seconds, -maxDateNowSeconds) // Keep min limit
  seconds = Math.min(seconds, maxDateNowSeconds) // Keep max limit
  // Allow negative createdAt but remove minus sign
  // because '-2' string timestamp is wrongly higher than '-1'
  let ts = seconds + maxDateNowSeconds
  // Make it lower the greater the ts is (the newer the createdAt is)
  ts = maxTs - ts
  // '10' is wrongly lower then '2' while '10' is higher than padded '02'
  const paddedTsSeconds = ts.toString().padStart(maxSecondsLength, '0')

  // Event id is used as a fixed length unique identifier
  return `${paddedTsSeconds}${id}`
}

event.nip34asc = getNip34asc(event.created_at, event.id)
```
