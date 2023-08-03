## Anonymous Event & Group Chat Implementation - Darft

This document presents an approach to implement an Anonymous Event & Group Chat. 


### Anonymous Event

Before we start, let's introduce an "Anonymous Event" method to hide the real sender's pubkey, (This balancing privacy and exposing tags for clients to request the necessary data)


#### Event 1 

The first step involves generating a regular Event 1 using an alias public key, which can be random pubkey or derived pubkey based on privacy needs.

```
{
  "pubkey": <sender's alias pubkey>,
  "kind": xxx,
  "content": "content",
  "tags": [
    ["p": receiver pubkey],
    ...
  ],
  "created_at": 1686840217,
  "sig": <sig with alias's key>
}
```
#### Event 2

In Event 2, we remove the signature and include the following content:

```
{
  "pubkey": <sender's alias pubkey>,
  "kind": xxx,
  "content": "{"pubkey": <sender's real pubkey>, "content": <real content>}",
  "tags": [
    ["p": receiver pubkey],
    ...
  ],
  "created_at": 1686840217,
}
```
#### Event 3

Event 3 signs Event 2 with the sender's real public key and includes the signature in the content.

```
{
  "pubkey": <sender's alias pubkey>,
  "kind": xxx,
  "content": "{"pubkey": <sender's real pubkey>, "content": <real content>, "sig": <sig with real pubkey>}",
  "tags": [
    ["p": receiver pubkey],
    ...
  ],
  "created_at": 1686840217
}
```
#### Event 4

Event 4 encrypts the content with the shared secret of the alias & recipient.

```
{
  "pubkey": <sender's alias pubkey>,
  "kind": xxx,
  "content": "<encrypted content with shared key>",
  "tags": [
    ["p": receiver pubkey],
    ...
  ],
  "created_at": 1686840217
}
```
#### Event 5

Finally, Event 5 signs Event 4 with the alias key and sends it out.

```
{
  "pubkey": <alias pubkey>,
  "kind": xxx,
  "content": <encrypted content>,
  "tags": [
    ["p": receiver pubkey],
    ...
  ],
  "created_at": 1686840217,
  "sig": <sig with alias key>
}
```
### Group Chat Based on Anonymous Event

The following privacy protections can be achieved:

- Group members are concealed; only members can identify each other.
- Message forward/backward secrecy; only members can decrypt messages.
- Due to sender anonymity, it's challenging to count the sender's messages.
- Fast key rotation, suitable for large groups.

### Event Kind Definitions

- 480: Create group chat (with initial group members)
- 482: Send group messages
- 483: Join group request
- 484: Leave group
- 485: Group owner rotation (updating group members, group information etc.)
- 486: Group member rotation

### Create Group Chat (kind 480)

The group owner initiates the creation event message.

```
{
  "pubkey": <alias pubkey of the group owner>,
  "kind": 480,
  "content": "Anonymous content",
  "tags": [
     ["p", <group pubkey>],
     ["p", <member tag of A>],
     ["p", <member tag of B>],
     ["p", <member tag of C>],
     ...
  ]
}
```
Real content example:

```
{  
  "name": "Demo Channel", 
  "about": "A test channel.", 
  "picture": "image.jpg",
  "pin": [<pin messageId1>, <pin messageId2>,...],
  "difficulty": 4,
  <...otherfields>
}
```
The initial group members' data will be included in the `p` tags. The data structure is as follows:

```
["p", <member A's alias pubkey>, <encrypted group privkey>, <encrypted member A's detail>]
```
Member detail example:

```
{"pubkey": <real pubkey>, "role": <owner, admin, member, etc...>, "rank": <group rank>}
```

- Member A's alias pubkey: Shared public key of the sender & A
- Group privkey: Encrypted with the shared secret of sender & A
- Member A's detail: JSON serialized content, then encrypted with shared secret of the group key

User operation process:

- The group owner shares the event ID (e.g., via an invitation link).
- The user calculates the alias public key based on the sender public key and their own public key.
- The user filters `p` to find their own member information.
- The user decrypts the group private key with the shared key of sender&user.
- The user decrypts the content with the shared key of group public key&private key.
- The user decrypts their detail in the group with the shared key of group public key&private key.
- The user decrypts other group member details with the shared key of group public key&private key.


