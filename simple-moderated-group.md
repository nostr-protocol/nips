
## Simple Moderated Group Chat

We introduce the "Moderated Group Chat" concept based on [Sealed DM](https://github.com/vitorpamplona/nips/blob/sealed-dms/24.md).

Key features of this group chat design include:

- Group members remain anonymous, with only group members able to identify them.
- The design isn't recommended for large group chats; best suited for groups with fewer than 1000 members.

### Event Kind Definitions

- 480: Group Chat Metadata (includes group members & roles)
- 14: Group Message (using sealed DM)

#### Optional:

- 481: Join Group
- 482: Leave Group

Note: Every kinds of event will be individually sent to all group members after being sealed and gift-wrapped.

### Group Metadata (kind 480)

The group owner oversees the group's creation. When there's a requirement to adjust the group metadata or to add/remove members, the group owner will resend the "kind 480" event to all members. For updates, clients should always refer to the latest "kind 480" event.

```json
{
  "pubkey": "<pubkey of the group owner>",
  "kind": 480,
  "content": "<group metadata>",
  "tags": [
     ["p", "<group pubkey>"],
     ["m", "<A's pubkey>", "owner"],
     ["m", "<B's pubkey>"],
     ["m", "<C's pubkey>"],
     ...
  ]
}
```

Group Metadata Example:

```json
{  
  "name": "Demo Channel", 
  "about": "A test channel.", 
  "picture": "image.jpg",
  "pin": ["<pin messageId1>", "<pin messageId2>", ...],
  "...otherfields"
}
```

### Send Group Message (kind 14)

The 'p' is the group pubkey, event is then gift-wrapped and sent to the group members

```json
{
  "pubkey": "<sender key in hex>",
  "content": "This is a group message",
  "kind": 14,
  "tags":[
     ["p", "<group pubkey>"],
     ["e", "<eventId>", "reply"],
     ...
  ],
}
```

### Join the Group (kind 481, optional)

When a user joins the group, they send a group message (clients should filter this message; the user must be on the group member list):

```json
{
	"kind": 481,
	"pubkey": "<user's pubkey>",
	"content": "Hello, I've joined the group",
	"tags": [
	    ["p", "<group_pubkey>"]
   ]
}
```

### Leave the Group (kind 482, optional)

When a user leaves the group, they send a message to the group (clients should filter this message; the user must be on the group member list. Clients can optionally choose not to send messages to members who have already left the group in subsequent messages).


```json
{
	"kind": 482,
	"pubkey": "<user's pubkey>",
	"content": "Hello, I've left the group",
	"tags": [
	    ["p", "<group_pubkey>"]
   ]
}
```

