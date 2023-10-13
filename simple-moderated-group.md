## **NIP-102: Simple Moderated Group**

Introducing the "Simple Moderated Group", inspired by [NIP-24](https://github.com/vitorpamplona/nips/blob/sealed-dms/24.md).

### **Key Features**:
- **Anonymity**: Members are anonymous externally but identifiable within the group.
- **Privacy**: Messages are sealed, gift-wrapped, and individually delivered to each group member.
- **Ideal Size**: Best suited for groups with fewer than 1,000 members.

### **Event Types**:
- `480`: Group Chat Metadata (Member public keys & roles)
- `14`: Group Message 
  
  **Optional**:
- `481`: Group Actions (Invite, Request, Join, Add, Leave, Remove)

### **1. Group Metadata (Kind 480)**

The group is controlled by the group owner. Modifications in metadata or membership require the owner to send an updated "kind 480" event. The most recent "kind 480" event always reflects the current group state.

```json
{
  "public key": "<owner's public key>",
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
  "name": "Sample Group", 
  "description": "A test group.", 
  "image": "sample_image.jpg",
  "pinned": ["<Message 1>", "<Message 2>", ...],
  "...moreAttributes"
}
```

### **2. Group Message (Kind 14)**

Messages are sent to all group members.

```json
{
  "public key": "<Sender's public key>",
  "content": "Sample group message",
  "kind": 14,
  "tags": [
     ["g", "<Group public key>"],
     ["e", "<kind_482_event_id>", 'wss://example.com', "reply"],
     ...
  ]
}
```

### **3. Group Actions/Notifications (Kind 481, Optional)**:

**a. Invite/Share**: 
Group members can share group information with users or invite users to the group.

```json
{
  "kind": 481,
  "public key": "<Invoker's public key>",
  "content": "<Group metadata: name, description, image, owner, etc.>",
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
  "public key": "<Requester's public key>",
  "content": "I'm interested in joining the group.",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "request"]
  ]
}
```

**c. Join**: 
Announce entry to the group. Clients validate the sender against the group member list.

```json
{
  "kind": 481,
  "public key": "<New user's public key>",
  "content": "I'm glad to join the group.",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "join"]
  ]
}
```

**d. Welcome/Add**: 
Welcome users to join the group.

```json
{
  "kind": 481,
  "public key": "<Group owner's public key>",
  "content": "Welcome ** to join the group.",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "add"]
  ]
}
```

**e. Leave**: 
Notify the group of departure. Clients update their member list accordingly.

```json
{
  "kind": 481,
  "public key": "<Departing member's public key>",
  "content": "I'm exiting the group.",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "leave"]
  ]
}
```

**f. Kick/Remove**: 
Remove users from the group.

```json
{
  "kind": 481,
  "public key": "<Group owner's public key>",
  "content": "Kick *** from our group",
  "tags": [
    ["g", "<Group public key>"],
    ["type", "remove"]
  ]
}
```