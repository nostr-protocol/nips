NIP-DC: Direct Connect
============================

`draft` `optional` `author:riccardobl` `author:jacany`

This NIP describes a general purpose way to coordinate direct peer to peer connections using nostr relays.

## Rooms

Rooms are identified by a keypair that is shared to all the parties interested in connecting together.
When a peer joins a room, everyone in the room should attempt to connect to them.

## Encryption

All the encrypted fields use two layers of NIP-44 encryption, the inner layer is encrypted with the conversation key derived from the sender private key and the receiver public key, the outer layer is encrypted with the conversation key derived from the room private key and the receiver public key.



```javascript
function encrypt(localPrivKey, content, recipientPubkey, roomPrivateKey){
    content = nip44Encrypt(content, nip44ConversationKey(localPrivKey, recipientPubkey));
    content = nip44Encrypt(content, nip44ConversationKey(roomPrivateKey, recipientPubkey));
    return content;
}

function decrypt(localPrivKey, content, senderPubkey, roomPublicKey){
    content = nip44Decrypt(content, nip44ConversationKey(localPrivKey, roomPublicKey));
    content = nip44Decrypt(content, nip44ConversationKey(localPrivKey, senderPubkey));
    return content;
}
```

## Presence Event

Periodically clients should broadcast this event to update their presence in the room and allow the other peers to discover them.

 
```yaml
{
    "kind": 25050,
    "content": "<optional message>",
    "tags": [
        ["t", "connect"],
        ["P", "<room hex pubkey>"],
        ["i", "<protocol identifier>"],
        ["y", "<optional app id>"],
        ["expiration", "<expiration>"]
    ]
}
```


*A new presence event should always be broadcasted before the expiration time, to keep the connection alive. If this doesn't happen, other peers may close the connection.*

**`y` is an optional app id that is used to identify the application that should be used to handle this connection.**

**`i` is a protocol identifier that is used to identify the protocol that should be used to connect to this peer. See [Standard Protocols](#standard-protocols) for more details.**

## Disconnection Event

When a peer leaves the room, it should broadcast this event to inform the other peers.

```yaml
{
    "kind": 25050,
    "content": "<optional message>",
    "tags": [
        ["t", "disconnect"],
        ["P", "<room hex pubkey>"]
    ]
}
```
 


## Route Event

Peers that have joined a room should broadcast a list of routes the other peers can use to connect to them.
This list can be rebroadcasted as needed and each peer should maintain an updated list of routes for each peer in the room.

```yaml
{
    "kind": 25050,
    "content": "<encrypted routes>",
    "tags": [
        ["t", "route"],
        ["p", "<reciever pubkey>"],
        ["P", "<room hex pubkey>"]
    ],
}
```

**The routes format is protocol specific.**


## Offer Event

Offer event is used to initiate a connection with another peer `p` in the room.

```yaml
{
    "kind": 25050,
    "content": "<encrypted offer>",
    "tags": [
        ["t", "offer"],
        ["p", "<reciever pubkey>"],
        ["P", "<room hex pubkey>"]
    ]    
}
```

**The offer format is protocol specific.**



## Answer Event

The answer event is used to respond to an offer.

```json
{
    "kind": 25050,
    "content":  "<encrypted answer>",
    "tags": [
        ["t", "answer"],
        ["p", "<reciever pubkey>"],
        ["P", "<room pubkey>"]
    ],
}
```

**The answer format is protocol specific.**


## Standard Protocols

### Data Channels (webrtc-dc)

Binary packets via WebRTC Data Channels.

#### webrtc-dc: Presence Event
```yaml
{
    "kind": 25050,
    "content": "<optional message>",
    "tags": [
        ["t", "connect"],
        ["P", "<room hex pubkey>"],
        ["i", "webrtc-dc"],
        ["y", "<optional app id>"],
        ["expiration", "<expiration>"]
    ]
}
```

#### webrtc-dc: Disconnection Event
```yaml
{
    "kind": 25050,
    "content": "<optional message>",
    "tags": [
        ["t", "disconnect"],
        ["P", "<room hex pubkey>"]
    ]
}
```


#### webrtc-dc: Route Event

```yaml
{
    "kind": 25050,
    "content":  encrypt(JSON.stringify({
        "candidates": [
            {
                "candidate": "<sdp>",
                "sdpMid": "<sdpMid>",
            },
            {
                "candidate": "<sdp>",
                "sdpMid": "<sdpMid>",
            },
            //...        
        ]
    })),
    "tags": [
        ["t", "route"],
        ["p", "<reciever pubkey>"],
        ["P", "<room hex pubkey>"]
    ],
}
```

 


#### webrtc-dc: Offer Event

```yaml
{
    "kind": 25050,
    "content": encrypt(JSON.stringify({
        "sdp": "<web rtc offer sdp>",
        "turn": [
             // optional list of RFC 7065 turn servers
        ]
    })),
    "tags": [
        ["t", "offer"],
        ["p", "<reciever pubkey>"],
        ["P", "<room hex pubkey>"]
    ]   
}
```

#### webrtc-dc:  Answer Event

```yaml
{
    "kind": 25050,
    "content":  encrypt(JSON.stringify({
        "sdp": "<web rtc answer sdp>",
        "turn": [
            // optional list of RFC 7065 turn servers
        ]
    })),
    "tags": [
        ["t", "answer"],
        ["p", "<reciever pubkey>"],
        ["P", "<room hex pubkey>"]
    ]
}
```
