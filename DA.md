# NIP-DA

## Permissioned Private Data Sharing (Scoped Data Grants)

`draft` `optional`

This NIP defines a permission-based model for sharing private, structured personal data (e.g. contact details) between nostr keyholders. Each user maintains one or more encrypted, authoritative **Scoped Data Sets** on relays. Access is granted per-recipient by privately delivering a **Data Grant** containing the symmetric key for a scope. Relays store only ciphertext and never learn the contents of a data set or the identities of grantees.

The design goals are:

- **Self-sovereign data**: the publisher holds the only authoritative copy; recipients dereference it rather than storing snapshots.
- **Live updates**: when the publisher updates a data set, all current grantees see the new version on next fetch, with no re-sharing step.
- **Scoped disclosure**: different recipients can be granted different subsets (scopes) of the publisher's data.
- **Private grant graph**: relays and third parties cannot determine who has granted access to whom.
- **Revocability of future access**: a publisher can rotate a scope key to cut off future updates to any grantee (historical plaintext already decrypted by a grantee is, unavoidably, retained by them).

This NIP builds on [NIP-44](44.md) (encrypted payloads) and [NIP-59](59.md) (gift wrap). It defines no new relay behavior; conforming relays require only standard NIP-01 support for addressable events.

## Definitions

- **Publisher**: the keyholder who owns and maintains a data set.
- **Grantee**: a keyholder who has been granted access to one or more of the publisher's scopes.
- **Scope**: a named subset of the publisher's data (e.g. `basic`, `personal`, `business`), encrypted under its own key.
- **Scope key**: a random 32-byte symmetric key under which a scope's data set is encrypted.
- **Grant**: the private delivery of a scope key (plus a pointer to the data set) from publisher to grantee.

## Event Kinds

| kind    | description                          | encryption                          |
| ------- | ------------------------------------ | ----------------------------------- |
| `30440` | Scoped Data Set (addressable)        | symmetric, under scope key          |
| `440`   | Data Grant (unsigned rumor)          | NIP-59 seal + gift wrap             |
| `441`   | Grant Revocation notice (rumor)      | NIP-59 seal + gift wrap (optional)  |
| `10440` | Grant Index (replaceable, self-use)  | NIP-44 to self                      |

Kind numbers are placeholders pending assignment.

## Scoped Data Set (`kind:30440`)

An addressable event holding one scope's data as ciphertext. The `d` tag identifies the scope.

```json
{
  "kind": 30440,
  "pubkey": "<publisher-pubkey>",
  "tags": [
    ["d", "<scope-id>"],
    ["v", "<scope-key-generation>"]
  ],
  "content": "<symmetric-nip44-ciphertext>",
  ...
}
```

- `d`: an opaque scope identifier. Publishers SHOULD use short opaque strings (e.g. random 8-char ids) rather than semantic names like `family`, since `d` tags are visible to relays and semantic names leak information about the publisher's disclosure structure. The human-readable scope name belongs inside the encrypted payload or the publisher's Grant Index.
- `v`: an integer, incremented each time the scope key is rotated. This lets grantees detect that their key is stale without attempting decryption.

### Payload encryption

The `content` is produced using the NIP-44 v2 payload format, with the 32-byte scope key used directly as the `conversation_key` (no ECDH step). This reuses NIP-44's authenticated encryption, versioning, and padding scheme — the padding is important, as it reduces leakage of data-set size to relays.

### Payload schema

The decrypted payload is a JSON object:

```json
{
  "name": "Personal",
  "updated_at": 1751904000,
  "fields": {
    "display_name": "James",
    "tel": [{"value": "+1...", "label": "mobile"}],
    "email": [{"value": "james@example.com", "label": "personal"}],
    "adr": [{"value": "...", "label": "home"}],
    "note": "..."
  }
}
```

Field names SHOULD follow vCard 4.0 (RFC 6350) property names in lowercase where an equivalent exists (`tel`, `email`, `adr`, `url`, `bday`, `org`, `title`), so that clients can interoperate with existing contact ecosystems. Arbitrary additional fields MAY be included; clients MUST ignore fields they do not understand.

