NIP-xx
======

Moderated channels with membership invite links
-----------

`draft` `optional`

This NIP defines a way to create channels that have restricted membership, where members may invite other members and only members can send messages.  This depends on #1242

For getting new messages, clients should subscribe to kind 42 and kind 70.  They should only show messages once approved, but should cache all kind 42 messages in case of later approval.  For paginating old messages, clients can use since and until to query for kinds 42 and 70.  


## Kind 30069: externally computed channel
```
tags:
d: channelId
a: computer for this channel

content: a json with the following:
Members: array of pubkeys of members
Invite_tokens: [
  {
     Token: nip44 encrypted token
     Uses: remaining uses
     Expiry: expiration time
     Creator: pubkey that sent the kind 74 event associated with this invite token
  }
]
metadata: JSON metadata for the channel, including the name, topic, subject, picture, etc.
```

## Kind 42: channel message
This is the same as NIP-28 but with a tag for the kind 30069 channel. Also requests that the channel computer send a kind 70 event approving this message. If the sender doesn't have permissions to send messages to the channel, no kind 70 event will be sent.
```
a: the kind 30069 channel identifier
```

## Kind 70: channel message moderation
A timeline event indicating that the associated message was approved or deleted.  Clients must not show kind 42 events without approval.  This event must be backdated to the associated kind 42 event.  Only kind 70 events with the same sender as the kind 30069 event are valid, and clients must ignore any kind 70 events that do not match.

This can also refer to any other kind of event besides kind 42, if those are accepted by this channel.
```
created_at: Created at should match the same created_at as the kind 42 event.
tags:
e: Event id of the kind 42 event which was approved
```

## Kind 71: join request
Request the computer managing the channel to add the sender of this event to the member list for the channel.  If the channel has closed join rules, and the invite token is invalid, then no state change will occur.
```
a: the kind 30069 channel identifier
Content: a json including
  Invite_token: nip44 encrypted invite token
```
## Kind 72: Add a user to the chanel
Request the computer managing the channel to add a user to add a user to the member list in the channel state.  If the sender of this event lacks the permissions to take this action, then no state change will occur.
```
a: the kind 30069 channel identifier
Content: the pubkey to add to the member list.
```
## Kind 73: boot user from the channel
Request the computer managing the channel to add a user to remove a user from the member list in the channel state.  If the sender of this event lacks the permissions to take this action, then no state change will occur.
```
a: the kind 30069 channel identifier
Content: the pubkey to boot from the member list.
```
## Kind 74: create invite token
Request the computer to create an invite token and add it to the channel state. If the sender of this event lacks the permissions to take this action, then no state change will occur.
```
a: the kind 30069 channel identifier
Content: json
  Uses: number of times the invite token may be used
  Expiration: when the invite token will expire
```
## Kind 75: revoke invite token
Request the computer revoke the invite token. If the sender of this event lacks the permissions to take this action, then no change will occur.
```
a: the kind 30069 channel identifier
Content: nip44 encrypted token
```
## Kind 76: update metadata
Update the channel metadata.  The channel metadata includes permissions for all channel members, as well as the channel name and other information.  The computer will check if the sender has permissions for the change, including any changes to the permissions of the members.
```
a: the kind 30069 channel identifier
Content: json to be merged with the existing metadata.
```
# Mechanics of invite tokens
When creating an invite token, the creator will send a kind 74 event.  Afterwards, the computer will update kind 30069 with the newly created invite token, which will be encrypted with the computer key as well as the creator's key.

The creator can decrypt the token, and create a sharable link such as
```
https://example.com/invite/<a_tag>/<invite_token>
```

When a user clicks the invite link, the client will encrypt the token with the user's key and the computer key, then send the kind 71 event to join the room.  The computer will then update the room membership.
