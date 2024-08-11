NIP-68
======

Shared Replaceables
-------------------

`draft` `optional`

This NIP creates replaceable events that any public key in the list of editors can change. Editors can also add and remove new editors. 

Every shared replaceable MUST be signed with its own private key. The event owns itself. 

The event's private key MUST be shared with all editors through `p` tags. The key is [NIP-44](44.md)-encrypted to each editor and placed as the 4th element in a regular `p` tag.

```js
val editingKeyPair = nostr.generateKeyPair()

{
  "pubkey": editingKeyPair.publicKey
  "kind": 3xxxx or 1xxxx,
  "tags": [
    ["d", "<unique identifier>"]
    ["p", "<pubkey 1>", "<relay url>", nip44Encrypt(editingKeyPair.privateKeyHex, editingKeyPair.privateKey, "<pubkey 1>") ]
    ["p", "<pubkey 2>", "<relay url>", nip44Encrypt(editingKeyPair.privateKeyHex, editingKeyPair.privateKey, "<pubkey 2>") ]
  ],
  "content": "",
  "sig": signWith(editingKeyPair.privateKey)
  // ...
}
```

Any replaceable event kind can be shared among editors. 

To update the event, receivers MUST: 
1. find the ciphertext in the `p`-tag for their key
2. decrypt the ciphertext with `nip44Decrypt(tag[3], user.privatekey, event.pubkey)` to get the event's private key in hex.
3. use the event's private key to sign. 

## Encrypted Shared Replaceables

Some use cases require separate editing and viewing permissions: the `.content` can be encrypted so that only users with viewing permissions can see the information. 

To achieve this dynamic, the replaceable event MUST own two shared private keys: one for editing and one for viewing. 

Both keys are shared as encrypted `p` tags between the editing key and each user's public key. 

The `.content` is then encrypted from the editing private key to the viewing public key. 

```js
val editingKeyPair = nostr.generateKeyPair()
val viewingKeyPair = nostr.generateKeyPair()

{
  "pubkey": editingKeyPair.publicKey
  "kind": 3xxxx or 1xxxx,
  "tags": [
    ["d", "<unique identifier>"]
    ["p", "<pubkey 1>", "<relay url>", nip44Encrypt(editingKeyPair.privateKeyHex, editingKeyPair.privateKey, "<pubkey 1>") ]
    ["p", "<pubkey 2>", "<relay url>", nip44Encrypt(editingKeyPair.privateKeyHex, editingKeyPair.privateKey, "<pubkey 2>") ]
    ["p", "<pubkey 3>", "<relay url>", nip44Encrypt(viewingKeyPair.privateKeyHex,  editingKeyPair.privateKey, "<pubkey 3>") ] // view only
  ],
  "content": nip44Encrypt("some text", editingKeyPair.privateKey, viewingKeyPair.publicKey),
  "sig": signWith(editingKeyPair.privateKey)
  // ...
}
```

To decrypt the event, all receivers MUST: 
1. find the ciphertext in the `p`-tag for their key
2. decrypt the ciphertext with `nip44Decrypt(tag[3], user.privatekey, event.pubkey)` to get the event's private key in hex.
3. calculate the public key of the shared key. 
4. if the public key is the same as `.pubkey`, this is an editing key, if not this is the viewing key
5. if it is the editing key, decrypt all the other `p`-tag keys and find the viewing key
6. once the viewing key is known, decrypt the `.content` with `nip44Decrypt(event.content, viewingKeyPair.privatekey, event.pubkey)`
7. use the editing key to sign if known

### Special Case: No Viewing Keys

When the group of users with viewing permissions is empty, there won't be a `p`-tag to host the viewing key. In those cases, the `.content` MUST be encrypted to the editing public key. 

```js
val editingKeyPair = nostr.generateKeyPair()

{
  "pubkey": editingKeyPair.publicKey
  "kind": 3xxxx or 1xxxx,
  "tags": [
    ["d", "<unique identifier>"]
    ["p", "<pubkey 1>", "<relay url>", nip44Encrypt(editingKeyPair.privateKeyHex, editingKeyPair.privateKey, "<pubkey 1>") ]
    ["p", "<pubkey 2>", "<relay url>", nip44Encrypt(editingKeyPair.privateKeyHex, editingKeyPair.privateKey, "<pubkey 2>") ]
  ],
  "content": nip44Encrypt("some text", editingKeyPair.privateKey, editingKeyPair.publicKey),
  "sig": signWith(editingKeyPair.privateKey)
  // ...
}
```

Similarly, if the receiving client can't find a viewing key, it SHOULD use the editing public key to decrypt: `nip44Decrypt(event.content, editingKeyPair.privateKey, editingKeyPair.publcKey)`

## Final Considerations

If any of the event's private keys are lost due to an encrypting bug or if there is a failure to add the ciphertext in the p-tags before signing, and if relays don't have previous versions of this event, the event might become permanently unmodifiable and undecryptable, which can also be a feature in some use cases.  

The shared viewing key can be rotated at will but not the editing key

There is no proof that pubkeys are participating in this shared replaceable. The presence of `p` tags MUST not imply support for what's written in the event. 