NIP-17
======

Private Direct Messages
-----------------------

`draft` `optional`

This NIP defines an encrypted chat scheme which uses [NIP-44](44.md) encryption and [NIP-59](59.md) seals and gift wraps.

Any event sent to an encrypted chat MUST NOT be signed, and MUST be encrypted as described in [NIP-59](./59.md) and illustrated below. Omitting signatures makes messages deniable in case they are accidentally or maliciously leaked, while still allowing the recipient to authenticate them.

By convention, `kind 14` direct messages, `kind 15` file messages, and [`kind 7` reactions](./25.md) may be sent to an encrypted chat.

## Kind Definitions

### Chat Message

Kind `14` is a chat message. `p` tags identify one or more receivers of the message.

```jsonc
{
  "id": "<usual hash>",
  "pubkey": "<sender-pubkey>",
  "created_at": "<current-time>",
  "kind": 14,
  "tags": [
    ["p", "<receiver-1-pubkey>", "<relay-url>"],
    ["p", "<receiver-2-pubkey>", "<relay-url>"],
    ["e", "<kind-14-id>", "<relay-url>"] // if this is a reply
    ["subject", "<conversation-title>"],
    // rest of tags...
  ],
  "content": "<message-in-plain-text>",
}
```

`.content` MUST be plain text. Fields `id` and `created_at` are required.

An `e` tag denotes the direct parent message this post is replying to.

`q` tags MAY be used when citing events in the `.content` with [NIP-21](21.md).

```json
["q", "<event-id> or <event-address>", "<relay-url>", "<pubkey-if-a-regular-event>"]
```

## File Message

```jsonc
{
  "id": "<usual hash>",
  "pubkey": "<sender-pubkey>",
  "created_at": "<current-time>",
  "kind": 15,
  "tags": [
    ["p", "<receiver-1-pubkey>", "<relay-url>"],
    ["p", "<receiver-2-pubkey>", "<relay-url>"],
    ["e", "<kind-14-id>", "<relay-url>", "reply"], // if this is a reply
    ["subject", "<conversation-title>"],
    ["file-type", "<file-mime-type>"],
    ["encryption-algorithm", "<encryption-algorithm>"],
    ["decryption-key", "<decryption-key>"],
    ["decryption-nonce", "<decryption-nonce>"],
    ["x", "<the SHA-256 hexencoded string of the file>"],
    // rest of tags...
  ],
  "content": "<file-url>"
}
```

Kind `15` is used for sending encrypted file event messages:

