NIP-72
======

Moderated Communities (Reddit Style)
------------------------------------

`draft` `optional` `author:vitorpamplona` `author:arthurfranca`

The goal of this NIP is to create moderator-approved public communities around a topic. It defines the replaceable event `kind:34550` to define the community and the current list of moderators/administrators. Users that want to post into the community, simply tag any Nostr event with the community's `a` tag. Moderators issue an approval event `kind:4550` that links the community with the new post.

# Community Definition

`Kind:34550` SHOULD include any field that helps define the community and the set of moderators. `relay` tags MAY be used to describe the preferred relay to download requests and approvals.

```json
{
  "id": "<32-bytes lowercase hex-encoded SHA-256 of the the serialized event data>",
  "pubkey": "<32-bytes lowercase hex-encoded public key of the event creator>",
  "created_at": <Unix timestamp in seconds>,
  "kind": 34550,
  "tags": [
    ["d", "<Community name>"],
    ["description", "<Community description>"],
    ["image", "<Community image url>", "<Width>x<Height>"],

    //.. other tags relevant to defining the community

    // moderators
    ["p", "<32-bytes hex of a pubkey1>", "<optional recommended relay URL>", "moderator"],
    ["p", "<32-bytes hex of a pubkey2>", "<optional recommended relay URL>", "moderator"],
    ["p", "<32-bytes hex of a pubkey3>", "<optional recommended relay URL>", "moderator"],

    // relays used by the community (w/optional marker)
    ["relay", "<relay hosting author kind 0>", "author"],
    ["relay", "<relay where to send and receive requests>", "requests"],
    ["relay", "<relay where to send and receive approvals>", "approvals"],
    ["relay", "<relay where to post requests to and fetch approvals from>"]
  ]
}
```

# New Post Request

Any Nostr event can be a post request. Clients MUST add the community's `a` tag to the new post event in order to be presented for the moderator's approval.

```json
{
  "id": "<32-bytes lowercase hex-encoded SHA-256 of the the serialized event data>",
  "pubkey": "<32-bytes lowercase hex-encoded public key of the event creator>",
  "created_at": <Unix timestamp in seconds>,
  "kind": 1,
  "tags": [
    ["a", "34550:<Community event author pubkey>:<d-identifier of the community>", "<Optional relay url>"],
  ],
  "content": "<My content>"
}
```

Community management clients MAY filter all mentions to a given `kind:34550` event and request moderators to approve each submission. Moderators MAY delete his/her approval of a post at any time using event deletions (See [NIP-09](09.md)).

# Post Approval by moderators

The post-approval event MUST include `a` tags of the communities the moderator is posting into (one or more), the `e` tag of the post and `p` tag of the author of the post (for approval notifications). The event SHOULD also include the stringified `post request` event inside the `.content` ([NIP-18-style](18.md)) and a `k` tag with the original post's event kind to allow filtering of approved posts by kind.

```json
{
  "id": "<32-bytes lowercase hex-encoded SHA-256 of the the serialized event data>",
  "pubkey": "<32-bytes lowercase hex-encoded public key of the event creator>",
  "created_at": <Unix timestamp in seconds>,
  "kind": 4550,
  "tags": [
    ["a", "34550:<Community event author pubkey>:<d-identifier of the community>", "<Optional relay url>"],
    ["e", "<Post Request ID>", "<Optional relay url>"],
    ["p", "<Post Request Author ID>", "<Optional relay url>"],
    ["k", "<New Post Request kind>"],
  ],
  "content": "<New Post Request JSON>"
}
```

It's recommended that multiple moderators approve posts to avoid deleting them from the community when a moderator is removed from the owner's list. In case the full list of moderators must be rotated, the new moderator set must sign new approvals for posts in the past or the community will restart. The owner can also periodically copy and re-sign of each moderator's approval events to make sure posts don't disappear with moderators.

Post Approvals of replaceable events can be created in three ways: (i) by tagging the replaceable event as an `e` tag if moderators want to approve each individual change to the repleceable event; (ii) by tagging the replaceable event as an `a` tag if the moderator authorizes the replaceable event author to make changes without additional approvals and (iii) by tagging the replaceable event with both its `e` and `a` tag which empowers clients to display the original and updated versions of the event, with appropriate remarks in the UI. Since relays are instructed to delete old versions of a replaceable event, the `.content` of an `e`-approval MUST have the specific version of the event or Clients might not be able to find that version of the content anywhere.

Clients SHOULD evaluate any non-`34550:*` `a` tag as posts to be included in all `34550:*` `a` tags.

# Displaying

Community clients SHOULD display posts that have been approved by at least 1 moderator or by the community owner.

The following filter displays the approved posts.

```js
{
  "authors": ["<Author pubkey>", "<Moderator1 pubkey>", "<Moderator2 pubkey>", "<Moderator3 pubkey>", ...],
  "kinds": [4550],
  "#a": ["34550:<Community event author pubkey>:<d-identifier of the community>"],
}
```

Clients MAY hide approvals by blocked moderators at the user's request.