As with all addressable events, publishing a new `kind:30440` with the same `d` tag replaces the previous one. This is the mechanism that makes grants "live": grantees always dereference the current event.

## Data Grant (`kind:440`)

A grant delivers a scope key to a grantee. It MUST be an **unsigned rumor**, sealed (`kind:13`) and gift-wrapped (`kind:1059`) to the grantee exactly as specified in NIP-59, so that relays observe only an ephemeral pubkey delivering an opaque payload to the grantee. Publishers SHOULD also gift-wrap a copy to themselves for recoverability, following the NIP-17 convention.

The rumor:

```json
{
  "kind": 440,
  "pubkey": "<publisher-pubkey>",
  "created_at": 1751904000,
  "tags": [
    ["a", "30440:<publisher-pubkey>:<scope-id>", "<relay-hint>"],
    ["v", "<scope-key-generation>"],
    ["expiration", "<unix-timestamp>"]
  ],
  "content": "{\"scope_key\":\"<base64-32-bytes>\",\"scope_name\":\"Personal\"}"
}
```

- `a`: address of the data set this key decrypts. One or more relay hints SHOULD be included, since the grantee may share no relays with the publisher.
- `v`: the key generation this grant corresponds to.
- `expiration` (optional): a NIP-40 style timestamp after which the grantee SHOULD treat the grant as lapsed and clients SHOULD stop displaying the data. This is advisory — it is enforced by honest clients, not cryptography.
- `content`: JSON carrying the scope key and optional human-readable metadata.

Because the rumor is unsigned, a leaked grant is deniable; the grantee nevertheless authenticates it via the seal, per NIP-59.

### Grant requests

A prospective contact MAY request access by sending an ordinary NIP-17 direct message, or clients MAY implement a dedicated request flow out of band (QR code, link). This NIP deliberately does not standardize a request event: the grant decision is a human decision, and existing DM rails are sufficient to carry it.

## Updates, rotation, and revocation

**Updating data.** The publisher re-encrypts the payload under the existing scope key and republishes `kind:30440`. No per-grantee action is required. Grantees SHOULD refetch data sets they hold grants for opportunistically (on app open, before displaying a contact, or on a periodic schedule).

**Revoking a grantee.** The publisher:

1. Generates a new scope key; increments `v`.
2. Republishes the `kind:30440` event encrypted under the new key.
3. Issues fresh `kind:440` grants (new `v`) to all *remaining* grantees.
4. MAY send a `kind:441` revocation notice to the revoked party (gift-wrapped), containing the `a` tag of the affected scope, so their client can gracefully mark the contact data as no longer maintained. Publishers who prefer silent revocation simply skip this.

A revoked grantee retains any plaintext previously decrypted but can no longer read updates. Clients holding a grant whose `v` no longer matches the current data set event, and which have not received a fresh grant, SHOULD display the last-known data as stale/unmaintained rather than deleting it.

Key rotation cost is O(remaining grantees) per rotation. Publishers with large grantee sets SHOULD structure scopes so that broad, low-sensitivity data (rarely revoked) is separated from narrow, high-sensitivity data (small grantee count, cheap to rotate).

**Deleting a scope.** Replacement of an addressable event destroys the prior ciphertext on conforming relays, so deletion is a special case of rotation: the publisher SHOULD publish a final `kind:30440` replacement (a *tombstone*) with an empty payload, an incremented `v`, and a freshly generated key that is granted to no one, and MAY additionally publish a [NIP-09](09.md) deletion request (`kind:5` with the `a` tag of the scope) asking relays to drop the tombstone as well. Grantees observe generation supersession and treat the scope exactly as a revocation; previously decrypted plaintext is unaffected (see Security 2). The publisher then removes the scope from their Grant Index.

## Grant Index (`kind:10440`)

To make grants recoverable across clients with only the user's private key, both publishers and grantees SHOULD maintain a replaceable Grant Index event whose `content` is NIP-44 encrypted to their own key (conversation key derived from their own keypair, as in NIP-51 private items):

