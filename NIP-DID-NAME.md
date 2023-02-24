
# Combining Nostr Keys and Decentralized Names
`draft` `optional` `author:jeffjing`

## Introduction
[NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) defines a method for mapping Nostr public keys to internet identifiers based on the DNS system. However, it does not cover decentralized naming systems like ENS, .bit, and Unstoppable Domains. 
These naming systems have the same format as domain names in the DNS system, such as `nostr.bit`, `nostr.eth`, etc. 
By supporting these DID naming systems, Nostr will have a globally unique naming system.

## Specification
On events of kind `0` (`set_metadata`) one can specify the key `nipdid` with an decentralized name (like `nostr.bit`, `nostr.eth`, etc) as the value. The character set of the current DID naming systems varies, so we allow the name's characters to be any Unicode, except for the zero-width space, to prevent spamming.
When a client encounters such an event, it should try to resolve the public key of the name through a data provider and retrieve the corresponding value. 
The data provider can be a built-in service or a user-selected service, as long as it is stable and accurate. 
The request and response can be in any format as long as they clearly show the relationship between the requested decentralized name and the public key in the response.

## Example
Consider the following event:
```json
{
    "pubkey": "npub1p0ew5ln6hq4c20l7zftkwyrnn03php05zl8aydntugg74cu8m28sfk25c6",
    "kind": 0,
    "content": "{\"nipdid\": [\"nostr.bit\"]}"
}
```

A web client can use the [Alldid](https://github.com/dotbitHQ/AllDID) or any other Data Provider to query the Nostr record value for `nostr.bit`:

```javascript
const alldid = require('alldid')
alldid.nostr('nostr.bit').then(console.log)
// {
// "key": "profile.nostr",
// "value": "npub1p0ew5ln6hq4c20l7zftkwyrnn03php05zl8aydntugg74cu8m28sfk25c6"
// }
```

If the public key in the response matches the one in the event (as in the example above), the association is correct and the `"nipdid"` value is valid and can be displayed.

## Finding Users from Their NIP-05 Identifier
Clients may implement the ability to find users' public keys from DID names. The flow is similar to the previous example, but it is triggered by the user or the client instead of by Nostr events. The client first queries the data provider for the user's public key and then fetches the type `0` event for that user and checks if it has a matching `"nipdid."`

## User Discovery implementation suggestion
A client can also use this to allow users to search other profiles. If a client has a search box or something like that, a user may be able to type `nostr.bit` there and the client would recognize that and do the proper queries to obtain a pubkey and suggest that to the user.


## Notes
### Clients must always follow public keys, not NIP-05 addresses. 
For example, if a user clicks a button to follow the profile of `nostr.bit`, which has the public key `abc...def`, the client must maintain a primary reference to `abc...def,` not `nostr.bit`. If, for any reason, the DID Data Provider starts returning the public key `1d2...e3f` in the future, the client must not replace `abc...def` in its list of followed profiles for the user, but it should stop displaying `"nostr.bit"` for that user, as it has become an invalid `"nipdid"` property.

### User set public keys can either be in `NIP-19` npub format or hex format
Most user can only get their public key in `NIP-19` npub format, so it is difficult to force them to use hex format public key. So we should allow users to set their public key innpub format. As a result, client should consider both hex-format and `NIP-19` format when comparing the value.

### The value of `nipdid` key is array instead of string
In an ideal scenario, we should use a single DID name to handle all situations. However, from a practical perspective, many of us will have multiple DID names. Also, considering forward compatibility, the value of 'nipdid' should be an array of string instead of a single string. Currently, the client-side should always take the first string as the primary DID name.

### The key of 'nipdid' has a higher priority than 'nip05'.
This is because the authenticity and uniqueness of the DID name are guaranteed by a decentralized network, while the name in NIP-05 is issued by a centralized server, making it relatively less trustworthy than the DID name. 
Therefore, when the user sets both NIP-DID and NIP-05, the client should prioritize the valid NIP-DID field and then use the NIP-05 field.

### Keys for Nostr in DID Names
By default, the key of Nostr public key stored in the DID name records should be `nostr`. However, since different DID names have different data storage methods, here are the relevant keys specified:
- ENS: `nostr`
- .bit: `profile.nostr`
- Unstoppable Domain: `nostr`
- Solana Name Service: `nostr`

## Terminology

### DID
When different people talk about DID, they are actually referring to different things: some people are talking about cryptography-based public and private key pairs, while others are talking about blockchain-based on-chain identities. 

The DID and DID name that we mention here are decentralized, human-readable, and formally similar to domain names. 

Popular DIDs include `ENS`, `.bit`, `Unstoppable Domain`, `Bonfida`, etc. 

Each DID has a different suffix. For example, .bit's suffix is directly `.bit`, ENS's suffix is `.eth`, and Bonfida's suffix is `.sol`. Clients can support one or more suffixes (DID) based on their own scenarios.


### DID Data Provider
The DID Data Provider is responsible for providing the resolution of DID data. Its possible forms include blockchain nodes, specialized service providers, SDKs, etc.

It can be a single purpose service resolving only one suffixes. It can also be a unified service resolving all the DID names.

Here are 2 example of possible Data Providers:

**SDK for JavaScript Clients**

The JavaScript SDK is the most convenient option for JavaScript Client to use.

- [AllDID](https://github.com/dotbitHQ/AllDID)

**HTTP API**

HTTP API service can provide a wider range of applicability.

- [AllDID-API](https://github.com/dotbitHQ/AllDID-api)

> These Data Providers are **not** mandatory. Clients can choose whichever Data Provider the like, as long as it can resolve the DID names they want to support.


### SubDID
SubDID to DID is like a subdomain to a parent domain, indicating some sort of association or belonging between them. Its form is a string separated by a dot, similar to `alice.nostr.bit`. Client can display which DID the SubDID belongs to, or suggest holder of the SubDID to follow other users with the same parent DID.

## Acknowledgements
This NIP is inspired by [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) by fiatjaf, thank jaf for your great work!
