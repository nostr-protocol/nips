NIP-07
======

`window.nostr` capability for web browsers
------------------------------------------

`draft` `optional`

The `window.nostr` object may be made available by web browsers or extensions and websites or web-apps may make use of it after checking its availability.

That object must define the following methods:

```
async window.nostr.getPublicKey(): string // returns a public key as hex
async window.nostr.signEvent(event: { pubkey?: string, created_at: number, kind: number, tags: string[][], content: string }): Event // takes an event object, adds `id`, `pubkey` and `sig` and returns it
```

Aside from these two basic above, the following functions can also be implemented optionally:
```
async window.nostr.nip04.encrypt(pubkey, plaintext, current_user?): string // returns ciphertext and iv as specified in nip-04 (deprecated)
async window.nostr.nip04.decrypt(pubkey, ciphertext, current_user?): string // takes ciphertext and iv as specified in nip-04 (deprecated)
async window.nostr.nip44.encrypt(pubkey, plaintext, current_user?): string // returns ciphertext as specified in nip-44
async window.nostr.nip44.decrypt(pubkey, ciphertext, current_user?): string // takes ciphertext as specified in nip-44
```

`pubkey` on the event object and `current_user` on the encryption functions both name the user key to act with. When set, the signer must use that key or reject the request. Signers that predate this may ignore it silently, so clients should check the `pubkey` of the event returned by `signEvent`.

### Recommendation to Extension Authors
To make sure that the `window.nostr` is available to nostr clients on page load, the authors who create Chromium and Firefox extensions should load their scripts by specifying `"run_at": "document_end"` in the extension's manifest.


### Implementation

See https://github.com/aljazceru/awesome-nostr#nip-07-browser-extensions.
