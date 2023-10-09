## **NIP-102: Moderated Group Chat**

Introducing the "Moderated Group Chat" protocol, inspired by [Sealed DM](https://github.com/vitorpamplona/nips/blob/sealed-dms/24.md).

### **Key Features**:
- **Anonymity**: Members are anonymous externally but identifiable within the group.
- **Privacy**: Messages are sealed, gift-wrapped, and individually delivered to each group member.
- **Optimal Size**: Best suited for groups with fewer than 1000 members.

### **Event Types**:
- `480`: Group Chat Metadata (Member pubkeys & roles)
- `482`: Group Message 
  
  **Optional**:
- `481`: Group Notifications (Invite, Request, Join, Leave)

### **1. Group Metadata (Kind 480)**

Controlled by the group owner. Modifications in metadata or membership necessitate the owner to send an updated "kind 480" event. The most recent "kind 480" event always reflects the current group state.

```json
{
  "pubkey": "<Owner's public key>",
  "kind": 480,
  "content": "<Group metadata>",
  "tags": [
     ["p", "<Group public key>"],
     ["m", "<Member A public key>", "owner"],
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
     ["p", "<Group public key>"],
     ["e", "<Event ID>", 'wss://example.com', "reply"],
     ...
  ]
}
```

### **3. Group Notifications (Kind 481)**:

**a. Invite**: 
Directly invite users to the group.

```json
{
  "kind": 481,
  "pubkey": "<Invoker's public key>",
  "content": "I invite you to join our group.",
  "tags": [
    ["p", "<Group public key>"],
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
    ["p", "<Group public key>"],
    ["type", "request"]
  ]
}
```

**c. Join**: 
Announce joining the group. Clients validate the sender against the member list.

```json
{
  "kind": 481,
  "pubkey": "<New member's public key>",
  "content": "Glad to join the group.",
  "tags": [
    ["p", "<Group public key>"],
    ["type", "join"]
  ]
}
```

**d. Leave**: 
Notify the group upon leaving. Clients update their member list accordingly.

```json
{
  "kind": 481,
  "pubkey": "<Departing member's public key>",
  "content": "I'm exiting the group.",
  "tags": [
    ["p", "<Group public key>"],
    ["type", "leave"]
  ]
}
```