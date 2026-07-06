# Draft NIP: Transient Private Location Data (TPLD)

**Title:** Transient Private Location Data **Status:** Draft **Kind:** 20411 (Proposed range: 20000–20999) **Authors:** Masonavic **Created:** 2026-04-01

## Abstract

This NIP defines a standardized method for sharing ephemeral, encrypted geolocation data on the Nostr network. It enables users to broadcast their precise or coarse-grained location (encoded as a geohash) to a specific set of trusted recipients without revealing the data to the public or relay operators. The specification supports multi-recipient sharing by encapsulating multiple NIP-44 encrypted payloads within a single event, allowing for efficient discovery and privacy-preserving coordination.

## Motivation

Centralized location-sharing services (e.g., Google Maps, Apple Find My) require users to trust a central authority with their real-time movements. While Nostr provides a decentralized alternative, existing event kinds lack a standardized, privacy-first mechanism for ephemeral location sharing.

Users need a way to:

1. Share location data that expires automatically (ephemerality).
2. Restrict visibility to specific recipients (privacy).
3. Share with multiple recipients efficiently without creating separate events for each.
4. Support variable precision (from city-level to street-level) based on trust levels.

## Use Cases

1. Share city-level data with peers to enable "in town" notifications.
2. Share fine-grained location data with friends of family for safety or meeting purposes.
3. Share data with advertisers or other brokers in exchange for Zaps.

## Specification

### Event Kind

Events adhering to this NIP MUST use a kind in the range **20000–20999**.

- **Recommended Default:** `20411`
- **Rationale:** This range is reserved for ephemeral or temporary data types, signaling to clients that these events should not be stored indefinitely.

### Event Tags

The event MUST include the following tags:

- `["p", "<recipient_pubkey>"]`: One tag for **each** recipient included in the payload. This allows clients to filter events relevant to the user without decrypting the entire content.
- `["precision", "<level>"]`: (Optional) Indicates the geohash precision level (e.g., `5` for town, `8` for street).
- `["ttl", "<seconds>"]`: (Optional) Suggested Time-To-Live in seconds. Clients SHOULD discard events older than this duration.

### Content Structure

The `content` field of the event MUST be a JSON object containing a map of recipient public keys to their respective NIP-44 encrypted payloads.

**Schema:**

```javascript
{
  "version": 1,
  "payloads": {
    "<recipient_pubkey_hex>": "<base64_encoded_nip44_ciphertext>",
    "<recipient_pubkey_hex>": "<base64_encoded_nip44_ciphertext>"
  }
}
```

**Payload Details:**

- The value for each key in `payloads` is the result of encrypting the location data using **NIP-44** with the sender's private key and the specific recipient's public key.
- The plaintext inside the NIP-44 encryption MUST be a JSON object containing the location data:{
  "geohash": "<string>",
  "timestamp": <unix\_timestamp>,
  "accuracy\_meters": <number> // Optional, estimated accuracy
}

### Encryption Process (Sender)

1. **Prepare Data:** Construct the location JSON object (geohash, timestamp, accuracy).
2. **Iterate Recipients:** For each intended recipient:
    - Derive the shared secret using the sender's private key and the recipient's public key (per NIP-44).
    - Encrypt the location JSON object using the shared secret.
    - Base64 encode the resulting ciphertext.
3. **Construct Event:** Create the JSON object with the `payloads` map.
4. **Sign:** Sign the event with the sender's private key.
5. **Tag:** Add `p` tags for all recipients.

### Decryption Process (Receiver)

1. **Filter:** The client scans for events of kind `20411` (or the configured range) containing a `p` tag matching the user's public key.
2. **Locate Payload:** Extract the ciphertext associated with the user's public key from the `payloads` map.
3. **Decrypt:** Use the user's private key and the sender's public key to derive the shared secret and decrypt the ciphertext (per NIP-44).
4. **Validate:** Parse the inner JSON. If the `timestamp` is older than the `ttl` (if present) or a local threshold (e.g., 1 hour), discard the data.

### Client Behavior

- **Storage:** Clients SHOULD treat these events as ephemeral. They should not persist the decrypted location data longer than necessary (e.g., until the user closes the app or the TTL expires).
- **Display:** Clients MAY render the decrypted geohash on a map interface, updating in real-time if new events are received.
- **Privacy:** Clients MUST NOT expose the `payloads` map or the decrypted location data to third-party scripts or unauthorized extensions.

## Rationale

### Why Multiple Encrypted Payloads?

While NIP-44 is strictly point-to-point, bundling multiple ciphertexts into a single event reduces network overhead compared to sending separate events for each recipient. It also ensures that all recipients receive the update atomically (all or nothing), preventing race conditions where one user sees an update and another does not.

### Why Geohash?

Geohashes provide a hierarchical representation of location. By adjusting the precision (length of the string), users can control the trade-off between utility and privacy. A 5-character geohash (\~2.4km x 2.4km) is sufficient for "town matching" without revealing a specific address, while an 8-character geohash (\~19m x 19m) is suitable for precise meetups.

### Why Ephemeral?

Location data loses value rapidly. Storing it indefinitely creates a permanent surveillance record. By defining this as an ephemeral event kind, we encourage a culture of "forgetting" by default, aligning with privacy-centric design principles.

## Backwards Compatibility

This NIP introduces a new event kind and does not interfere with existing Nostr standards. Clients that do not recognize kind `20411` will simply ignore the event or display it as raw data, posing no security risk.

## Security Considerations

- **Metadata Leakage:** While the content is encrypted, the list of recipients (`p` tags) and the timing of events are public. Users should be cautious about inferring social graphs or movement patterns from event frequency.
- **Relay Trust:** Relays can see the event structure and the list of recipients. Users should utilize multiple relays to prevent a single point of surveillance.

## Acknowledgments

Special thanks to the Nostr community for the ongoing development of NIP-44 and the broader decentralized ecosystem.