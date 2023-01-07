NIP-XX
======

Nostr Connect
------------------------

`draft` `optional` `author:tiero` `author:giowe` `author:vforvalerio87`

## Rationale

Having to enter your Nostr private key on each website or random app _sucks_.


## `TL;DR`


**App** (*typically a web app, it generates a random ephemeral keypair*) and **Signer** (*typically a mobile app, it holds the private key of the user that represents his Nostr account*) send to each other `kind:4` encrypted DMs, using a relay of choice. 

App prompts the Signer to do things such as fetching the public key or signing events.

The `content` field must be a JSONRPC-ish **request** or **response**.

## Protocol

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

- `connect`
  - params [`pubkey`]
- `disconnect`
  - params []
- `get_public_key`
  - params []
  - result `pubkey`
- `sign_event`
  - params [`event`]
  - result `signature`

#### optional

- `delegate`
- `get_relays`
- `nip04_encrypt`
- `nip04_decrypt`


### Nostr Connect URI

**Signer** discovers **App** by scanning a QR code, clicking on a deep link or copy-pasting an URI.

The **App** generates a special URI with prefix `nostr://` and base path `connect` with the following querystring parameters

- `target` hexadecimal public key of the **App**
- `relay` URL of the relay of choice where the **App** is connected and the **Signer** must send and listen for messages.
- `metadata`  metadata JSON of the **App** 
    - `url` URL of the website requesting the connection
    - `name` human-readable name of the **App** 
    - `description` (optional) description of the **App**
    - `icons` (optional) array of URLs for icons of the **App**.

#### Example

```sh
nostr://connect?target=<pubkey>&relay=<relay>&metadata={"url": "example.com","name": "Example"}
```



## Flows


### Connect

1. User clicks on **"Connect"** button on a website or scan it with a QR code
2. It will show an URI to open a "nostr connect" enabled **Signer** 
3. In the URI there is a pubkey of the **App** ie. `nostr://connect?target=<pubkey>&relay=<relay>&metadata=<metadata>`
4. The **Signer** will send a kind 4 encrypted message to ACK the `connect` request, along with his public key

### Disconnect (from App)

1. User clicks on **"Disconnect"** button on the **App**
2. The **App** will send a kind 4 encrypted message to the **Signer** with a `disconnect` request
3. The **Signer** will send a kind 4 encrypted message to ACK the `disconnect` request

### Disconnect (from Signer)

1. User clicks on **"Disconnect"** button on the **Signer**
2. The **Signer** will send a kind 4 encrypted message to the **App** with a `disconnect` request


### Get Public Key

1. The **App** will send a kind 4 encrypted message to the **Signer** with a `get_public_key` request
3. The **Signer** will send back a kind 4 encrypted message with the public key as a response to the `get_public_key` request

### Sign Event

1. The **App** will send a kind 4 encrypted message to the **Signer** with a `sign_event` request along with the **event** to be signed
2. The **Signer** will show a popup to the user to inspect the event and sign it
3. The **Signer** will send back a kind 4 encrypted message with the schnorr `signature` of the event as a response to the `sign_event` request

### Delegate

1. The **App** will send a kind 4 encrypted message with metadata to the **Signer** with a `delegate` request along with the **conditions** query string and the **pubkey** of the **App** to be delegated.
2. The **Signer** will show a popup to the user to delegate the **App** to sign on his behalf
3. The **Signer** will send back a kind 4 encrypted message with the signed [NIP-26 delegation token](https://github.com/nostr-protocol/nips/blob/master/26.md) or reject it
4. All others subsequent `delegate` Requests will be ACKed automatically


