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
// Use this same value even if your programming language allows a higher one
// It is ok because it is lower than Number.MAX_SAFE_INTEGER
const maxDateNowSeconds = 8640000000000 // 8.64e15 ms / 1000
const maxSecondsLength = maxDateNowSeconds.toString().length

function getNip34seen (id = '') {
  // The id length must always be the same to not affect sorting
  // All relays must use the same length
  if (id.length !== 64) { throw new Error('Wrong id length') }
  let seconds = Math.trunc(Date.now() / 1000) // Make sure it is int instead of float
  // don't allow negative timestamp as new Date(-1) is on year 1969
  if (seconds < 0) { throw new Error('Wrong server clock') }
  seconds = Math.min(seconds, maxDateNowSeconds) // Keep max limit
  // '10' is wrongly lower then '2' while '10' is higher than padded '02'
  const paddedTsSeconds = seconds.toString().padStart(maxSecondsLength, '0')

  // Event id is used as a fixed length unique identifier
  return `${paddedTsSeconds}${id}`
}

event.nip34seen = getNip34seen(event.id)
```
