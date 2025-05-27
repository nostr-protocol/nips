# NIP-CC: Communi-keys

This NIP defines a standard for creating, managing and publishing to communities by leveraging existing key pairs and relays.   

This approach uniquely allows:  

* any existing npub to become a community (identity + manager). 
* any existing publication to be targeted at any community. 
* communities to have their own selected content types. 

## Motivation

Current community management solutions on Nostr often require complex relay-specific implementations, lack proper decentralization and don't allow publications to be targeted at more than one community. 

This proposal aims to simplify community management by utilizing existing Nostr primitives (key pairs and relays) while adding minimal new event kinds.

## Specification

### Community Creation Event

A community is created when a key pair publishes a `kind:10222` event. The pubkey of this key pair becomes the unique identifier for that community. One key pair can only represent one community.

The community's name, picture, and description are derived from the pubkey's `kind:0` metadata event.

```json
{
   "kind": 10222,
   // The name, picture and description of the community are derived from the pubkey's kind 0
   "pubkey": <community-pubkey>,
   "tags": [
    // at least one relay for the community
    ["r", <relay-url>],

    // one or more blossom servers
    ["blossom", <blossom-url>],

    // one or more ecash mints
    ["mint", <mint-url>, "cashu"],

    // one or more content sections: ["content", <name>]
    ["content", "Chat"],
    ["k", "9"],

    ["content", "Post"],
    ["k", "1"],
    ["k", "11"],
    ["fee", "10", "sat"],
    ["exclusive", "true"], // true if this event kind can ONLY be targeted to this community, not others

    ["content", "Article"],
    ["k", "30023"],
    ["k", "30040"],
    ["role",  "admin", "team"] // only admins and team can post Articles

    // Optional terms of service, points to another event
    ["tos", <event-id-or-address>, <relay-url>],

    // Optional location
    ["location", "<location>"],
    ["g", "<geo-hash>"],

    // Optional description
    ["description", "A description text that overwrites the profile's description, if needed"],
   ]
}
```

#### Tag definitions

| Tag | Description |
|-----|-------------|
| r | URLs of relays where community content should be published. First one is considered main relay. |
| blossom | URLs of blossom servers for additional community features (optional). |
| mint | URL of community mint for token/payment features (optional). |
| content | Name of Content Type section that the Communikey works with |
| k | Event kind, within a content type section. |
| retention | Retention policy in format [kind, value, type] where type is either "time" (seconds) or "count" (number of events). |
| fee | Admission fee in format [kind, amount, unit] where unit is typically "msats". |
| exclusive | boolean that specifies if this content type can be targeted to other communities too. |
| role | Publishing permission in format [kind, role1, role2, ...] where roles are plain text labels like "admin", "team", "CEO", etc. |
| tos | URL to the community's posting policy. |
| location | Location of the community. |
| g | Geo hash of the community. |
| description | Description of the community. |

The pubkey of the key pair that creates this event serves as the unique identifier for the community. This means:

1. Each key pair can only represent one community
2. Communities can be easily discovered by querying for the most recent `kind:10222` event for a given pubkey
3. Community managers can update their settings by publishing a new `kind:10222` event

### Community Identifier Format

Communities can be referenced using an "ncommunity" format:

```
ncommunity://<pubkey>?relay=<url-encoded-relay-1>&relay=<url-encoded-relay-2>
```

This format follows the same principles as nprofile, but specifically for community identification. While the ncommunity format is recommended for complete relay information, the standard pubkey format can also be used when relay discovery is not needed.

### Targeted Publication Event

To target an existing publication at specific communities, users create a `kind:30222` event:

```json
{
  "kind": 30222,
  "content": "",
  "tags": [
    ["d", "<random-id>"], // or maybe equate to "e" tag, but then we run into trouble for the "a" tags
    ["e" , "<event-id-of-original-publication>"],         //  Or  ["a" , "<event-id-of-original-publication>"]       
    ["k", "<kind-of-original-publication>"],
    ["p", "<community-pubkey>"],
    ["r", "<main-relay-url>"]
  ]
}
```

The targeted publication event can reference the original publication in two ways:
1. Using an `e` tag with the event ID, relay hint, and pubkey hint
2. Using an `a` tag with the event address and relay hint

The `k` tag specifies the kind of the original publication, and the `p` tags list the communities that this publication is targeting.

**IMPORTANT**: For publishing new events clients SHOULD create a targeted Publication event first (that only has an id) and reference it with an h-tag in the main event.

### Community-Exclusive Publications 

Some content types should be exclusive by default: Chat, Labels, Forum, ...

For these we don't need a Targeted Publication event and can just use an h-tag instead. 

For chat messages within a community, users should use `kind:9` events with a community tag:

```json
{
  "kind": 9,
  "content": "<message>",
  "tags": [
    ["h", "<community-pubkey>"]
  ]
}
```

The same pattern applies to Labels, Forum posts, ... 

## Implementation Notes

1. Clients SHOULD verify that targeted publications (`kind:32222`) are present on the community's main relays. The main relay specified in the community creation event SHOULD be considered authoritative for community-related events. Clients MAY, however, fall back on a backup relay (as the authority) when the main relay is offline.
2. Clients MAY cache community metadata events to reduce relay queries.
3. Relay operators MAY implement/automate additional filtering or moderation based on community specifications.

## Benefits

1. Any existing npub can become a community
2. Communities are not permanently tied to specific relays
3. Simplified relay operator implementation compared to other community proposals
4. Supports relay-per-community model while remaining flexible
5. Enables cross-community interaction through targeted publications
6. The ability to target publications to more than one community and the access to any desired content type eliminates the need for #channels or rooms
7. Flexible referencing allows for both simple and complete community identification

## Security Considerations

1. Clients MUST verify event signatures from community managers
2. Relays SHOULD implement rate limiting for community-related events
3. Clients SHOULD respect the relay hierarchy specified in community creation events
4. When using simple pubkey references, clients should be aware of potential relay discovery challenges


