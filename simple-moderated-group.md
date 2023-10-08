## NIP-102: Moderated Group Chat Protocol

This document introduces the "Moderated Group Chat" protocol, based on the [Sealed DM](https://github.com/vitorpamplona/nips/blob/sealed-dms/24.md).

### **Main Features**:
- **Anonymity**: Group members remain anonymous to outsiders but identifiable among the group.
- **Size Recommendations**: This protocol is ideal for groups with less than 1000 members.

### **Event Kind**:
- `480`: Group Chat Metadata (Details of members' pubkeys & roles)
- `14`: Group Message (Implemented using sealed DM)
  
  **Optional**:
- `481`: Group Actions (Request to join, join announcement, leave notification)

> **Note**: Each event type will be sealed, gift-wrapped, and sent individually to every group member.

### **1. Group Metadata (Kind 480)**

This is managed by the group owner. Any changes in metadata or membership requires the owner to broadcast a fresh "kind 480" event. Clients must always consider the most recent "kind 480" event as the updated state.

```json
{
  "pubkey": "<Owner's public key>",
  "kind": 480,
  "content": "<Metadata of the group>",
  "tags": [
     ["p", "<Group public key>"],
     ["m", "<Member A public key>", "owner"],
     ["m", "<Member B public key>"],
     ...
  ]
}
```

**Metadata Sample**:

```json
{  
  "name": "Sample Channel", 
  "description": "This is a sample channel for testing.", 
  "image": "sample_image.jpg",
  "pinned": ["<Message 1>", "<Message 2>", ...],
  "...additionalAttributes"
}
```

### **2. Sending Group Message (Kind 14)**

Messages are tagged with the group's public key, and then sent to all members.

```json
{
  "pubkey": "<Sender's public key>",
  "content": "This is a sample group message",
  "kind": 14,
  "tags": [
     ["p", "<Group public key>"],
     ["e", "<Event ID>", "reply"],
     ...
  ]
}
```

### **3. Group Membership Actions**:

**a. Request to Join**: 
Users interested in joining send a direct request only to the group owner.

```json
{
  "kind": 481,
  "pubkey": "<Requester's public key>",
  "content": "Hello, I'd like to join the group.",
  "tags": [
    ["p", "<Group public key>"],
    ["action", "request"]
  ]
}
```

**b. Join Announcement**: 
On joining, users announce their presence. Clients should validate the sender against the member list.

```json
{
  "kind": 481,
  "pubkey": "<New member's public key>",
  "content": "Hello everyone, I'm now part of the group.",
  "tags": [
    ["p", "<Group public key>"],
    ["action", "join"]
  ]
}
```

**c. Leaving Notification**: 
Members send a farewell message on leaving. Clients should update their local list and may choose not to forward future messages to departed members.

```json
{
  "kind": 481,
  "pubkey": "<Exiting member's public key>",
  "content": "Goodbye, I'm leaving the group.",
  "tags": [
    ["p", "<Group public key>"],
    ["action", "leave"]
  ]
}
```