### Update Group Info

Each time the group information is updated, the group key will be updated. See the group owner rotate, kind 485 event.

### Send Group Message (kind 482)


```
{
	"pubkey": <alias pubkey>
	"kind": 482,
	"content":<Anonymous content>
	"tags":[
	    ["p", <group_pubkey>],
		["e", <group_create_event_id>, "root"],
		["e", <reply_event_id>, "reply"]
	]
	
}
```

If a group member does not have the corresponding group pubkey stored locally, they can reverse query the rotate key event based on the group pubkey, get the group privkey, and then decrypt the message.

### Apply to Join the Group  (kind 483)

Users apply to join the group:

```
{
	"kind": 483,
	"pubkey": <user's alias key>,
	"content": <Anonymous content>,
	"tags": [
	    ["p", <group_pubkey>],
	    ["e", <group_create_event_id>],
   ]
}
```

### Group owner Accepts the Join Request

The group owner updates the group members, the owner performs a rotate event, and adds this user to the group. See kind 485 event

### User Leave the Group  (kind 484)

User leave the group:

```
{
	"pubkey": <user's alias key>,
	"kind": 484,
	"content":<Anonymous content>,
	"tags":[
	    ["p", <group_pubkey>],
	    ["e", <group_create_event_id>],
	    ["e", <the_last_group_owner_rotate_event_id>]
	]
}
```

Since it's the user actively leaving the group, the group owner or administrators may not be online at this time. In this case, group members can take on this role and perform a key rotation. See kind 486 member key rotate event.


### Group Owner Removes Members

The group owner updates the group members, directly triggers a rotate event, and removes the user. See kind 485 event.

---

### KEY ROTATION

For large group chats, a fast key rotation is required, especially when the group owner is not online, allowing group members to independently update keys. The TreeKEM protocol of MLS is an effective way. However, in nostr, an event-based key rotation scheme is needed.

We are trying to find an event-based key rotation scheme, this is an experiment :)

### Group Owner Rotation (kind 485)

```
{
    "pubkey": <alias pubkey>,
    "kind": 485,
    "content": <Anonymous content>,
    "tags": [
	   ["p", <new group_pubkey>],
	   ["e", <group_create_event_id>],
    	["p",<member tag of A>],
    	["p",<member tag of B>],
    	["p",<member tag of C>],
    	...
    ]
}
```

### Group Member Rotation (kind 486)

```
{
    "pubkey": <alias pubkey>,
    "kind": 486,
    "content": <Anonymous content>,
    "tags": [
	   ["p", <new group_pubkey>],
	   ["e", <group_create_event_id>],
	   ["e", <the_last_group_owner_rotate_event_id>]
    	["e", <kind_484_event_id>],
    	["e", <kind_484_event_id>],
    	["p", <member tag of A>],
    	["p", <member tag of B>],
    	["p", <member tag of C>],
    	...
    ]
}
```

Group members rotate events need to follow the following rules, otherwise it will be considered invalid:

- The operator must be a group member
- Need to add the latest rotate eventid sent by the group owner, e1
- Need to add the member removal eventid after e2, e3, etc.
- In this rotate table, the operator needs to actively put his rank at the end, and other members' ranks cannot be changed
- If the group has set POW restrictions, the rotate event id needs to satisfy the pow difficulty (if there are many people online in the group chat at the same time, to prevent a large number of key updates at the same time when group members change, the group owner can add difficulty parameters to the group information when creating the group chat)

Client logic:

- For group members, if a valid rotate event with the same e1,e2,e3 is received, choose the rotate key sent by the user with the higher rank
- If a rotate event from other users is received during the rotate process, stop his rotate process
- If a new kind 484 event is received during the rotate process, restart new rotate process

#### Trigger Scenarios for Updating Group Keys

- When a user joins, the group owner agrees to join and rotate the key
- When the group owner removes a group member, the group owner rotates the key
- When a group member voluntarily leaves, the group member/group owner triggers a key rotation process
- When authority changes (such as group owner change, administrator change, etc.), the group owner rotates the key
- When group information changes, the group owner rotates the key

