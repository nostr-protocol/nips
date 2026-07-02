NIP-AD
======

Web Addresses for Nostr things
------------------------------

`final` `optional`

This NIP defines how to make URLs that can both work as normal URLs or have Nostr counterparts.

Such URLs, when pasted on a Nostr client, can be turned into a single event (specially when the filter has `"limit": 1`) or a list of events, and handled accordingly. When used in a normal web browser it can just render HTML like any normal web URL.

To get the Nostr counterpart of any URL, call that URL's domain at path `https://<domain>/.well-known/nostr.json?ad=<original-path>` and look for a key with the desired path in the resulting object. That should contain an object with `{"filter": {<any-nostr-filter>}, "relays": [<relay-to-use>, ...]}`. `"relays"` is optional. If it doesn't exist the `kind:10002` "write" relays of the authors in the filter should be used.

For example, upon seeing the URL `https://golf.com/players`, a client will make a `GET` request to `https://golf.com/.well-known/nostr.json?ad=/players` and get a response like:

```yaml
{
  "/players": {
    "filter": {
      "kinds": [30000],
      "#d": ["players"],
      "authors": ["da12d96d63e31383a5b526bdc747ae1a41aa580a4f962aadfd134b631edd43dd"],
      "limit": 1
    },
    "relays": [
      "wss://relay.golf.com"
    ]
  }
}
```

Why this convoluted scheme involving `/.well/known/nostr.json` and paths as object keys? That's to be friendly to static sites.

## Some notable use cases

1. [NIP-29](29.md) group names: `groups.com/quiche` resolves to a `kind:39000` on a specific relay, avoiding the need for group id farming.
2. [NIP-5A](5A.md) nsites: `nsites.com/something` resolves to an nsite event.
3. Hosted feeds: servers can create feeds using whatever algorithm they want and publish those simply as a `{"ids": [...]}` filter, or something else.
4. People that have websites and blogs fueled by Nostr content can have those sites exist both natively inside Nostr and to people living outside. This also works for `https://njump.me/nevent1...` or client-specific URLs like `https://yakihonne.com/nevent1...`.
5. This fixes pasted links: when a user pastes a URL on a Nostr client the client can preemptively try to resolve that URL into an event and make a native reference instead.
