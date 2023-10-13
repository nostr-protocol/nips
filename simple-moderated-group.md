## **NIP-102: Simple Moderated Group**

Introducing the "Simple Moderated Group" protocol, inspired by [NIP-24](https://github.com/vitorpamplona/nips/blob/sealed-dms/24.md).

### **Key Features**:
- **Anonymity**: Members are anonymous externally but identifiable within the group.
- **Privacy**: Messages are sealed, gift-wrapped, and individually delivered to each group member.
- **Optimal Size**: Best suited for groups with fewer than 1,000 members.

### **Event Types**:
- `480`: Group Chat Metadata (Member pubkeys & roles)
- `482`: Group Message 
  
  **Optional**:
- `481`: Group Notifications (Invite, Request, Join, Welcome, Leave)

### **1. Group Metadata (Kind 480)**

Group key is controlled by the group owner. Modifications in metadata or membership necessitate the owner to send an updated "kind 480" event. The most recent "kind 480" event always reflects the current group state.

```json
{
  "pubkey": "<owner's public key>",
  "kind": 480,
  "content": "<Group metadata>",
  "tags": [
     ["g", "<group public key>"],
     ["m", "<Owner's public key>", "owner"],
     ["m", "<Member B public key>"],
     ["r", "wss://example.relay.com"]
     ...
  ]
}
```

**Metadata Example**:

```json
{  
  "name": "Sample Channel", 
  "description": "A test channel.", 
  "image": "sample_image.jpg",
  "pinned": ["<Message 1>", "<Message 2>", ...],
  "...moreAttributes"
}
```

### **2. Group Message (Kind 482)**

Messages, identified with the group's public key, are dispatched to all members.

```json
{
  "pubkey": "<Sender's public key>",
  "content": "Sample group message",
  "kind": 482,
  "tags": [
     ["g", "<Group public key>"],
     ["e", "<kind_482_event_id>", 'wss://example.com', "reply"],
     ...
  ]
}
```

### **3. Group Notifications (Kind 481)**:

**a. Invite/Share**: 
Group members share group infos to users, or invite users to the group.

```json
{
  "kind": 481,
  "pubkey": "<Invoker's public key>",
  "content": "<Group metadata: name, description, image, owner etc.>",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "invite"]
  ]
}
```

**b. Request**: 
Express interest to join by sending a request to the group owner.

```json
{
  "kind": 481,
  "pubkey": "<Requester's public key>",
  "content": "I'm interested in joining the group.",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "request"]
  ]
}
```

**c. Join**: 
Announce joining the group. Clients validate the sender against the member list.

```json
{
  "kind": 481,
  "pubkey": "<New user's public key>",
  "content": "I'm glad to join the group.",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "join"]
  ]
}
```

**d. Welcome**: 
Welcome to join the group.

```json
{
  "kind": 481,
  "pubkey": "<Group owner's public key>",
  "content": "Welcome ** to join the group.",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "welcome"]
  ]
}
```

**e. Leave**: 
Notify the group upon leaving. Clients update their member list accordingly.

```json
{
  "kind": 481,
  "pubkey": "<Departing member's public key>",
  "content": "I'm exiting the group.",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "leave"]
  ]
}
```