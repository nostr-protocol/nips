NIP-18
======

Reposts
-------

`draft` `optional` `author:jb55` `author:fiatjaf` `author:arthurfranca`

A repost is a `kind 6` event that is used to signal to followers
that a `kind 1` text note is worth reading.

The `content` of a repost event is _the stringified JSON of the reposted note_. It MAY also be empty, but that is not recommended.

The repost event MUST include an `e` tag with the `id` of the note that is
being reposted. That tag MUST include a relay URL as its third entry
to indicate where it can be fetched.

The repost SHOULD include a `p` tag with the `pubkey` of the event being
reposted.

## Quote Reposts

Quote reposts are `kind 1` events with an embedded `e` tag
(see [NIP-08](08.md) and [NIP-27](27.md)). Because a quote repost includes
an `e` tag, it may show up along replies to the reposted note.

## Generic Reposts

Since `kind 6` reposts are reserved for `kind 1` contents, we use `kind 16`
as a "generic repost", that can include any kind of event inside other than
`kind 1`.

`kind 16` reposts SHOULD contain a `k` tag with the stringified kind number
of the reposted event as its value.
