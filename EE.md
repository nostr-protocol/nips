# NIP-EE

## Marmot: End-to-End Encrypted Messaging

`final` `optional`

This NIP is a short reference to the [Marmot Protocol specification](https://github.com/marmot-protocol/marmot), which defines end-to-end encrypted direct messaging and private groups using [Messaging Layer Security (MLS)](https://www.rfc-editor.org/rfc/rfc9420) and Nostr. This summary covers the `marmot.transport.nostr` version 1 binding. The full specification, especially its [Nostr transport binding](https://github.com/marmot-protocol/marmot/blob/master/transports/nostr.md), defines the required wire formats, validation rules, membership changes, and relay behavior. Clients implementing this NIP MUST follow those rules.

## How it works

Marmot uses Nostr public keys as account identities. An account-signed proof binds each member's separate MLS signing key to that identity; the Nostr account key does not derive the group's encryption keys. Application messages use unsigned Nostr event-shaped payloads inside MLS, with `kind:9` for ordinary chat. These inner events are not published directly to relays. MLS commits advance group epochs and rotate group secrets as members join, leave, or refresh their keys. MLS provides forward secrecy for past messages when used keys are erased, and post-compromise security for future messages after an uncompromised key update is processed and the attacker no longer has access to group secrets.

## Nostr events and relays

- **KeyPackages:** An account publishes signed, addressable `kind:30443` MLS KeyPackage events to the write-capable relays in its [NIP-65](65.md) `kind:10002` relay list. Other clients fetch a KeyPackage there to invite that account.
- **Invitations:** An MLS Welcome is an unsigned `kind:444` rumor inside a [NIP-59](59.md) `kind:13` seal and `kind:1059` gift wrap. The wrap is sent to the receiver's [NIP-17](17.md) `kind:10050` inbox relays. The rumor references the KeyPackage used for the invitation and suggests relays for fetching group traffic. The seal is signed with the sender's Nostr account key; the outer gift wrap uses a fresh ephemeral key.
- **Group traffic:** MLS application messages and group-state changes travel in `kind:445` events. Each event is signed by a fresh ephemeral key, carries an opaque random `h` routing identifier, and holds an MLS message protected by an additional group-derived encryption layer. The relay list and routing identifier are authenticated MLS group state. Members publish and fetch group events at those relays, and routing changes take effect through MLS commits.

These relay lists have separate roles: an account's `kind:10002` list serves KeyPackages, its `kind:10050` list serves invitations, and authenticated group state determines where `kind:445` events go. A routing-change commit is sent through the prior group route so existing members can find it. Relays store and forward the outer Nostr events; clients validate membership and decrypt the MLS messages.

## Security and recovery

Possession of a Nostr account private key (`nsec`) alone does not decrypt recorded Marmot group messages, recover past group history, or reveal the member list from public group events. History recovery requires separately retained MLS state and message data. The key does let an attacker impersonate the account. Possession of the receiver's Nostr account private key allows unwrapping accessible Welcome invitations, revealing the sender's public key, the referenced KeyPackage event id, and the suggested group relay URLs. It does not decrypt the enclosed MLS group state: joining from a Welcome requires the receiver's separate KeyPackage private key material. Group events hide member identities behind ephemeral event keys, but relays can still observe routing identifiers, timing, and delivery patterns. Clients must protect both the account key and their MLS state, and erase superseded secrets to preserve MLS security properties.
