NIP-40
======

Expiration Timestamp
-----------------------------------

`draft` `optional` `author:0xtlt`

The `expiration` tag enables users to specify a unix timestamp at which the message SHOULD be considered expired (by relays and clients) and SHOULD be deleted by relays.

#### Spec

```
tag: expiration
values:
 - [UNIX timestamp in seconds]: required
```

#### Example

```json
{
    "pubkey": "<pub-key>",
    "created_at": 1000000000,
    "kind": 1,
    "tags": [
      ["expiration", "1600000000"]
    ],
    "content": "This message will expire at the specified timestamp and be deleted by relays.\n",
    "id": "<event-id>"
}
```

Note: The timestamp should be in the same format as the created_at timestamp and should be interpreted as the time at which the message should be deleted by relays.

Client Behavior
---------------

Clients SHOULD use the `supported_nips` field to learn if a relay supports this NIP. Clients SHOULD NOT send expiration events to relays that do not support this NIP.

Clients SHOULD ignore events that have expired.

Relay Behavior
--------------

Relays MAY NOT delete expired messages immediately on expiration and MAY persist them indefinitely.  
Relays SHOULD NOT send expired events to clients, even if they are stored.  
Relays SHOULD drop any events that are published to them if they are expired.  
An expiration timestamp does not affect storage of ephemeral events.

Suggested Use Cases
-------------------

* Temporary announcements - This tag can be used to make temporary announcements. For example, an event organizer could use this tag to post announcements about an upcoming event.
* Limited-time offers - This tag can be used by businesses to make limited-time offers that expire after a certain amount of time. For example, a business could use this tag to make a special offer that is only available for a limited time.

#### Warning
The events could be downloaded by third parties as they are publicly accessible all the time on the relays.
So don't consider expiring messages as a security feature for your conversations or other uses.
