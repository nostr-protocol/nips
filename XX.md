
This NIP defines a Quorum as an nsec shared among a public or private group of members. This is accomplished through a T of N threshold multi-signature scheme (FROST) where the members can chose to represent themselves with their own share of the secret, or they can delegate this power to a council of representatives.

A quorum is defined through the replaceable event `kind:xxx`:

```
{
  "id": "<32-bytes lowercase hex-encoded SHA-256 of the the serialized event data>",
  "pubkey": "<32-bytes lowercase hex-encoded public key of the current_governance_npub>",
  "created_at": <Unix timestamp in seconds>,
  "kind": xxx,
  "tags": [
    ["d", "<Quorum name>"],
    ["description", "<Quorum description>"],
    ["image", "<Quorum image url>", "<Width>x<Height>"],

	// chain of governance
	["p", "<32-bytes hex of governance_npub1>", "<optional recommended relay URL>", "previous_governanance_npub"],
	["p", "<32-bytes hex of governance_npub1>", "<optional recommended relay URL>", "current_governanance_npub"],

	// ... other tags relevant to defining the community

	// members
    ["p", "<32-bytes hex of a pubkey1>", "<optional recommended relay URL>", "member"],
    ["p", "<32-bytes hex of a pubkey2>", "<optional recommended relay URL>", "member"],
    ["p", "<32-bytes hex of a pubkey3>", "<optional recommended relay URL>", "member"],

    // council
    ["p", "<32-bytes hex of a pubkey1>", "<optional recommended relay URL>", "representative"],
    ["p", "<32-bytes hex of a pubkey2>", "<optional recommended relay URL>", "representative"],
    ["p", "<32-bytes hex of a pubkey3>", "<optional recommended relay URL>", "representative"],

    // relays used by the quorum (w/optional marker)
    ["relay", "<relay dedicated to hosting this quorum>", "self"],
    ["relay", "<relay where to send and receive approvals>", "approvals"],
    ["relay", "<relay where to post requests to and fetch approvals from>"]

    // signed by the previous previous_governanance_npub
    // signed by the current current_governanance_npub
  ]
}
```


### Chain of Governance

When the council of representatives changes, the old nsec and its secret shares are made obsolete and a new nsec is shared to the new council. The final act of any council is either signing the update `kind:xxx` which passes on the chain-of-governance to the next council. If the council fails to do this, the decision of how to proceed is pushed to the members themselves.

A client only needs the most recent `kind:xxx` to function, but will need the entire history of `kind:xxx` updates to verify the chain-of-governance.


### Membership

A quorum may be defined as either public (anyone can become a member) or private (membership must be approved by the quorum).

Anyone may join a public quorum by submitting `kind:yyy`. For a private quorum, this request must be approved by the quorum in a similar fashion as the moderated community event `kind:4550`.

Similarly, any member may resign.


### Quorum Ontologies

A quorum may be a member of another quorum, which enables the construction of multi-quorum ontologies. For example, a each locality may have a quorum, and those quorums can join together by becoming members of a regional quorum.


### Elections / Polls

The governance is enforced by the threshold multi-signature, however, polls and elections may used in a variety of ways:
 - Every 4 years the quorum issues a popular vote election and the top N are selected as the new council
 - The council can poll the member population to gain insight into a current event
 - The council can issue a poll to themselves in private to see where they stand on certain issues
 - A member can issue a vote of no confidence, which if it receives > 50% of the populous vote, an reelection of the council is initiated immediately.


### Laws

An optional tag in the Quorum `kind:xxx` is used to define a list of laws. At the time of this writing, no formal system of the laws is proposed but it entirely possible. As a starting point, laws can be expressed in natural language to codify shared intentions. For example, the laws could include a Declaration of Independence, Bill of Rights and Constitution.

Example of already formalized laws:
  - "An event may be signed by the quorum's npub only if a quorum of the council has been achieved ."
  - "All members of this private quorum must be approved by the council."

Examples of natural language laws:
 - "An election of the council is held every 4 years."
 - "No individual can be a representative for more than two terms".
 - "The jurisdiction of this quorum is in the United States."

If this all were successful, a quorum itself could eventually represent its jurisdiction and nation.


### Benefits of using Quorum

A quorum provides a cryptographic structure to enable maximal resilience for decentralized decisions. This structure provides full transparency of who is eligible to vote, who voted, and what the results are, etc. If the chain of governance is broken, then the population will be aware of this precisely and they can vote among themselves how to proceed.

This structure also allows multiple quorums to join together in agreement and to represent their alliance with a formal ontology.  These ontologies are publicly visible, enabling members to monitor and restructure to mitigate weakness.

In it's essence, this NIP is a new category of solution to the centralization problem of decentralized organizations.


### Examples

Example use cases:
 - Source Code Development  (Linux, Bitcoin, Nostr, etc)
 - International Networks (Academic Journals, Sports Leagues, News, Entertainment, etc)
 - Companies (boards, leadership councils, etc)
 - Governance (HOAs, Trusts, Nations, etc)
 - More resilient & dynamic moderated community or feed


### Related NIPS & Projects:

NIP-29: Relay-Based Groups
https://github.com/nostr-protocol/nips/blob/master/29.md

NIP-29 Pull Request: Shared Event Ownership through DVMs
https://github.com/nostr-protocol/nips/pull/1015

NIP-72: Moderated Communities
https://github.com/nostr-protocol/nips/blob/master/72.md

NIP-112: Encrypted Group Events
https://github.com/nostr-protocol/nips/pull/580

FiatJaf's Pyramid
https://github.com/fiatjaf/pyramid

