NIP-XX
======

Partial-Content
-----------------------------------

`draft` `optional` `author:egge`

This NIP is a proposal for sending and receiving files over the nostr protocol. It mimics the HTTP 206 "Partial Content" status code to facilitate uploads of large content to a relay.

#### Motivation

Todays social media has become much more visual than simple texts posts. In order for nostr to become a real alternative it must be able to handle non-text content like images, audio and video. So far users have solved this by uploading files to a third-party file server and including a URL in their transmissions, which make them vulnerable to censorship again. In order to solve this issue, files must be transmitted over the nostr protocol directly.

In order to handle files in the most decentralised and convenient way, we implement a flow based HTTP's 206 Partial-Content.

#### Spec

This NIP introduces two new kinds X, Y, as well as a couple of tags.

```
tags:
 - ['Content-Length', <Total Content-Length in bytes>] 
 - ['Content-Range', <Range of bytes included in the event>] 
 - ['Content-Type', <Type of content according to HTTP content types>] 

kinds:
- x (Partial-Content-Entry)
- y (Partial-Content-Body)
```

#### Example

```json
{
    "pubkey": "<pub-key>",
    "created_at": 1000000000,
    "kind": k,
    "tags": [
      ["partial-content", "10000", "10000-20000/210021"],
      ["e", <32-bytes hex of the id of the previous chunk>]
    ],
    "content": "<FilestreamChunk>",
    "id": "<event-id>"
}
```

Note: e in this case will point at the previous chunks event so that a client can stich the chunks back together

Client Behavior
---------------

Relay Behavior
--------------

Suggested Use Cases
-------------------

* Uploading files and media to multiple relays, introducing censorship resistance
* Streaming of content from a source to a receiver / Live content