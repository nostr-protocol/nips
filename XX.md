NIP-XX
======

Distributed Directory Consensus using Relay Identity Keys and Web of Trust
---------------------------------------------------------------------------

`draft` `optional`

## Abstract

This NIP defines a protocol for distributed consensus among Nostr relays using replica identity keys and a web of trust mechanism to regulate replication of directory events. It enables relay operators to form trusted consortiums that automatically synchronize essential identity-related events (metadata, follow lists, relay lists, mute lists) while maintaining decentralization and Byzantine fault tolerance.

## Motivation

Current Nostr relay implementations operate independently, leading to fragmentation of user directory information across the network. Users must manually configure multiple relays to ensure their profile data and social graph information is widely available. This creates several problems:

1. **Data Availability**: Essential user directory events may not be available on all relays a user wants to interact with
2. **Synchronization Overhead**: Users must manually publish directory events to multiple relays
3. **Discovery Issues**: New users have difficulty finding existing users and their current relay preferences
4. **Trust Management**: No standardized way for relay operators to establish trusted relationships for data sharing

This NIP addresses these issues by enabling relay operators to form trusted consortiums that automatically replicate directory events among trusted peers, similar to the democratic Byzantine Fault Tolerant approach used in [pnyxdb](https://github.com/technicolor-research/pnyxdb).

## Specification

### Relay Identity Keys

Each participating relay MUST generate and maintain a long-term identity keypair separate from any user keys:

- **Identity Key**: A secp256k1 keypair used to identify the relay in the consortium. The public key MUST be listed in the `pubkey` field of the NIP-11 relay information document, and the relay MUST prove control of the corresponding private key through the signature mechanism described below.
- **Signing Keys**: secp256k1 keys used for Schnorr signatures on acts and directory events
- **Encryption Keys**: secp256k1 keys used for ECDH encryption of sensitive consortium communications

The relay identity key serves as the authoritative identifier for the relay and MUST be discoverable through the standard NIP-11 relay information document available at `https://<relay-domain>/.well-known/nostr.json` or via the `NIP11` WebSocket message. This ensures that any client or relay can verify the identity of a consortium member by requesting their relay information document and comparing the public key.

### NIP-11 Extensions for Identity Verification

This protocol extends the NIP-11 relay information document with two additional fields to prove control of the advertised public key:

```json
{
  "name": "relay.example.com",
  "description": "A community relay",
  "pubkey": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
  "contact": "admin@example.com",
  "supported_nips": [1, 2, 9, 11, 12, 15, 16, 20, 22],
  "software": "https://github.com/example/relay",
  "version": "1.0.0",
  "nonce": "a1b2c3d4e5f6789012345678901234567890abcdef",
  "sig": "3045022100ab1234...def567890123456789012345678901234567890abcdef"
}
```

**New Fields:**
- `nonce`: A random hex-encoded value (recommended 20+ bytes) used to strengthen signature security
- `sig`: A secp256k1 signature proving control of the private key corresponding to `pubkey`

**Signature Generation:**
1. Concatenate the `pubkey`, `nonce`, and relay address as strings: `pubkey + nonce + relay_address`
2. The relay address MUST be the canonical WebSocket URL (e.g., "wss://relay.example.com/", note the path suffix)
3. Compute SHA256 hash of the concatenated string
4. Sign the hash using the relay's private key (corresponding to `pubkey`)
5. Encode the signature as hex and store in the `sig` field

**Verification Process:**
1. Extract `pubkey`, `nonce`, and `sig` from the NIP-11 document
2. Determine the relay address from the request URL or connection context
3. Concatenate `pubkey + nonce + relay_address` as strings
4. Compute SHA256 hash of the concatenated string
5. Verify the signature using the public key and computed hash
6. If verification succeeds, the relay has proven control of the private key AND binding to the network address

This mechanism ensures that only the entity controlling the private key can generate a valid NIP-11 document for a specific network address, preventing relay impersonation attacks where an attacker might copy another relay's public key without controlling the corresponding private key. The inclusion of the relay address in the signature prevents an attacker from copying a valid NIP-11 document and hosting it at a different address.

### Event Kinds

This NIP defines the following new event kinds:

| Kind | Description |
|------|-------------|
| `39100` | Relay Identity Announcement |
| `39101` | Trust Act |
| `39102` | Group Tag Act (Registration) |
| `39103` | Public Key Advertisement |
| `39104` | Directory Event Replication Request |
| `39105` | Directory Event Replication Response |
| `39106` | Group Tag Transfer (Ownership Transfer) |
| `39107` | Escrow Witness Completion Act |

### Relay Identity Announcement (Kind 39100)

Relay operators publish this event to announce their participation in the distributed directory consortium. This event MUST be signed with the same private key used to sign the relay's NIP-11 information document:

```json
{
  "kind": 39100,
  "content": "{\"name\":\"relay.example.com\",\"description\":\"Community relay\",\"contact\":\"admin@example.com\"}",
  "tags": [
    ["d", "relay-identity"],
    ["relay", "wss://relay.example.com/"],
    ["signing_key", "<hex-encoded-public-key>"],
    ["encryption_key", "<hex-encoded-public-key>"],
    ["version", "1"]
  ]
}
```

**Tags:**
- `d`: Identifier for the relay identity (always "relay-identity")
- `relay`: WebSocket URL of the relay
- `signing_key`: Public key for verifying acts from this relay (MAY be the same as identity key)
- `encryption_key`: Public key for ECDH encryption
- `version`: Protocol version number

**Identity Verification Process:**
1. Other relays receive this announcement event
2. They extract the `pubkey` field (relay identity key) and `relay` URL
3. They fetch the NIP-11 document by making an HTTP GET request to the relay URL with the `Accept: application/nostr+json` header
   - For `wss://relay.example.com/` → HTTP GET `https://relay.example.com/` with header `Accept: application/nostr+json`
   - For `ws://relay.example.com/` → HTTP GET `http://relay.example.com/` with header `Accept: application/nostr+json`
4. They verify the NIP-11 signature using the extended verification process:
   - Extract `pubkey`, `nonce`, and `sig` from the NIP-11 document
   - Verify that the `pubkey` matches the announcement event's `pubkey`
   - Extract the relay address from the `relay` tag
   - Concatenate `pubkey + nonce + relay_address` and compute SHA256 hash
   - Verify the signature proves control of the private key AND address binding
5. They verify that the announcement event is signed by the same key
6. This confirms that the relay identity is cryptographically bound to the specific network address

### Trust Act (Kind 39101)

Relay operators create trust acts toward other relays they wish to enter consensus with:

```json
{
  "kind": 39101,
  "content": "",
  "tags": [
    ["p", "<target-relay-pubkey>"],
    ["trust_level", "75"],
    ["relay", "<target-relay-url>"],
    ["expiry", "<unix-timestamp>"],
    ["reason", "manual|automatic|inherited"],
    ["K", "1,3,6,7,1984,30023"],
    ["I", "<npub-identity>", "<hex-nonce>", "<hex-signature>"]
  ]
}
```

**Tags:**
- `p`: Public key of the target relay being attested
- `trust_level`: Replication percentage (0-100) indicating probability of replicating each event
- `relay`: WebSocket URL of the target relay
- `expiry`: Optional expiration timestamp for the act
- `reason`: How this trust relationship was established
- `K`: Comma-separated list of event kinds to replicate in near real-time (in addition to directory events)
- `I`: Identity tag with npub, nonce, and proof-of-control signature (same format as Kind 39103)

**Trust Level (Partial Replication):**

The `trust_level` is a number from **0 to 100** representing the **percentage probability** that any given event will be replicated. This implements **partial replication** where events are randomly selected based on a dice-throw mechanism:

- **100**: Full replication - ALL events replicated (100% probability)
- **75**: High partial replication - 75% of events replicated on average
- **50**: Medium partial replication - 50% of events replicated on average
- **25**: Low partial replication - 25% of events replicated on average
- **10**: Minimal partial replication - 10% of events replicated on average
- **0**: No replication - effectively disables replication

**Partial Replication Mechanism:**

For each event received from a trusted relay:

1. **Generate Random Number**: Create a cryptographically secure random number between 0-100
2. **Compare to Threshold**: If random number ≤ trust_level, replicate the event
3. **Otherwise Skip**: If random number > trust_level, discard without replication
4. **Per-Event Decision**: Each event gets an independent random roll

**Example:**
```
Trust Level: 50
Event A arrives → Roll: 42 → 42 ≤ 50 → REPLICATE
Event B arrives → Roll: 73 → 73 > 50 → SKIP
Event C arrives → Roll: 18 → 18 ≤ 50 → REPLICATE
Event D arrives → Roll: 91 → 91 > 50 → SKIP

Result: ~50% of events replicated over time
```

**Partial Replication Benefits:**

1. **Resource Management**: Reduce bandwidth, storage, and processing load proportionally
2. **Probabilistic Coverage**: Events still propagate through the network via multiple paths
3. **Network Resilience**: Different relays replicate different random subsets, providing redundancy
4. **Tunable Trade-offs**: Operators can precisely balance resources vs. completeness
5. **Graceful Degradation**: Network remains functional even with low trust levels across many peers

**Network Propagation Example:**

Consider a network where all relays use 50% trust level:
```
User publishes Event X
  ↓
Relay A receives → 50% chance → Replicates to Relays B, C, D
  ↓
Relay B (rolled yes) → 50% chance → Replicates to Relays E, F
Relay C (rolled no) → Skips
Relay D (rolled yes) → 50% chance → Replicates to Relays G, H

Result: Event X reaches ~75-85% of network despite 50% replication rate
        (due to multiple propagation paths)
```

**Trust Level Guidelines:**

- **90-100**: Use for critical partners where near-complete coverage is essential
  - Primary consortium members
  - Paid backup services
  - Legal/compliance requirements
  
- **60-89**: Use for important partners with good resources
  - Secondary consortium members
  - Established relay partnerships
  - Balanced resource/coverage trade-off

- **30-59**: Use for standard partnerships
  - General peer relationships
  - Resource-constrained but willing participants
  - Acceptable coverage with good bandwidth savings

- **10-29**: Use for exploratory or limited partnerships
  - New/untrusted relays being evaluated
  - Severely resource-constrained peers
  - Experimental connectivity

- **1-9**: Use for minimal sampling
  - Network topology discovery
  - Quality/spam assessment
  - Proof-of-concept testing

**Implementation Requirements:**

Relays implementing partial replication MUST:

1. **Use Cryptographic RNG**: Use cryptographically secure random number generation (e.g., `crypto/rand` in Go, `crypto.getRandomValues()` in JavaScript)
2. **Per-Event Independence**: Each event must get an independent random roll
3. **No Bias**: Random selection must be uniform and unbiased
4. **Deterministic Recording**: Once decision is made, it must be consistent (no re-rolling)
5. **Event Integrity**: Replicated events must be complete and unmodified

**Optional Enhancements:**

Relays MAY implement additional strategies:

- **Priority Boosting**: Increase probability for directory events (Kinds 0, 3, 5, etc.)
- **Kind-Specific Rates**: Apply different trust levels to different event kinds
- **Time-Based Adjustment**: Vary trust level based on network load or time of day
- **Reputation Weighting**: Boost probability for high-reputation users

However, the base trust_level percentage MUST always be respected as the minimum probability.

**Event Kind Replication:**
- **Directory Events**: Always replicated regardless of `K` tag (kinds 0, 3, 5, 1984, 10002, 10000, 10050)
- **Custom Kinds**: Additional event kinds specified in the `K` tag are replicated based on trust level
- **Specialization**: Enables relay operators to specialize in specific data types (e.g., long-form content, marketplace events, etc.)
- **Near Real-time**: Events matching `K` tag kinds are replicated with minimal delay
- **Bidirectional**: Replication occurs both to and from the trusted relay for specified kinds

### Group Tag Act (Kind 39102)

Group Tag Acts establish ownership and control over arbitrary string tags, functioning as a first-come-first-served registration system akin to domain name registration. These tags form the foundation for permissioned structured groups that can span multiple relays while maintaining consistent state. They also constitute a name registration system akin to DNS, and could have IP adress routing information attached to it with events (best to be CRDT add/remove so it's idempotent).

Since the uses of group identity names and webserver identity information (and it logically would include most of the same things you find in DNS records) tend to overlap, in that finding the group and going to their static content (such as structured long form documents and wikis) is the same place you want to go to read public messages and discover new friends. This allows progressive replication and redundancy for communities that enables the network to scale to larger userbases without a linear reduction in performance.

**Registration Model:**
- Group tags are **alienable** (transferable) and follow first-come-first-served registration
- The first valid Group Tag Act for a given `group_id` establishes initial ownership
- Ownership can be transferred through Group Tag Transfer events (Kind 39106) with optional escrow
- Multiple signature schemes are supported for ownership control
- Group tag names MUST use URL-safe character set (RFC 3986)

**Group Tag Naming Rules:**

Group tag identifiers MUST conform to URL path segment rules (RFC 3986):
- **Allowed characters**: `a-z`, `A-Z`, `0-9`, `-`, `.`, `_`, `~`
- **Forbidden characters**: `/`, `?`, `#`, `[`, `]`, `@`, `!`, `$`, `&`, `'`, `(`, `)`, `*`, `+`, `,`, `;`, `=`, `:`, spaces
- **Length**: 1-255 characters
- **Case sensitivity**: Group tags are case-sensitive
- **Reserved prefixes**: Tags starting with `.` or `_` are reserved for system use

**Examples:**
- ✅ Valid: `bitcoin-discussion`, `nostr.community`, `tech_forum`, `cafe~network`
- ❌ Invalid: `bitcoin/discussion`, `nostr community`, `tech#forum`, `café:network`

```json
{
  "kind": 39102,
  "content": "<optional-description>",
  "tags": [
    ["d", "<group-identifier>"],
    ["group_tag", "<tag-name>", "<tag-value>"],
    ["actor", "<relay-pubkey>"],
    ["confidence", "0-100"],
    ["owners", "<signature-scheme>", "<owner-pubkey-1>", "<owner-pubkey-2>", "..."],
    ["created", "<unix-timestamp>"],
    ["I", "<npub-identity>", "<hex-nonce>", "<hex-signature>"]
  ]
}
```

**Tags:**
- `d`: Unique identifier for this group (the registered tag name, must be URL-safe)
- `group_tag`: The tag name and value being registered
- `actor`: Public key of the relay making the act
- `confidence`: Confidence level (0-100) in this act
- `owners`: Ownership control specification (see below)
- `created`: Timestamp of group registration
- `I`: Identity tag for proof-of-control (optional)

**Ownership Schemes:**

The `owners` tag specifies the signature requirements for group control:

1. **Single Signature:**
   ```
   ["owners", "single", "<owner-pubkey>"]
   ```
   - Only one signature required for group operations
   - Simplest ownership model

2. **2-of-3 Multisig:**
   ```
   ["owners", "2-of-3", "<pubkey-1>", "<pubkey-2>", "<pubkey-3>"]
   ```
   - Requires 2 out of 3 owners to sign for group operations
   - Provides redundancy and shared control

3. **3-of-5 Multisig:**
   ```
   ["owners", "3-of-5", "<pubkey-1>", "<pubkey-2>", "<pubkey-3>", "<pubkey-4>", "<pubkey-5>"]
   ```
   - Requires 3 out of 5 owners to sign for group operations
   - Maximum distributed control while maintaining operational flexibility

**Use Cases:**

Group Tag Acts enable various structured group scenarios:

1. **Forum/Community Groups:**
   - Register a group tag like "bitcoin-discussion"
   - Anchor posts, moderation actions, and membership lists to this tag
   - Users only need one working relay from the group's relay set to see current state

2. **Permissioned Content Collections:**
   - Create private or curated content spaces
   - Owner(s) control membership and posting permissions
   - Content can be distributed across multiple relays

3. **Multi-Relay Coordination:**
   - Group state spans multiple relays in the consortium
   - Users see consistent group state regardless of which relay they connect to
   - Ownership transfers maintain continuity across relay set

4. **Administrative Hierarchies:**
   - Multisig ownership enables distributed administration
   - 2-of-3 or 3-of-5 schemes prevent single-point-of-failure
   - Ownership can be transferred to new administrator sets

5. **Domain Name Service Replacement:**
   - Additional event kinds could be created that specify such things as a set of IP addresses that have servers that are replicas of the group or individual that owns and operates the relays.
   - Additional types of services could be delivered, such as compositing compound multi-event document types into structured document formats for reading, so, subprotocols, like the differences between FTP and Gopher and HTTP, so the name service events can also include public metadata about the servers such as operating ports and the protocols available through them.

**Registration Rules:**

- **First Registration Wins:** The first valid Group Tag Act for a given `d` (group identifier) establishes ownership
- **Timestamp Precedence:** If multiple registration attempts occur simultaneously, earliest `created_at` wins
- **Conflict Resolution:** Relays MUST reject later registration attempts for the same group identifier
- **Transfer Authority:** Only current owners (with valid signatures) can transfer ownership

### Group Tag Transfer (Kind 39106)

Group Tag Transfer events enable ownership transfer of registered group tags, functioning as a "deed of sale" mechanism. Transfers can be executed immediately or through a witness-based escrow process.

**Direct Transfer (No Escrow):**

```json
{
  "kind": 39106,
  "content": "<transfer-reason-or-terms>",
  "tags": [
    ["d", "<group-identifier>"],
    ["from_owners", "<signature-scheme>", "<old-owner-pubkey-1>", "..."],
    ["to_owners", "<signature-scheme>", "<new-owner-pubkey-1>", "..."],
    ["transfer_date", "<unix-timestamp>"],
    ["signatures", "<sig-1>", "<sig-2>", "..."],
    ["I", "<npub-identity>", "<hex-nonce>", "<hex-signature>"]
  ]
}
```

**Escrow Transfer (With Witnesses):**

```json
{
  "kind": 39106,
  "content": "<transfer-terms-and-conditions>",
  "tags": [
    ["d", "<group-identifier>"],
    ["from_owners", "<signature-scheme>", "<old-owner-pubkey-1>", "..."],
    ["to_owners", "<signature-scheme>", "<new-owner-pubkey-1>", "..."],
    ["transfer_date", "<unix-timestamp>"],
    ["escrow_id", "<unique-escrow-identifier>"],
    ["seller_witness", "<witness-pubkey>"],
    ["buyer_witness", "<witness-pubkey>"],
    ["conditions", "<condition-hash>"],
    ["signatures", "<sig-1>", "<sig-2>", "..."],
    ["I", "<npub-identity>", "<hex-nonce>", "<hex-signature>"]
  ]
}
```

**Tags:**
- `d`: The group identifier being transferred (must match existing Group Tag Act)
- `from_owners`: Current ownership specification (must match existing Group Tag Act)
- `to_owners`: New ownership specification after transfer
- `transfer_date`: When the transfer takes effect
- `escrow_id`: Unique identifier for this escrow transaction (required for escrow)
- `seller_witness`: Pubkey of witness designated by seller (required for escrow)
- `buyer_witness`: Pubkey of witness designated by buyer (required for escrow)
- `conditions`: SHA256 hash of transfer conditions document (required for escrow)
- `signatures`: Schnorr signatures from current owners (must meet threshold)
- `I`: Identity tag for proof-of-control (optional)

**Transfer Validation:**

Relays MUST validate transfers according to these rules:

1. **Group Existence:** A Group Tag Act (Kind 39102) must exist for the specified `d` identifier
2. **Owner Match:** The `from_owners` tag must exactly match the current `owners` tag in the Group Tag Act
3. **Signature Threshold:** 
   - Single: 1 signature from the owner
   - 2-of-3: 2 signatures from any of the 3 owners
   - 3-of-5: 3 signatures from any of the 5 owners
4. **Signature Verification:** All provided signatures must be valid Schnorr signatures
5. **Chronological Order:** `transfer_date` must be after the group's `created` timestamp
6. **Escrow Validation (if applicable):**
   - Both `seller_witness` and `buyer_witness` must be specified
   - `escrow_id` must be unique and not previously used
   - `conditions` hash must be present
   - Transfer is PENDING until both witnesses sign completion acts

**Signature Generation:**

For each owner signing the transfer:

1. Concatenate: `group_id + from_owners_json + to_owners_json + transfer_date`
2. Compute SHA256 hash of the concatenated string
3. Sign the hash using the owner's private key
4. Add signature to the `signatures` tag

**Transfer Effect (Direct Transfer):**

Once a valid non-escrow transfer is accepted:

1. The Group Tag Act (Kind 39102) is considered superseded
2. A new implicit Group Tag Act with updated `owners` is recognized
3. All future group operations must use the new ownership specification
4. Old owners lose control; new owners gain full control immediately

**Transfer Effect (Escrow Transfer):**

When an escrow transfer is initiated:

1. Transfer enters PENDING state
2. Old owners retain control until escrow completes
3. Witnesses must sign Escrow Witness Completion Acts (Kind 39107)
4. When BOTH witnesses sign, transfer completes automatically
5. New owners gain control; old owners lose control

### Escrow Witness Completion Act (Kind 39107)

Escrow witnesses publish completion acts to authorize the finalization of an escrow transfer.

```json
{
  "kind": 39107,
  "content": "<witness-statement-or-report>",
  "tags": [
    ["escrow_id", "<escrow-identifier>"],
    ["group_id", "<group-identifier>"],
    ["witness_role", "seller_witness|buyer_witness"],
    ["completion_status", "approved|rejected"],
    ["reason", "<optional-reason-for-rejection>"],
    ["verification_hash", "<hash-of-verified-conditions>"],
    ["timestamp", "<unix-timestamp>"]
  ]
}
```

**Tags:**
- `escrow_id`: The escrow transaction identifier (from Kind 39106)
- `group_id`: The group identifier being transferred
- `witness_role`: Role of this witness (`seller_witness` or `buyer_witness`)
- `completion_status`: Whether witness approves (`approved`) or rejects (`rejected`)
- `reason`: Optional explanation (required if rejected)
- `verification_hash`: SHA256 hash of conditions document witness verified
- `timestamp`: When witness completed verification

**Escrow Protocol Flow:**

1. **Initiation:**
   - Seller creates Group Tag Transfer (Kind 39106) with escrow tags
   - Both parties agree on witnesses and conditions
   - Transfer enters PENDING state

2. **Witness Designation:**
   - Seller designates `seller_witness` (their chosen neutral party)
   - Buyer designates `buyer_witness` (their chosen neutral party)
   - Witnesses should be trusted relays or recognized arbiters

3. **Condition Verification:**
   - Witnesses independently verify transfer conditions are met
   - Conditions document (hashed in `conditions` tag) specifies requirements
   - Examples: payment received, ownership verified, legal requirements met

4. **Witness Completion:**
   - Each witness publishes Escrow Witness Completion Act (Kind 39107)
   - Both witnesses must approve (`completion_status: approved`)
   - If either witness rejects, transfer is cancelled

5. **Transfer Finalization:**
   - When BOTH witnesses sign with `approved` status
   - Relays automatically recognize new owners
   - HD keychains of new owners can modify group-tagged records
   - Old owners immediately lose modification rights

6. **Rejection Handling:**
   - If ANY witness rejects (` completion_status: rejected`)
   - Transfer is cancelled permanently
   - Group remains with original owners
   - New transfer must be initiated if parties wish to retry

**Escrow Validation Rules:**

Relays MUST validate escrow completion according to these rules:

1. **Witness Verification:**
   - Witness pubkey must match the designated witness in Kind 39106
   - Witness signature must be valid
   - Witness event timestamp must be after transfer initiation

2. **Escrow ID Matching:**
   - `escrow_id` in Kind 39107 must match Kind 39106
   - `group_id` must match the transfer

3. **Completion Requirements:**
   - BOTH seller_witness AND buyer_witness must publish Kind 39107
   - BOTH must have `completion_status: approved`
   - If ANY witness rejects, transfer fails

4. **Condition Hash Verification:**
   - `verification_hash` should match `conditions` hash from Kind 39106
   - Witnesses SHOULD verify conditions document before signing

5. **Temporal Ordering:**
   - Witness completion acts must come after transfer event
   - Both completions must occur within reasonable timeframe (suggested: 30 days)

**Witness Selection Guidelines:**

Good witness candidates:
- Established relays in the consortium with high trust scores
- Professional escrow services recognized in the community
- Legal entities or notaries (for high-value transfers)
- Community-elected arbiters with reputation systems

Poor witness candidates:
- Parties involved in the transfer (conflict of interest)
- Recently created identities with no history
- Witnesses with financial stake in the outcome

**Example Transfer Flow:**

**Direct Transfer (No Escrow):**
```
Initial Registration (Kind 39102):
  ["owners", "single", "alice-pubkey"]

Direct Transfer (Kind 39106):
  ["from_owners", "single", "alice-pubkey"]
  ["to_owners", "2-of-3", "bob-pubkey", "carol-pubkey", "dave-pubkey"]
  ["signatures", "alice-signature"]
  # No escrow tags

Result (Immediate):
  Group now controlled by 2-of-3 multisig (Bob, Carol, Dave)
```

**Escrow Transfer:**
```
Initial Registration (Kind 39102):
  ["owners", "single", "alice-pubkey"]
  Group: "bitcoin-marketplace"

Escrow Transfer Initiated (Kind 39106):
  ["from_owners", "single", "alice-pubkey"]
  ["to_owners", "single", "bob-pubkey"]
  ["escrow_id", "escrow-2024-001"]
  ["seller_witness", "relay-witness-1-pubkey"]
  ["buyer_witness", "relay-witness-2-pubkey"]
  ["conditions", "sha256-of-payment-terms"]
  ["signatures", "alice-signature"]
  
Status: PENDING (Alice retains control)

Seller's Witness Approves (Kind 39107):
  ["escrow_id", "escrow-2024-001"]
  ["witness_role", "seller_witness"]
  ["completion_status", "approved"]
  Signed by: relay-witness-1

Status: PENDING (Waiting for buyer's witness)

Buyer's Witness Approves (Kind 39107):
  ["escrow_id", "escrow-2024-001"]
  ["witness_role", "buyer_witness"]
  ["completion_status", "approved"]
  Signed by: relay-witness-2

Result (Automatic upon both witnesses):
  Group "bitcoin-marketplace" now controlled by Bob
  Bob's HD keychain can modify all records tagged with this group
  Alice's HD keychain loses modification rights
```

**Domain Name System Analogy:**

Group Tag Acts function like DNS registrations:

- **First-Come-First-Served:** Just as domain names are registered on a first-come basis
- **Alienable:** Can be sold, transferred, or reassigned like domain ownership
- **Globally Unique:** Each group identifier is unique within the consortium
- **Decentralized Registry:** Distributed across consortium relays instead of central authority
- **Transfer Mechanism:** Group Tag Transfer events are like domain transfer EPP codes
- **Multi-Relay Consistency:** Like DNS propagation, but consensus-based

**Group State Coordination:**

Groups span multiple relays while maintaining consistency:

1. **Relay Set:** A group may be active on relays A, B, C, D
2. **User Connection:** User connects to relay B
3. **State Visibility:** User sees complete group state from all relays via replication
4. **Partial Connectivity:** Even if relays C and D are down, user sees state via A and B
5. **Ownership Operations:** Transfer events replicate across all relays in the set
6. **Consensus:** Relays validate ownership changes independently using same rules

**Benefits:**

- **Resilience:** Groups survive individual relay failures
- **Portability:** Users can switch between relays in the group's relay set
- **Consistency:** Ownership and membership state synchronized across relays
- **Flexibility:** Ownership can evolve from single to multisig to new parties
- **Transparency:** All transfers are publicly auditable on the relays

### Hierarchical Deterministic Key Derivation

This protocol uses BIP32-style HD key derivation to enable deterministic key generation and management across multiple clients sharing the same identity.

**Derivation Path Structure:**
```
m/purpose'/coin_type'/identity'/usage/index
```

Where:
- `purpose'`: 39103' (this NIP's purpose, hardened)
- `coin_type'`: 1237' (Nostr coin type, hardened) 
- `identity'`: Identity index (0' for primary identity, hardened)
- `usage`: Key usage type (0=signing, 1=encryption, 2=delegation) - all secp256k1
- `index`: Sequential key index (0, 1, 2, ...)

**Example Derivation Paths:**
- `m/39103'/1237'/0'/0/0` - First secp256k1 signing key for primary identity
- `m/39103'/1237'/0'/1/0` - First secp256k1 encryption key (ECDH) for primary identity
- `m/39103'/1237'/0'/2/0` - First secp256k1 delegation key for primary identity

**Seed Sharing Requirements:**
- Clients MUST use a secure side-channel to share the master seed (BIP39 mnemonic)
- The master seed enables all clients to derive the same key space
- Clients SHOULD use encrypted communication for seed distribution
- Seed rotation SHOULD be performed periodically for security

### Public Key Advertisement (Kind 39103)

Relays advertise public keys that will be used in future operations. Keys are derived using the HD scheme above. Each relay MUST limit the number of unused key delegations to 512 per identity. Key delegations expire after 30 days if not used in any database operations:

```json
{
  "kind": 39103,
  "content": "",
  "tags": [
    ["d", "<key-identifier>"],
    ["pubkey", "<hex-encoded-public-key>"],
    ["purpose", "signing|encryption|delegation"],
    ["valid_from", "<unix-timestamp>"],
    ["valid_until", "<unix-timestamp>"],
    ["algorithm", "secp256k1"],
    ["derivation_path", "m/39103'/1237'/0'/0/5"],
    ["key_index", "5"],
    ["I", "<npub-identity>", "<hex-nonce>", "<hex-signature>"]
  ]
}
```

**Tags:**
- `d`: Unique identifier for this key advertisement
- `pubkey`: The public key being advertised (derived from HD path)
- `purpose`: Intended use of the key (signing, encryption, delegation)
- `valid_from`: When this key becomes valid
- `valid_until`: When this key expires
- `algorithm`: Cryptographic algorithm used (always "secp256k1")
- `derivation_path`: Full BIP32 derivation path used to generate this key
- `key_index`: The index component of the derivation path for easy reference
- `I`: Identity tag containing npub, nonce, and proof-of-control signature

**Key Delegation Limits:**
- Maximum 512 unused key delegations per relay identity
- Key delegations expire after 30 days without database usage
- Expired delegations MUST be deleted to prevent unbounded growth
- Usage is defined as the key being referenced in any stored directory event

**Identity Tag (`I`) Specification:**
The `I` tag provides an npub-encoded identity with proof of control that binds the identity to the delegate pubkey:

1. **npub-identity**: The identity public key encoded in npub format (NIP-19)
2. **hex-nonce**: A random nonce (recommended 16+ bytes) encoded as hex
3. **hex-signature**: Signature proving the identity holder authorized the delegate pubkey

**Identity Tag Signature Generation:**
1. Extract the delegate pubkey from the event's `pubkey` field
2. Decode the npub to get the identity pubkey as hex
3. Concatenate: `nonce + delegate_pubkey_hex + identity_pubkey_hex`
4. Compute SHA256 hash of the concatenated string
5. Sign the hash using the private key corresponding to the npub identity
6. Encode the signature as hex

**Identity Tag Verification:**
1. Decode the npub to extract the identity public key
2. Extract the delegate pubkey from the event's `pubkey` field
3. Concatenate: `nonce + delegate_pubkey_hex + identity_pubkey_hex`
4. Compute SHA256 hash of the concatenated string
5. Verify the signature using the identity public key and computed hash
6. Reject the event if verification fails

This binding ensures that:
- The identity holder explicitly authorized this specific delegate key
- The delegate key cannot be used with a different identity
- The signature proves both identity control and delegation authorization

### HD Key Management Protocol

**Client Responsibilities:**

1. **Key Pool Management:**
   - Clients MUST maintain a pool of pre-derived unused keys for each purpose
   - Recommended pool size: 20 keys per purpose type
   - Generate new keys when pool drops below 5 unused keys
   - Publish key advertisements proactively to maintain availability

2. **Key Consumption Tracking:**
   - Mark keys as "used" when they sign any event stored in the database
   - Remove used keys from the available pool
   - Update local key index to prevent reuse
   - Coordinate key usage across multiple client instances

3. **Key Advertisement Publishing:**
   - Publish new key advertisements when unused pool drops below threshold
   - Include next sequential key indices in derivation paths
   - Batch publish multiple keys to reduce network overhead
   - Respect relay rate limits when publishing advertisements

4. **Cross-Client Synchronization:**
   - Clients sharing the same seed MUST coordinate key usage
   - Use highest observed key index + 1 for new key generation
   - Query existing key advertisements to determine current state
   - Implement gap detection to identify missing key indices

**Key Discovery Process:**
```
1. Client starts up with shared seed
2. Query relays for existing key advertisements (Kind 39103)
3. Parse derivation paths to find highest used indices per purpose
4. Generate key pool starting from next available indices
5. Publish new key advertisements for unused keys
6. Monitor for key consumption and replenish pool as needed
```

**Key State Synchronization:**
- Clients SHOULD query for key advertisements on startup
- Parse `key_index` tags to determine the current key space state
- Generate keys starting from `max_observed_index + 1`
- Handle gaps in key indices gracefully (may indicate key expiration)

### Identity Tag Usage

The `I` tag serves multiple purposes in the consortium protocol:

**Identity Lookup:**
- Clients can search for events using npub identities instead of raw pubkeys
- Provides a more user-friendly way to reference identities
- Enables identity-based filtering and discovery

**Spam Prevention:**
- The proof-of-control signature prevents unauthorized use of identities
- Only the holder of the private key can create valid `I` tags
- Reduces spam by requiring cryptographic proof for each identity reference

**Consortium Benefits:**
- Relays can index events by npub identity for efficient lookup
- Enables cross-relay identity resolution within the consortium
- Supports identity-based replication policies

### Directory Event Types

The following existing event kinds are considered "directory events" and subject to consortium replication:

- **Kind 0**: User Metadata
- **Kind 3**: Follow Lists  
- **Kind 5**: Event Deletion Requests
- **Kind 1984**: Reporting
- **Kind 10002**: Relay List Metadata
- **Kind 10000**: Mute Lists
- **Kind 10050**: DM Relay Lists

### Replication Protocol

#### 1. Consortium Formation

1. Relay operators publish Relay Identity Announcements (Kind 39100)
2. Operators create Trust Acts (Kind 39101) toward relays they wish to collaborate with
3. When mutual trust acts exist, relays begin sharing directory events
4. Trust relationships can be inherited through the web of trust with appropriate confidence scoring

#### 2. Directory Event Synchronization

When a relay receives an event from a user, it:

1. Validates the event signature and content
2. If the event contains an `I` tag, verifies the identity proof-of-control signature
3. Stores the event locally
4. Updates key delegation usage tracking (if applicable)
5. Identifies trusted consortium members based on current trust acts
6. Determines replication targets based on event kind:
   - **Directory Events**: Replicate to all trusted consortium members
   - **Custom Kinds**: Replicate only to relays that have specified this kind in their `K` tag
7. Replicates the event to appropriate trusted relays using Directory Event Replication Requests (Kind 39104)

**Event Kind Matching:**
- Check each trust act's `K` tag for the event's kind number
- Only replicate to relays that have explicitly included the kind in their act
- Directory events are always replicated regardless of `K` tag contents
- Respect trust level when determining replication scope and frequency

#### 3. Key Delegation Management

Each relay in the consortium MUST implement key delegation limits and expiration:

**Delegation Limits:**
- Maximum 512 unused key delegations per relay identity
- When limit is reached, oldest unused delegations are removed first
- Delegations become "used" when referenced in any stored directory event

**Expiration Policy:**
- Key delegations expire after 30 days without usage
- Expired delegations MUST be deleted during periodic cleanup
- Usage timestamp is updated whenever a delegation is referenced

**Cleanup Process:**
- Run cleanup at least daily to remove expired delegations
- Log delegation removals for audit purposes
- Notify consortium members of delegation changes if configured

#### 4. Conflict Resolution

When conflicting directory events are received (same pubkey, same kind, different content):

1. **Timestamp Priority**: Newer events replace older ones
2. **Signature Chain Validation**: Verify the complete signature chain
3. **Identity Verification**: Validate `I` tag signatures if present
4. **Consensus Voting**: For disputed events, trusted relays vote on validity
5. **Byzantine Fault Tolerance**: System remains functional with up to 1/3 malicious nodes

#### 5. Trust Propagation

Trust relationships can be inherited through the web of trust:

1. If Relay A trusts Relay B with "high" trust
2. And Relay B trusts Relay C with "medium" trust  
3. Then Relay A may automatically trust Relay C with "low" trust
4. Trust inheritance follows configurable policies and confidence thresholds

### Message Flow

```
Relay A                    Relay B                    Relay C
   |                          |                          |
   |-- Trust Act ---->|                          |
   |<-- Trust Act ----|                          |
   |                          |-- Trust Act ---->|
   |                          |<-- Trust Act ----|
   |                          |                          |
   |-- Directory Event ------>|-- Directory Event ------>|
   |                          |                          |
   |<-- Replication Req ------|<-- Replication Req ------|
   |-- Replication Resp ----->|-- Replication Resp ----->|
```

### Security Considerations

1. **Identity Verification**: Relay identity keys MUST be verified through the extended NIP-11 relay information document. The relay MUST prove control of the private key through the `nonce` and `sig` fields, and the same keypair MUST be used to sign consortium events, creating a cryptographic binding between network address and relay identity.

2. **Trust Boundaries**: Operators should carefully configure trust levels and inheritance policies

3. **Rate Limiting**: Implement rate limiting to prevent spam and DoS attacks

4. **Signature Validation**: All events and acts MUST be cryptographically verified, including `I` tag proof-of-control signatures

5. **Privacy**: Sensitive consortium communications SHOULD use secp256k1 ECDH encryption

6. **Address Binding**: The extended NIP-11 document serves as the authoritative source for relay identity verification. The signature includes the relay's network address, creating a cryptographic binding between identity, private key control, and network location. Relays MUST NOT accept consortium events from identities that cannot be verified through their NIP-11 document's signature mechanism. The `nonce` field SHOULD be regenerated periodically to maintain security.

7. **Key Rotation**: If a relay rotates its identity key, it MUST update both its NIP-11 document and republish its Relay Identity Announcement to maintain consortium membership.

8. **Delegation Limits**: The 512 unused key delegation limit prevents resource exhaustion attacks. Relays MUST enforce this limit strictly and implement proper cleanup mechanisms.

9. **Identity Tag Security**: `I` tag signatures MUST be verified before accepting events. Invalid signatures MUST result in event rejection to prevent identity spoofing. The signature binds the identity to the specific delegate pubkey, preventing key reuse across different identities.

10. **Expiration Enforcement**: The 30-day expiration policy for unused delegations MUST be enforced to prevent unbounded storage growth and maintain system performance.

11. **Nonce Uniqueness**: Nonces in `I` tags SHOULD be unique per event to prevent replay attacks, though this is not strictly required due to the event-specific context.

12. **Delegate Authorization**: The `I` tag signature cryptographically proves that the identity holder explicitly authorized the delegate key for this specific use. This prevents unauthorized delegation and ensures accountability for delegated actions.

13. **HD Seed Security**: The master seed MUST be protected with the highest security measures. Compromise of the seed compromises all derived keys. Clients SHOULD use hardware security modules or secure enclaves when available.

14. **Key Index Coordination**: Clients sharing the same seed MUST coordinate key usage to prevent index collisions. Simultaneous key generation by multiple clients could lead to the same key being used by different clients.

15. **Side-Channel Security**: Seed sharing between clients MUST use secure, authenticated channels. Consider using encrypted messaging, secure key exchange protocols, or physical transfer for initial seed distribution.

16. **Derivation Path Validation**: Clients MUST validate derivation paths in key advertisements to ensure they follow the specified format and prevent malicious path injection.

### Implementation Guidelines

#### Relay Operators

1. Generate and securely store relay identity keys
2. Configure trust policies and act criteria
3. Implement Byzantine fault tolerance mechanisms
4. Monitor consortium health and trust relationships
5. Provide configuration options for users to opt-out of replication
6. Implement key delegation tracking and cleanup mechanisms
7. Enforce the 512 unused delegation limit per identity
8. Run daily cleanup processes to remove expired delegations
9. Validate `I` tag signatures on all incoming events
10. Maintain usage statistics for delegation management

#### Client Developers

1. Clients MAY display consortium membership information
2. Clients SHOULD respect user preferences for directory event replication
3. Clients MAY use consortium information for relay discovery
4. Clients SHOULD validate directory events from multiple sources
5. Clients MAY generate `I` tags with proof-of-control for identity references
6. Clients SHOULD validate `I` tag signatures when processing events
7. Clients MAY use npub identities from `I` tags for user-friendly display
8. Clients SHOULD implement proper nonce generation for `I` tag security
9. Clients MUST implement BIP32 HD key derivation for deterministic key generation
10. Clients SHOULD maintain key pools and coordinate usage across instances
11. Clients MUST query existing key advertisements on startup for synchronization
12. Clients SHOULD implement secure seed storage and sharing mechanisms
13. Clients MUST validate derivation paths in received key advertisements
14. Clients SHOULD implement key consumption tracking and pool replenishment

### Backwards Compatibility

This NIP is fully backwards compatible with existing Nostr implementations:

- Relays not implementing this NIP continue to operate normally
- Directory events maintain their standard format and semantics
- Users can opt-out of consortium replication
- Existing event kinds and message types are unchanged

## Rationale

This design draws inspiration from the democratic Byzantine Fault Tolerant approach used in [pnyxdb](https://github.com/technicolor-research/pnyxdb), adapting it for the decentralized nature of Nostr. Key design decisions:

1. **Separate Identity Keys**: Relay identity keys are separate from user keys to maintain clear boundaries
2. **Graduated Trust Levels**: Multiple trust levels allow for flexible consortium policies
3. **Automatic Synchronization**: Reduces user burden while maintaining decentralization
4. **Byzantine Fault Tolerance**: Ensures system reliability even with malicious participants
5. **Optional Participation**: Maintains Nostr's principle of optional protocol extensions
6. **Event Kind Specialization**: The `K` tag enables relay specialization for specific data types

**Specialization Examples:**
- **Content Relays**: Specialize in long-form content (kind 30023), articles, and media
- **Social Relays**: Focus on social interactions (kinds 1, 6, 7) and reactions
- **Marketplace Relays**: Handle commerce events (kinds 30017, 30018) and transactions
- **Developer Relays**: Sync code-related events (kinds 1617, 1618, 1621) and repositories
- **Community Relays**: Manage community events (kinds 34550, 9000-9030) and moderation

## Reference Implementation

A reference implementation will be provided showing:

1. Relay identity key generation and management
2. Trust act creation and validation
3. Directory event replication logic
4. Byzantine fault tolerance mechanisms
5. Web of trust computation algorithms
6. BIP32 HD key derivation implementation
7. Key pool management and synchronization
8. Cross-client coordination mechanisms

### Example Key Management Workflow

**Initial Setup:**
```
1. Generate BIP39 mnemonic seed: "abandon abandon ... art"
2. Derive master key: m/39103'/1237'/0'
3. Share seed securely with other client instances
```

**Client Startup:**
```
1. Query relays for existing key advertisements:
   REQ ["sub1", {"kinds": [39103], "authors": ["<identity-pubkey>"]}]

2. Parse responses to find highest key indices:
   - Signing keys: max index = 15
   - Encryption keys: max index = 8  
   - Delegation keys: max index = 3

3. Generate new key pools starting from next indices:
   - m/39103'/1237'/0'/0/16 through m/39103'/1237'/0'/0/35 (signing)
   - m/39103'/1237'/0'/1/9 through m/39103'/1237'/0'/1/28 (encryption)
   - m/39103'/1237'/0'/2/4 through m/39103'/1237'/0'/2/23 (delegation)

4. Publish key advertisements for new unused keys
```

**Key Consumption:**
```
1. Client needs to sign an event
2. Select next unused signing key from pool
3. Sign event with selected key
4. Mark key as "used" and remove from available pool
5. If pool drops below threshold, generate and publish new keys
```

**Cross-Client Coordination:**
```
1. Client A uses signing key at index 16
2. Client B queries and sees key 16 is now used
3. Client B updates its local state and uses key 17 for next event
4. Both clients coordinate through shared relay state
```

## Test Vectors

[Test vectors will be provided in a future revision]

## Changelog

- 2025-01-XX: Initial draft

## Copyright

This document is placed in the public domain.