- `file-type`: Specifies the MIME type of the attached file (e.g., `image/jpeg`, `audio/mpeg`, etc.) before encryption.
- `encryption-algorithm`: Indicates the encryption algorithm used for encrypting the file. Supported algorithms: `aes-gcm`.
- `decryption-key`: The decryption key that will be used by the recipient to decrypt the file.
- `decryption-nonce`: The decryption nonce that will be used by the recipient to decrypt the file.
- `content`: The URL of the file (`<file-url>`).
- `x` containing the SHA-256 hexencoded string of the encrypted file.
- `ox` containing the SHA-256 hexencoded string of the file before encryption.
- `size` (optional) size of the encrypted file in bytes
- `dim` (optional) size in pixels in the form `<width>x<height>`
- `blurhash`(optional) the [blurhash](https://github.com/woltapp/blurhash) to show while the client is loading the file
- `thumb` (optional) URL of thumbnail with same aspect ratio (encrypted with the same key, nonce)
- `fallback` (optional) zero or more fallback file sources in case `url` fails (encrypted with the same key, nonce)

## Chat Rooms

The set of `pubkey` + `p` tags defines a chat room. If a new `p` tag is added or a current one is removed, a new room is created with a clean message history.

Clients SHOULD render messages of the same room in a continuous thread.

An optional `subject` tag defines the current name/topic of the conversation. Any member can change the topic by simply submitting a new `subject` to an existing `pubkey` + `p` tags room. There is no need to send `subject` in every message. The newest `subject` in the chat room is the subject of the conversation.

## Encrypting

Following [NIP-59](59.md), the **unsigned** chat messages must be sealed (`kind:13`) and then gift-wrapped (`kind:1059`) to each receiver and the sender individually.

```js
{
  "id": "<usual hash>",
  "pubkey": randomPublicKey,
  "created_at": randomTimeUpTo2DaysInThePast(),
  "kind": 1059, // gift wrap
  "tags": [
    ["p", receiverPublicKey, "<relay-url>"] // receiver
  ],
  "content": nip44Encrypt(
    {
      "id": "<usual hash>",
      "pubkey": senderPublicKey,
      "created_at": randomTimeUpTo2DaysInThePast(),
      "kind": 13, // seal
      "tags": [], // no tags
      "content": nip44Encrypt(unsignedKind14, senderPrivateKey, receiverPublicKey),
      "sig": "<signed by senderPrivateKey>"
    },
    randomPrivateKey, receiverPublicKey
  ),
  "sig": "<signed by randomPrivateKey>"
}
```

The encryption algorithm MUST use the latest version of [NIP-44](44.md).

Clients MUST verify if pubkey of the `kind:13` is the same pubkey on the `kind:14`, otherwise any sender can impersonate others by simply changing the pubkey on `kind:14`.

Clients SHOULD randomize `created_at` in up to two days in the past in both the seal and the gift wrap to make sure grouping by `created_at` doesn't reveal any metadata.

The gift wrap's `p` tag can be the receiver's main pubkey or an alias key created to receive DMs without exposing the receiver's identity.

Clients MAY offer disappearing messages by setting an `expiration` tag in the gift wrap of each receiver or by not generating a gift wrap to the sender's public key. This tag SHOULD be included on the `kind 13` seal as well, in case it leaks.

## Publishing

Kind `10050` indicates the user's preferred relays to receive DMs. The event MUST include a list of `relay` tags with relay URIs.

```jsonc
{
  "kind": 10050,
  "tags": [
    ["relay", "wss://inbox.nostr.wine"],
    ["relay", "wss://myrelay.nostr1.com"],
  ],
  "content": "",
  // other fields...
}
```

Clients SHOULD publish the gift-wrapped `kind 1059` events that contain the sealed rumors to the relays listed in the recipient’s kind 10050 event. If that is not found that indicates the user is not ready to receive messages under this NIP and clients shouldn't try.

## Relays

Relays MAY protect message metadata by only serving `kind:1059` events to users p-tagged on the event (enforced using [NIP 42 AUTH](./42.md)).

Clients SHOULD guide users to keep `kind:10050` lists small (1-3 relays) and SHOULD spread them to as many relays as viable.

## Benefits & Limitations

This NIP offers the following privacy and security features:

1. **No Metadata Leak**: Participant identities, each message's real date and time, event kinds, and other event tags are all hidden from the public. Senders and receivers cannot be linked with public information alone.
2. **No Public Group Identifiers**: There is no public central queue, channel or otherwise converging identifier to correlate or count all messages in the same group.
3. **No Moderation**: There are no group admins: no invitations or bans.
4. **No Shared Secrets**: No secret must be known to all members that can leak or be mistakenly shared
5. **Fully Recoverable**: Messages can be fully recoverable by any client with the user's private key
6. **Optional Forward Secrecy**: Users and clients can opt-in for "disappearing messages".
7. **Uses Public Relays**: Messages can flow through public relays without loss of privacy. Private relays can increase privacy further, but they are not required.
8. **Cold Storage**: Users can unilaterally opt-in to sharing their messages with a separate key that is exclusive for DM backup and recovery.

The main limitation of this approach is having to send a separate encrypted event to each receiver. Group chats with more than 100 participants should find a more suitable messaging scheme.

## Examples

This example sends the message `Hola, que tal?` from `nsec1w8udu59ydjvedgs3yv5qccshcj8k05fh3l60k9x57asjrqdpa00qkmr89m` to `nsec12ywtkplvyq5t6twdqwwygavp5lm4fhuang89c943nf2z92eez43szvn4dt`.

The two final GiftWraps, one to the receiver and the other to the sender, respectively, are:

```json
{
   "id":"2886780f7349afc1344047524540ee716f7bdc1b64191699855662330bf235d8",
   "pubkey":"8f8a7ec43b77d25799281207e1a47f7a654755055788f7482653f9c9661c6d51",
   "created_at":1703128320,
   "kind":1059,
   "tags":[
      ["p", "918e2da906df4ccd12c8ac672d8335add131a4cf9d27ce42b3bb3625755f0788"]
   ],
   "content":"AsqzdlMsG304G8h08bE67dhAR1gFTzTckUUyuvndZ8LrGCvwI4pgC3d6hyAK0Wo9gtkLqSr2rT2RyHlE5wRqbCOlQ8WvJEKwqwIJwT5PO3l2RxvGCHDbd1b1o40ZgIVwwLCfOWJ86I5upXe8K5AgpxYTOM1BD+SbgI5jOMA8tgpRoitJedVSvBZsmwAxXM7o7sbOON4MXHzOqOZpALpS2zgBDXSAaYAsTdEM4qqFeik+zTk3+L6NYuftGidqVluicwSGS2viYWr5OiJ1zrj1ERhYSGLpQnPKrqDaDi7R1KrHGFGyLgkJveY/45y0rv9aVIw9IWF11u53cf2CP7akACel2WvZdl1htEwFu/v9cFXD06fNVZjfx3OssKM/uHPE9XvZttQboAvP5UoK6lv9o3d+0GM4/3zP+yO3C0NExz1ZgFmbGFz703YJzM+zpKCOXaZyzPjADXp8qBBeVc5lmJqiCL4solZpxA1865yPigPAZcc9acSUlg23J1dptFK4n3Tl5HfSHP+oZ/QS/SHWbVFCtq7ZMQSRxLgEitfglTNz9P1CnpMwmW/Y4Gm5zdkv0JrdUVrn2UO9ARdHlPsW5ARgDmzaxnJypkfoHXNfxGGXWRk0sKLbz/ipnaQP/eFJv/ibNuSfqL6E4BnN/tHJSHYEaTQ/PdrA2i9laG3vJti3kAl5Ih87ct0w/tzYfp4SRPhEF1zzue9G/16eJEMzwmhQ5Ec7jJVcVGa4RltqnuF8unUu3iSRTQ+/MNNUkK6Mk+YuaJJs6Fjw6tRHuWi57SdKKv7GGkr0zlBUU2Dyo1MwpAqzsCcCTeQSv+8qt4wLf4uhU9Br7F/L0ZY9bFgh6iLDCdB+4iABXyZwT7Ufn762195hrSHcU4Okt0Zns9EeiBOFxnmpXEslYkYBpXw70GmymQfJlFOfoEp93QKCMS2DAEVeI51dJV1e+6t3pCSsQN69Vg6jUCsm1TMxSs2VX4BRbq562+VffchvW2BB4gMjsvHVUSRl8i5/ZSDlfzSPXcSGALLHBRzy+gn0oXXJ/447VHYZJDL3Ig8+QW5oFMgnWYhuwI5QSLEyflUrfSz+Pdwn/5eyjybXKJftePBD9Q+8NQ8zulU5sqvsMeIx/bBUx0fmOXsS3vjqCXW5IjkmSUV7q54GewZqTQBlcx+90xh/LSUxXex7UwZwRnifvyCbZ+zwNTHNb12chYeNjMV7kAIr3cGQv8vlOMM8ajyaZ5KVy7HpSXQjz4PGT2/nXbL5jKt8Lx0erGXsSsazkdoYDG3U",
   "sig":"a3c6ce632b145c0869423c1afaff4a6d764a9b64dedaf15f170b944ead67227518a72e455567ca1c2a0d187832cecbde7ed478395ec4c95dd3e71749ed66c480"
}
```

```json
{
   "id":"162b0611a1911cfcb30f8a5502792b346e535a45658b3a31ae5c178465509721",
   "pubkey":"626be2af274b29ea4816ad672ee452b7cf96bbb4836815a55699ae402183f512",
   "created_at":1702711587,
   "kind":1059,
   "tags":[
      ["p", "44900586091b284416a0c001f677f9c49f7639a55c3f1e2ec130a8e1a7998e1b"]
   ],
   "content":"AsTClTzr0gzXXji7uye5UB6LYrx3HDjWGdkNaBS6BAX9CpHa+Vvtt5oI2xJrmWLen+Fo2NBOFazvl285Gb3HSM82gVycrzx1HUAaQDUG6HI7XBEGqBhQMUNwNMiN2dnilBMFC3Yc8ehCJT/gkbiNKOpwd2rFibMFRMDKai2mq2lBtPJF18oszKOjA+XlOJV8JRbmcAanTbEK5nA/GnG3eGUiUzhiYBoHomj3vztYYxc0QYHOx0WxiHY8dsC6jPsXC7f6k4P+Hv5ZiyTfzvjkSJOckel1lZuE5SfeZ0nduqTlxREGeBJ8amOykgEIKdH2VZBZB+qtOMc7ez9dz4wffGwBDA7912NFS2dPBr6txHNxBUkDZKFbuD5wijvonZDvfWq43tZspO4NutSokZB99uEiRH8NAUdGTiNb25m9JcDhVfdmABqTg5fIwwTwlem5aXIy8b66lmqqz2LBzJtnJDu36bDwkILph3kmvaKPD8qJXmPQ4yGpxIbYSTCohgt2/I0TKJNmqNvSN+IVoUuC7ZOfUV9lOV8Ri0AMfSr2YsdZ9ofV5o82ClZWlWiSWZwy6ypa7CuT1PEGHzywB4CZ5ucpO60Z7hnBQxHLiAQIO/QhiBp1rmrdQZFN6PUEjFDloykoeHe345Yqy9Ke95HIKUCS9yJurD+nZjjgOxZjoFCsB1hQAwINTIS3FbYOibZnQwv8PXvcSOqVZxC9U0+WuagK7IwxzhGZY3vLRrX01oujiRrevB4xbW7Oxi/Agp7CQGlJXCgmRE8Rhm+Vj2s+wc/4VLNZRHDcwtfejogjrjdi8p6nfUyqoQRRPARzRGUnnCbh+LqhigT6gQf3sVilnydMRScEc0/YYNLWnaw9nbyBa7wFBAiGbJwO40k39wj+xT6HTSbSUgFZzopxroO3f/o4+ubx2+IL3fkev22mEN38+dFmYF3zE+hpE7jVxrJpC3EP9PLoFgFPKCuctMnjXmeHoiGs756N5r1Mm1ffZu4H19MSuALJlxQR7VXE/LzxRXDuaB2u9days/6muP6gbGX1ASxbJd/ou8+viHmSC/ioHzNjItVCPaJjDyc6bv+gs1NPCt0qZ69G+JmgHW/PsMMeL4n5bh74g0fJSHqiI9ewEmOG/8bedSREv2XXtKV39STxPweceIOh0k23s3N6+wvuSUAJE7u1LkDo14cobtZ/MCw/QhimYPd1u5HnEJvRhPxz0nVPz0QqL/YQeOkAYk7uzgeb2yPzJ6DBtnTnGDkglekhVzQBFRJdk740LEj6swkJ",
   "sig":"c94e74533b482aa8eeeb54ae72a5303e0b21f62909ca43c8ef06b0357412d6f8a92f96e1a205102753777fd25321a58fba3fb384eee114bd53ce6c06a1c22bab"
}
```
