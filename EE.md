# NIP-EE

## E2EE Messaging using the Messaging Layer Security (MLS) Protocol

`draft` `optional`

This NIP standardizes how to use the [MLS Protocol](https://www.rfc-editor.org/rfc/rfc9420.html) with Nostr for efficient and E2EE (end-to-end encrypted) direct and group messaging.

## Context

Originally, one-to-one direct messages (DMs) in Nostr happened via the scheme defined in [NIP-04](04.md). This NIP is not recommended because, while it encrypts the content of the message (provides decent confidentiality), it leaks significant amounts of metadata about the parties involved in the conversation (completely lacks privacy).

With the addition of [NIP-44](44.md), we have an updated encryption scheme that improves confidentiality guarantees but stops short of defining a new scheme for doing direct messages using this encryption scheme. Hence, makes little to no difference to privacy.

Most recently, [NIP-17](17.md) combines [NIP-44](44.md) encryption with [NIP-59](59.md) gift-wrapping to hide the encrypted direct message inside another set of events to ensure that it's impossible to see who is talking to who and when messages passed between the users. This largely solves the metadata leakage problem; while it's still possible to see that a user is receiving gift-wrapped events, you can't tell from whom and what kind of events are within the gift-wrap outer event. This gives some degree of deniability/repudiation but doesn't solve forward secrecy or post compromise security. That is to say, if a user's private key (or the calculated conversation key shared between two users used to encrypt messages) is compromised, the attacker will have full access to all past and future DMs sent between those users.

In addition, neither [NIP-04](04.md) or [NIP-17](17.md) attempt to solve the problem of group messages.

### Why is this important?

Without proper E2EE, Nostr cannot be used as the protocol for secure messaging clients. While clients like Signal do a fantastic job with E2EE, they still rely on centralized servers and as a result can be shut down by a powerful (i.e. state-level) actor. The goal of Nostr is not only to protect against centralized entities censoring you and your communications, but also protect against the ability of a state-level actor to stop these sorts of services from existing in the first place. By replacing centralized servers with decentralized relays, we make it nearly impossible for a centralized actor to completely stop communications between individual users.

### Goals of this NIP

1. Private _and_ Confidential DMs and Group messages
   1. **Private** means that an observer cannot tell that Alice and Bob are talking to one another, or that Alice is part of a specific group. This necessarily requires protecting metadata.
   2. **Confidential** means that the contents of conversations can only be viewed by the intended recipients.
2. Forward secrecy and Post-compromise security
   1. **Forward secrecy** means that encrypted content in the past remains encrypted even if a key material is leaked.
   2. **Post compromise security** means that leaking key material doesn't allow an attacker to continue to read messages indefinitely into the future.
3. Scales efficiently for large groups
4. Allows for the use of multiple device/clients in a single conversation/group.

### Why MLS?

This scheme adapts the Message Layer Security (MLS) protocol for use with Nostr. You can think of MLS as an evolution of the Signal Protocol. However, it significantly improves the scalability of encryption operations for large group messaging significantly (linear -> log), is built to accommodate federated environments, and also allows for graceful updating of ciphersuites and versions over time. In addition, it's very flexible and agnostic about the message content that is sent.

It's beyond the scope of this NIP to explain the MLS protocol but you can read more about it in it's [Architectural Overview](https://www.ietf.org/archive/id/draft-ietf-mls-architecture-13.html) or the [RFC](https://www.rfc-editor.org/rfc/rfc9420). MLS is on track to become an internet standard under the IETF so the protocol itself is extremely well vetted and researched. This also means there is the potential for cross network messaging interoperability in the future as MLS gains more adoption.

## Core MLS Concepts

From the [MLS Architectural Overview](https://www.ietf.org/archive/id/draft-ietf-mls-architecture-13.html):

> MLS provides a way for clients to form groups within which they can communicate securely. For example, a set of users might use clients on their phones or laptops to join a group and communicate with each other. A group may be as small as two clients (e.g., for simple person to person messaging) or as large as hundreds of thousands. A client that is part of a group is a member of that group. As groups change membership and group or member properties, they advance from one epoch to another and the cryptographic state of the group evolves.
>
> The group is represented as a tree, which represents the members as the leaves of a tree. It is used to efficiently encrypt to subsets of the members. Each member has a state called a LeafNode object holding the client's identity, credentials, and capabilities.

The MLS protocol's job is to manage and evolve the cryptographic state of a group. This includes managing the membership of a group, the cryptographic state of a group (ratchet tree, keys, and encryption/decryption/authentication of messages), and managing the evolution of the group over time.

### Groups

Groups are created by their first member, who then invites one or more other members. Groups evolve over time in blocks called `Epochs`. New epochs are proposed via one ore more `Proposal` messages and then committed to via a `Commit` message.

### Clients

The device/client pair (e.g. Primal on iOS or Coracle on web) with which a user joins the group is represented as a `LeafNode` in the tree. The terms `Client` and `Member` are interchangeable in this regard. It is not possible to share group state across multiple `Clients`. If a user joins a group from 2 separate devices, their state is separate and they will be tracked as 2 separate members of the group.

### Messages

There are several different types of messages sent within a group. Some of these are control messages that are used to update the group state over time. These include `Welcome`, `Proposal`, and `Commit` messages. Others are the actual messages that are sent between members in a group. These include `Application` messages.

Messages in MLS are "framed". Meaning that they are wrapped in a data structure that includes information about the sender, the epoch, the message index within the epoch and the message content. This framing makes it possible to authenticate and decrypt messages correctly, even if they arrive out of order.

MLS is agnostic to the "content" of the messages that are sent. This is a key feature of MLS that allows for the use of MLS for a wide variety of applications.

MLS is also agnostic to the transport protocol that is used to send messages. Obviously for us, we'll be using websockets, Nostr events and relays.

## The focus of this NIP

This NIP focuses on how to use Nostr to perform the Authentication Service and Delivery Service functions required by the MLS protocol. Most clients will choose to use an MLS implementation to handle keys, ratcheting, group state management, and other aspects of the MLS protocol itself. [OpenMLS](https://github.com/openmls/openmls) is the most actively developed library that implements MLS.

This NIP specifies the following:

1. A standardized way that Nostr clients should [create MLS groups](#creating-groups).
2. The required format of the MLS [`Credential`](#mls-credentials) that Nostr clients should use to represent a Nostr user in a group.
3. The structure of [KeyPackage Events](#keypackage-event-and-signing-keys) published to relays that allow Nostr users to be added to a group asynchronously.
4. The structure of [Group Events](#group-events) published to relays that represent the evolution of a group's state and the contents of the messages sent in the group.

## Security Considerations

This is a concise overview of the security trade-offs and considerations of this NIP in various scenarios. The NIP strives to fully maintain MLS security guarantees.

### Forward Secrecy and Post-compromise Security

- As per the MLS spec, keys are deleted as soon as they are used to encrypt or decrypt a message. This is usually handled by the MLS implementation library itself but attention needs to be paid by clients to ensure they're not storing secrets (expecially the [exporter secret](#group-events)) for longer than absolutely necessary.
- This NIP maintains MLS forward secrecy and post-compromise security guarantees. You can read more about those in the MLS Architectural Overview section on [Forward Secrecy and Post-compromise Security](https://www.ietf.org/archive/id/draft-ietf-mls-architecture-15.html#name-forward-and-post-compromise).

### Leakage of various keys

- This NIP does not depend on a user's Nostr identity key for any aspect of the MLS messaging protocol. Compromise of a user's Nostr identity key does not give access to past or future messages in any MLS-based group.
- For a complete discussion of MLS key leakage, please see the Endpoint Compromise section of the [MLS Architectural Overview](https://www.ietf.org/archive/id/draft-ietf-mls-architecture-15.html#name-endpoint-compromise).

### Metadata

- The only group specific metadata published to relays is the Nostr group ID value. This value is used to identify the group in the `h` tag of the Group Message Event (`kind: 445`). These events are published ephemerally and this Nostr group ID value can be updated over the lifetime of the group by group admins. This is a tradeoff to ensure that group participants and group size are obfuscated but still makes it possible to efficiently fan out group messages to all participants. The content field of this event is a value encrypted in two separate ways (using NIP-44 and MLS) with MLS group state/keys. Only group members with up-to-date group state can decrypt and read these messages.
- A user's key package events can be used one or more times to be added to groups. There is a tradeoff inherent here: Reusing key packages (initial signing keys) carries some degree of risk but this risk is mitigated as long as a user rotates their signing key immediately upon joining a group. This step also improves the forward secrecy of the entire group.

### Device Compromise

Clients implementing this NIP should take every precaution to ensure that data is stored in a secure way on the device and is protected against unwanted access in the case that a device is compromised (e.g. encryption at rest, biometric authentication, etc.). That said, full device compromise should be viewed as a catastrophic event and any group the compromised device was a part of should be considered compromised until they can remove that member and update their group's state. Some suggestions:

- Clients should support and encourage self-destructing messages (ensuring that full transcript history isn't available on a device forever).
- Clients should regularly suggest to group admins that inactive users be removed.
- Clients should regularly suggest (or automatically) rotate a user's signing key in each of their groups.
- Clients should encrypt group state and keys on the device using a secret value that isn't part of the group state or the user's Nostr identity key.
- Clients should use secure enclave storage where possible.

For a full discussion of the security considerations of MLS, please see the Security Considerations section of the [MLS RFC](https://www.rfc-editor.org/rfc/rfc9420.html#name-security-considerations).

## Creating groups

MLS Groups are created with a random 32-byte ID value that is effectively permanent. This ID should be treated as private to the group and MUST not be published to relays in any form.

Clients must also ensure that the ciphersuite, capabilities, and extensions they use when creating the group are compatible with those advertised by the users they'd like to invite to the group. They can check this info via the user's published KeyPackage Events.

When creating a new group, the following MLS extensions MUST be used.

- [`required_capabilities`](https://docs.rs/openmls/latest/openmls/extensions/struct.RequiredCapabilitiesExtension.html)
- [`ratchet_tree`](https://docs.rs/openmls/latest/openmls/extensions/struct.RatchetTreeExtension.html)
- [`nostr_group_data`](https://github.com/erskingardner/nostr-openmls/blob/master/src/nostr_group_data_extension.rs)

And the following MLS extension is highly recommended (more [here](#keypackage-event-and-signing-keys)):
- [`last_resort`](https://docs.rs/openmls/latest/openmls/extensions/struct.LastResortExtension.html)

Changes to an MLS group are affected by first creating one or more `Proposal` events and then committing to a set of proposals in a `Commit` event. These are MLS events, not Nostr events. However, for the group state to properly evolve the Commit events (which represent a specific set of proposals - like adding a new user to the group) must be published to relays for the other group members to see. See [Group Messages](#group-events) for more information.

## MLS Credentials

A `Credential` in MLS is an assertion of who the user is coupled with a signing key. When constructing `Credentials` for MLS, clients MUST use the `BasicCredential` type and set the `identity` value as the 32-byte hex-encoded public key of the user's Nostr identity key. Clients MUST not allow users to change the identity field and MUST validate that all `Proposal` messages do not attempt to change the identity field on any credential in the group.

A `Credential` also has an associated signing key. The initial signing key for a user is included in the KeyPackage event. The signing key MUST be different from the user's Nostr identity key. This signing key SHOULD be rotated over time to provide improved post-compromise security.

## Nostr Group Data Extension

As mentioned above, the `nostr_group_data` extension is a required MLS extension used to associate Nostr-specific data with an MLS group in a cryptographically secure and proveable way. This extension MUST be included as a required capability when creating a new group.

The extension stores the following data about the group:

- `nostr_group_id`: A 32-byte ID for the group. This is a different value from the group ID used by MLS and CAN be changed over time. This value is the group ID value used in the `h` tags when sending group message events.
- `name`: The name of the group.
- `description`: A short description of the group.
- `admin_pubkeys`: An array of the hex-encoded public keys of the group admins. The MLS protocol itself does not have a concept of group admins. Clients MUST check the list of `admin_pubkeys` before making any change to the group data (anything in this extension), or before changing group membership (add/remove members), or updating any other aspect of the group itself (e.g. ciphersuite, etc.). Note, all members of the group can send `Proposal` and `Commits` messages for changes to their own credentials (e.g. updating their signing key).
- `relays`: An array of the Nostr relay URLs that the group uses to publish and receive messages.

All of these values can be updated over time using MLS `Proposal` and `Commit` events (by group admins).

## KeyPackage Event and Signing Keys

Each user that wishes to be reachable via MLS-based messaging MUST first publish at least one KeyPackage event. The KeyPackage Event is used to authenticate users and create the necessary `Credential` to add members to groups in an asynchronous way. Users can publish multiple KeyPackage Events with different parameters (supporting different ciphersuites or MLS extensions, for example). KeyPackages include a signing key that is used for signing MLS messages within a group. This signing key MUST not be the same as the user's Nostr identity key.

KeyPackage reuse SHOULD be minimized. However, in normal MLS use, KeyPackages are consumed when joining a group. In order to reduce race conditions between invites for multiple groups using the same Key Package, Nostr clients SHOULD use "Last resort" KeyPackages. This requires the inclusion of the `last_resort` extension on the KeyPackage's capabilities (same as with the Group).

It's important that clients immediately rotate a user's signing key after joining a group via a last resort key package to improve post-compromise security. The signing key (the public key included in the KeyPackage Event) is used for signing within the group. Therefore, clients implementing this NIP MUST ensure that they retain access to the private key material of the signing key for each group they are a member of.

In most cases, it's assumed that clients implementing this NIP will manage the creation and rotation of KeyPackage Events.

### Example KeyPackage Event

```json
  {
    "id": <id>,
    "kind": 443,
    "created_at": <unix timestamp in seconds>,
    "pubkey": <main identity pubkey>,
    "content": "",
    "tags": [
        ["mls_protocol_version", "1.0"],
        ["ciphersuite", <MLS CipherSuite ID value e.g. "0x0001">],
        ["extensions", <An array of MLS Extension ID values e.g. "0x0001, 0x0002">],
        ["client", <client name>, <handler event id>, <optional relay url>],
        ["relays", <array of relay urls>],
        ["-"]
    ],
    "sig": <signed with main identity key>
}
```

- The `content` hex encoded serialized `KeyPackageBundle` from MLS.
- The `mls_protocol_version` tag is required and MUST be the version number of the MLS protocol version being used. For now, this is `1.0`.
- The `ciphersuite` tag is the value of the MLS ciphersuite that this KeyPackage Event supports. [Read more about ciphersuites in MLS](https://www.rfc-editor.org/rfc/rfc9420.html#name-mls-cipher-suites).
- The `extensions` tag is an array of MLS extension IDs that this KeyPackage Event supports. [Read more about MLS extensions](https://www.rfc-editor.org/rfc/rfc9420.html#name-extensions).
- (optional) The `client` tag helps other clients manage the user experience when they receive group invites but don't have access to the signing key.
- The `relays` tag identifies each of the relays that the client will attempt to publish this KeyPackage event. This allows for deletion of KeyPackage Events at a later date.
- (optional) The `-` tag can be used to ensure that KeyPackage Events are only published by their authenticated author. Read more in [NIP-70](70.md)

### Deleting KeyPackage Events

Clients SHOULD delete the KeyPackage Event on all the listed relays any time they successfully process a group request event for a given KeyPackage Event. Clients MAY also create a new KeyPackage Event at the same time.

If clients cannot process a Welcome message (e.g. because the signing key was generated on another client), clients MUST not delete the KeyPackage Event and SHOULD show a human-understandable error to the user.

### Rotating Signing Keys

Clients MUST regularly rotate the user's signing key in each group that they are a part of. The more often the signing key is rotated the stronger the post-compromise security. This rotation is done via `Proposal` and `Commit` events and broadcast to the group via a Group Event. [Read more about forward secrecy and post-compromise security inherent in MLS](https://www.rfc-editor.org/rfc/rfc9420.html#name-forward-secrecy-and-post-co).

### KeyPackage Relays List Event

A `kind: 10051` event indicates the relays that a user will publish their KeyPackage Events to. The event MUST include a list of relay tags with relay URIs. These relays SHOULD be readable by anyone the user wants to be able to contact them.

```json
{
  "kind": 10051,
  "tags": [
    ["relay", "wss://inbox.nostr.wine"],
    ["relay", "wss://myrelay.nostr1.com"],
  ],
  "content": "",
  //...other fields
}
```

### Welcome Event

When a new user is added to a group via an MLS `Commit` message. The member who sends the `Commit` message to the group is responsible for sending the user being added to the group a Welcome Event. This Welcome Event is sent to the user as a [NIP-59](59.md) gift-wrapped event. The Welcome Event gives the new member the context they need to join the group and start sending messages.

Clients creating the Welcome Event SHOULD wait until they have received acknowledgement from relays that their Group Event with the `Commit` has been received before publishing the Welcome Event.

```json
{
   "id": <id>,
   "kind": 444,
   "created_at": <unix timestamp in seconds>,
   "pubkey": <nostr identity pubkey of sender>,
   "content": <serialized Welcome object>,
   "tags": [
      ["e", <ID of the KeyPackage Event used to add the user to the group>],
      ["relays", <array of relay urls>],
   ],
   "sig": <NOT SIGNED>
}
```

- The `content` field is required and is a serialized MLSMessage object containing the MLS `Welcome` object.
- The `e` tag is required and is the ID of the KeyPackage Event used to add the user to the group.
- The `relays` tag is required and is a list of relays clients should query for Group Events.

Welcome Events are then sealed and gift-wrapped as detailed in [NIP-59](59.md) before being published. Like all events that are sealed and gift-wrapped, `kind: 444` events MUST never be signed. This ensures that if they were ever leaked they would not be publishable to relays.

#### Large Groups

For groups above ~150 participants, welcome messages will become larger than the maximum event size allowed by Nostr. There is currently work underway on the MLS protocol to support "light" client welcomes that don't require the full Ratchet Tree state to be sent to the new member. This section will be updated with recommendations for how to handle large groups.

## Group Events

Group Events are all the messages that are sent within a group. This includes all "control" events that update the shared group state over time (`Proposal`, `Commit`) and messages sent between members of the group (`Application` messages).

Group Events are published using an ephemeral Nostr keypair to obfuscate the number and identity of group participants. Clients MUST use a new Nostr keypair for each Group Event they publish.

```json
{
   "id": <id>,
   "kind": 445,
   "created_at": <unix timestamp in seconds>,
   "pubkey": <ephemeral sender pubkey>,
   "content": <NIP-44 encrypted serialized MLSMessage object>,
   "tags": [
      ["h", <group id>]
   ],
   "sig": <signed with ephemeral sender key>
}
```
- The `content` field is a [tls-style](https://www.rfc-editor.org/rfc/rfc9420.html#name-the-message-mls-media-type) serialized [`MLSMessage`](https://www.rfc-editor.org/rfc/rfc9420.html#section-6-4) object which is then encrypted according to [NIP-44](44.md). However, instead of using the sender and receivers keys the NIP-44 encryption is done using a Nostr keypair generated from the MLS [`exporter_secret`](https://www.rfc-editor.org/rfc/rfc9420.html#section-8.5) to calulate the `conversation key` value. Essentially, you use the hex-encoded `exporter_secret` value as the private key, calculate the public key, and then use those two keys to encrypt and decrypt messages.
- The `exporter_secret` value should be generated with a 32-byte length and labeled `nostr`. This `exporter_secret` value is rotated on each new epoch in the group. Clients should generate a new 32-byte value each time they process a valid `Commit` message.
- The `pubkey` is the hex-encoded public key of the ephemeral sender.
- The `h` tag is the nostr group ID value (from the Nostr Group Data Extension).

### Application Messages

Application messages are the messages that are sent within the group by members. These are contained within the `MLSMessage` object. The format of these messages should be unsigned Nostr events of the appropriate kind. For normal DM or group messages, clents SHOULD use `kind: 9` chat message events. If the user reacts to a message, it would be a `kind: 7` event, and so on.

This means that once the application message has been decrypted and deserialized, clients can store those events and treat them as any other Nostr event, effectively creating a private Nostr feed of the group's activity and taking advantage of all the features of Nostr.

These inner unsigned Nostr events MUST use the member's Nostr identity key for the `pubkey` field and clients MUST check that the identity of them member who sent the message matches the pubkey of the inner Nostr event.

These Nostr events MUST remain **unsigned** to ensure that if they were to leak to relays they would not be published publicly. These Nostr events MUST not include any "h" tags or other tags that would identify the group that they belong to.

### `Commit` Message race conditions

The MLS protocol is resilient to almost all messages arriving out of order. However, the order of `Commit` messages is important for the group state to move forward from one epoch to the next correctly. Given Nostr's nature as a decentralized network, it is possible for a client to receive 2 or more `Commit` messages all attempting to update to a new epoch at the same time.

Clients sending commit messages MUST wait until they receive acknowledgement from at least one relay that their Group Message Event with the `Commit` has been received before applying the commit to their own group state.

If a client receives 2 or more `Commit` messages attempting to change same epoch, they MUST apply only one of the `Commit` messages they receive, determined by the following:

1. Using the `created_at` timestamp on the kind `445` event. The `Commit` with the lowest value for `created_at` is the message to be applied. The other `Commit` message is discarded.
2. If the `created_at` timestamp is the same for two or more `Commit` messages, the `Commit` message with the lowest value for `id` field is the message to be applied.

Clients SHOULD retain previous group state for a short period of time in order to recover from forked group state.
