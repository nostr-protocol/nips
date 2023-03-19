NIP-46
======

Nostr Connect
------------------------

`draft` `optional` `author:tiero` `author:giowe` `author:vforvalerio87`

## Rationale

Private keys should be exposed to as few systems - apps, operating systems, devices - as possible as each system adds to the attack surface.

Entering private keys can also be annoying and requires exposing them to even more systems such as the operating system's clipboard that might be monitored by malicious apps.


## Terms

* **App**: Nostr app on any platform that *requires* to act on behalf of a nostr account.
* **Signer**: Nostr app that holds the private key of a nostr account and *can sign* on its behalf.


## `TL;DR`


**App** and **Signer** sends ephemeral encrypted messages to each other using kind `24133`, using a relay of choice. 

App prompts the Signer to do things such as fetching the public key or signing events.

The `content` field must be an encrypted JSONRPC-ish **request** or **response**.

## Signer Protocol

### Messages

#### Request

```json
{
  "id": <random_string>,
  "method": <one_of_the_methods>,
  "params": [<anything>, <else>]
}
```

#### Response

```json
{
  "id": <request_id>,
  "result": <anything>,
  "error": <reason>
}
```

### Methods


#### Mandatory 

These are mandatory methods the remote signer app MUST implement:

- **describe**
  - params []
  - result `["describe", "get_public_key", "sign_event", "connect", "disconnect", "delegate", ...]`  
- **get_public_key**
  - params []
  - result `pubkey` 
- **sign_event**
  - params [`event`]
  - result `event_with_signature` 

#### optional


- **connect**
  - params [`pubkey`]
- **disconnect**
  - params []
- **delegate** 
  - params [`delegatee`, `{ kind: number, since: number, until: number }`]
  - result `{ from: string, to: string, cond: string, sig: string }`
- **get_relays**
  - params []
  - result `{ [url: string]: {read: boolean, write: boolean} }` 
- **nip04_encrypt**
  - params [`pubkey`, `plaintext`]
  - result `nip4 ciphertext`
- **nip04_decrypt**
  - params [`pubkey`, `nip4 ciphertext`]
  - result [`plaintext`]


NOTICE: `pubkey` and `signature` are hex-encoded strings.


### Nostr Connect URI

**Signer** discovers **App** by scanning a QR code, clicking on a deep link or copy-pasting an URI.

The **App** generates a special URI with prefix `nostrconnect://` and base path the hex-encoded `pubkey` with the following querystring parameters **URL encoded**

- `relay` URL of the relay of choice where the **App** is connected and the **Signer** must send and listen for messages.
- `metadata`  metadata JSON of the **App** 
    - `name` human-readable name of the **App** 
    - `url` (optional) URL of the website requesting the connection
    - `description` (optional) description of the **App**
    - `icons` (optional) array of URLs for icons of the **App**.

#### JavaScript

```js
const uri = `nostrconnect://<pubkey>?relay=${encodeURIComponent("wss://relay.damus.io")}&metadata=${encodeURIComponent(JSON.stringify({"name": "Example"}))}`
```

#### Example
```sh
nostrconnect://b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4?relay=wss%3A%2F%2Frelay.damus.io&metadata=%7B%22name%22%3A%22Example%22%7D
```



## Flows

The `content` field contains encrypted message as specified by [NIP04](https://github.com/nostr-protocol/nips/blob/master/04.md). The `kind` chosen is `24133`.

### Connect

1. User clicks on **"Connect"** button on a website or scan it with a QR code
2. It will show an URI to open a "nostr connect" enabled **Signer** 
3. In the URI there is a pubkey of the **App** ie. `nostrconnect://<pubkey>&relay=<relay>&metadata=<metadata>`
4. The **Signer** will send a message to ACK the `connect` request, along with his public key

### Disconnect (from App)

1. User clicks on **"Disconnect"** button on the **App**
2. The **App** will send a message to the **Signer** with a `disconnect` request
3. The **Signer** will send a message to ACK the `disconnect` request

### Disconnect (from Signer)

1. User clicks on **"Disconnect"** button on the **Signer**
2. The **Signer** will send a message to the **App** with a `disconnect` request


### Get Public Key

1. The **App** will send a message to the **Signer** with a `get_public_key` request
3. The **Signer** will send back a message with the public key as a response to the `get_public_key` request

### Sign Event

1. The **App** will send a message to the **Signer** with a `sign_event` request along with the **event** to be signed
2. The **Signer** will show a popup to the user to inspect the event and sign it
3. The **Signer** will send back a message with the event including the `id` and the schnorr `signature` as a response to the `sign_event` request

### Delegate

1. The **App** will send a message with metadata to the **Signer** with a `delegate` request along with the **conditions** query string and the **pubkey** of the **App** to be delegated.
2. The **Signer** will show a popup to the user to delegate the **App** to sign on his behalf
3. The **Signer** will send back a message with the signed [NIP-26 delegation token](https://github.com/nostr-protocol/nips/blob/master/26.md) or reject it


