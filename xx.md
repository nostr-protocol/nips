NIP-XX
======

Nostr Token Login
-----------------

`draft` `optional` `author:arthurfranca`

Defines a token to create a session to login without using the primary private key.

It is shown to user as a `ntoken` [NIP-19](#19.md) entity.

The token is usually created by the app trusted to store the user's private key.

Then the user can paste the `ntoken` at other apps it wants to login.

The `ntoken` entity encodes a disposable private key and [NIP-26](26.md)
delegation tag entries, effectively delegating event signing rights from
the user's private key to the disposable keypair for a configured time period.
It should also encode relay(s) where one can find the user's metadata events.

Clients supporting "Nostr Token Login" can use the disposable delegatee's
private key and the delegation tag to freely sign events on behalf of the user's
private key until the configured duration expires.

## Recommended NIP-26 Setup

It is advisable to give all but kind `5` (deletion) rights, require inserting
`z` tags with both pubkeys (from delegatee and delegator) on events and
limit `created_at` range between the current moment and 15h ahead.

Example delegation condition string:

`kind=-5&created_at>1695516361&created_at<1695570361&#z=<delegatee_pubkey>&#z=<delegator_pubkey>`