```json
{
  "issued": [
    {"scope": "<scope-id>", "scope_name": "Personal", "v": 3,
     "key": "<base64>", "grantees": ["<pubkey>", "..."]}
  ],
  "received": [
    {"a": "30440:<pubkey>:<scope-id>", "v": 2, "key": "<base64>",
     "petname": "alice", "relays": ["wss://..."]}
  ]
}
```

For the publisher, `issued` is the authoritative record needed to perform rotations. For the grantee, `received` is effectively the private address book: a list of dereferenceable, self-updating contact cards. This event contains all key material and MUST never be published unencrypted.

## Interaction with existing NIPs

- **NIP-02**: the public follow list and this NIP's private grant layer are independent and complementary. Following someone does not imply a grant in either direction.
- **NIP-51**: a grantee MAY additionally organize granted contacts using private list items; the Grant Index is distinct because it must carry key material.
- **NIP-65**: grantees SHOULD use the publisher's relay list metadata, plus grant relay hints, to locate `kind:30440` events.
- **NIP-05**: publishers MAY include their NIP-05 identifier inside a scope payload; it plays no role in the grant mechanism itself.
- **MLS-based group messaging** (NIP-EE / Marmot) solves a different problem: end-to-end encrypted *conversation streams* with forward secrecy and group evolution. This NIP addresses authoritative, addressable *data records* with live dereference and revocation-by-rotation; the two are orthogonal and complementary.

## Security and privacy considerations

1. **No forward secrecy within a scope generation.** Compromise of a scope key exposes the current payload and all payloads published under that generation. Rotation bounds the damage window. High-sensitivity fields warrant their own scope.
2. **Grantees retain decrypted plaintext.** Revocation controls future access only. This matches physical-world disclosure semantics and MUST be communicated honestly by clients ("stop sharing updates," not "un-share").
3. **Publisher metadata.** The existence, count, `d` tags, update timing, and (padded) size of a publisher's `kind:30440` events are visible to relays. Opaque `d` tags and NIP-44 padding mitigate but do not eliminate this. Publishers MAY additionally publish decoy updates. Additionally, because the `v` generation counter is a plaintext tag that increments **only** on scope-key rotation (ordinary content updates reuse the key and leave `v` unchanged), `v` effectively exposes a per-scope **rotation/revocation count** to relays — a sharper signal than update timing alone. Publishers for whom this matters MAY treat `v` as sensitive: e.g. omit it and let grantees detect staleness by a failed decryption against their held key (one wasted attempt), at the cost of the cheap client-side "is my key stale?" check the tag otherwise provides.
4. **Grant graph privacy.** Gift wrapping hides publisher↔grantee links from relays. Traffic analysis by a relay observing both the wrap delivery and a subsequent fetch of a specific `kind:30440` address could correlate; grantees SHOULD fetch via their normal read relays and MAY delay first fetch by a random interval.
5. **Key loss.** Loss of the user's private key forfeits the Grant Index and therefore all issued and received grants. This NIP inherits nostr's key-management model; deployments serious about mainstream contact use cases should pair it with NIP-46 remote signing and/or social recovery schemes, which are out of scope here.
6. **Malicious data set replacement.** Only the publisher can sign a replacement `kind:30440`; grantees MUST verify the event signature and that its pubkey matches the `a` tag before decrypting.
7. **Relay withholding.** A relay can serve a stale `kind:30440` (rollback). The `updated_at` field inside the payload lets clients prefer the newest authenticated payload across multiple relays.

## Rationale

- **Symmetric scope keys rather than per-grantee encryption of the payload** make the data set O(1) in grantee count and make updates free, at the cost of rotation-on-revoke. For contact data — low churn in revocations, potentially high churn in field values — this is the right trade.
- **Reusing the NIP-44 payload format with a raw key** avoids introducing a second encryption construction into the ecosystem.
- **Unsigned gift-wrapped grants** follow NIP-17's deniability and metadata-privacy rationale; the grant graph is precisely the information this NIP exists to protect.
- **No new relay features** keeps the barrier to deployment at zero: this NIP is implementable today by clients alone against existing relays.
