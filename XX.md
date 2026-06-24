NIP-XX
======

Improved event signing scheme
----------------------------------------------------

`draft` `optional`

This NIP describes a new event signature scheme that provides greater flexibility
than the existing scheme by allowing signing JSONs with arbitrary properties while
providing backwards compatibility. It is based on [Perkeep's JSON signing](https://perkeep.org/doc/json-signing/).
The signature scheme remains the same as the one described in NIP-01.

## Signing

This NIP adds a new signature property to the event object: `sig_v2`.
This signature is produced as follows:

1. Sign and serialize an event as described in NIP-01.
2. Remove any trailing whitespace from the serialized string such that the last element is the character `}`.
3. Remove the aforementioned `}` character.
4. Let `h` be the hex-encoded sha256 hash of what remains of the serialized event after steps 1 to 3.
5. Let `s` be the hex-encoded signature of `h`.
6. Append `,"sig_v2":"<s>"}`, where `<s>` is replaced with `s`.

## Verifying

1. Start  with a serialized signed event as described above.
2. Find the last occurrence of the substring `,"sig_v2":"<s>"}` in the serialized event.
3. Let `h` be the hex-encoded sha256 hash of the string starting from the beginning of the serialized event upto
   the match location (ending at the character before `,`).
5. Take the string from the beggining of the serialized event upto the match location, append a single `}` character and
   parse it into a JSON object.
6. Let `p` be the hex-encoded pubkey provided by the JSON field `pubkey` of the aforementioned object.
7. Take the string starting from the match in step 3 until the end of the serialized event, replace the `,` character
   with `{` and parse it into a JSON object.
8. Let `s` be the hex-encoded signature provided by the JSON field `sig_v2` of the aforementioned object.
9. Verify that `s` is a valid signature of `h` with public key `p`.

## Backwards compatibility

### Relays

Relays that don't support this NIP can either ignore or remove the unknown fields. In case they are ignored, the relay will not be able to verify
that their contents have not been modified. This is not a big concern, since clients that support this NIP will be able to perform
the appropriate verification on their end.

## Clients

Clients that do not support this NIP can safely ignore the unknown fields. Since there are no NIPs that make use of custom fields at the time
of writing, this can only impact future additions to the protocol.
