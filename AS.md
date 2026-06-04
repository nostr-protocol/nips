# NIP-Appointment-Scheduling

## Appointment Scheduling

`optional`

This NIP defines a decentralized appointment scheduling system built on top of Nostr. It enables a host to publish their availability and booking rules, and bookers to request appointments — all without a central scheduling service.

The final appointment is stored as an encrypted private calendar event (kind `32678`, defined in NIP-52E), meaning neither the relay nor any third party learns what was scheduled or between whom.

---

## Motivation

Existing scheduling tools (Calendly, Cal.com, etc.) act as intermediaries: they hold your availability, your contacts' data, and your confirmed appointments. This NIP proposes a scheduling flow where:

- Availability is self-published to Nostr relays, encrypted so only people with the share link can see it.
- Booking requests are end-to-end encrypted between booker and host (NIP-59 gift wraps).
- The confirmed appointment is a private calendar event encrypted with a key that the *booker* generates and controls — not a third party.
- The host and booker's free/busy status is published without leaking appointment details (kind `31926`).

---

## Event Kinds

| Kind  | Name | Type |
|-------|------|------|
| 31927 | Scheduling Page | Parameterized replaceable |
| 32680 | Scheduling Page Key Index | Parameterized replaceable |
| 31926 | Public Busy List | Parameterized replaceable |
| 1059  | Booking Request Gift Wrap (k=1057) | Regular (NIP-59) |
| 57    | Booking Request Rumor | Unsigned (inside booking request gift wrap) |
| 1059  | Booking Response Gift Wrap (k=1058) | Regular (NIP-59) |
| 58    | Booking Response Rumor | Unsigned (inside booking response gift wrap) |

The confirmed appointment uses kinds defined in NIP-52E:

| Kind  | Name | Type |
|-------|------|------|
| 32678 | Private Calendar Event | Parameterized replaceable |
| 1059  | Calendar Event Gift Wrap (k=1052) | Regular (NIP-59) |

---

## Scheduling Page (kind `31927`)

A **scheduling page** is a parameterized replaceable event authored by the host. It declares their availability windows, constraints, and appearance. The content is NIP-44 encrypted so the page body is invisible without the share link.

### Encryption

The host generates a random **view secret key**:

```
viewSecretKey = generateSecretKey()
viewPublicKey = getPublicKey(viewSecretKey)
conversationKey = nip44.getConversationKey(viewSecretKey, viewPublicKey)
content = nip44.encrypt(JSON.stringify(innerTags), conversationKey)
```

The share URL carries the view key as a query parameter: `?viewKey=<hex-encoded-view-secret-key>`.

### Outer event (public)

```jsonc
{
  "kind": 31927,
  "pubkey": "<host-pubkey>",
  "created_at": 1700000000,
  "tags": [
    ["d", "<page-identifier>"]
  ],
  "content": "<nip44-encrypted-inner-tags>"
}
```

Only the `d` tag is public. All page metadata lives in the encrypted content.

### Inner tags (encrypted)

The encrypted `content` is `JSON.stringify` of the following tag array:

| Tag | Values | Required | Description |
|-----|--------|----------|-------------|
| `title` | `<string>` | yes | Page display name, e.g. `"Schedule with Alice"` |
| `description` | `<string>` | no | Booking instructions shown to visitors |
| `slot_duration` | `<seconds>` | yes (≥1) | Duration of one bookable slot in seconds. Repeat for multiple options |
| `duration_mode` | `"fixed"\|"free"` | yes | `"fixed"` = booker picks from `slot_duration` values; `"free"` = booker picks any range within windows |
| `avail` | `"recurring", <weekday-0-6>, <HH:MM>, <HH:MM>` | no | Weekly recurring window: `0` = Sunday, `6` = Saturday, start and end in 24-hour `HH:MM` |
| `avail` | `"date", <YYYY-MM-DD>, <HH:MM>, <HH:MM>` | no | One-off date window |
| `blocked` | `<YYYY-MM-DD>` | no | Override: block this date even if it falls inside a recurring window. This takes precedence over `avail` |
| `timezone` | `<IANA-tz>` | yes | IANA timezone string, e.g. `"America/New_York"`. Availability windows are interpreted in this timezone |
| `approval` | `auto\|manual` | no | Whether the booking should be auto approved or manually approved. Defaults to `manual` |
| `min_notice` | `<seconds>` | no | Minimum lead time before a slot can be booked (default 0) |
| `max_advance` | `<seconds>` | no | How far into the future slots are visible (default 30 days) |
| `buffer` | `<seconds>` | no | Gap required between adjacent bookings (default 0) |
| `expiry` | `<seconds>` | no | How long a pending booking request stays valid before it expires (0 = never) |
| `location` | `<string>` | no | Meeting location (address, URL, etc.) |
| `image` | `<url>` | no | Cover image URL |
| `event_title` | `<string>` | no | Default title for confirmed appointments |
| `relay` | `<wss-url>` | no | Relay hint where the host monitors booking requests. Repeat for multiple relays |

### Example

```json
[
  ["title", "Schedule with Alice"],
  ["description", "30-minute intro calls, Mon–Fri 9am–5pm ET."],
  ["slot_duration", "1800"],
  ["duration_mode", "fixed"],
  ["avail", "recurring", "1", "09:00", "17:00"],
  ["avail", "recurring", "2", "09:00", "17:00"],
  ["avail", "recurring", "3", "09:00", "17:00"],
  ["avail", "recurring", "4", "09:00", "17:00"],
  ["avail", "recurring", "5", "09:00", "17:00"],
  ["timezone", "America/New_York"],
  ["min_notice", "3600"],
  ["max_advance", "2592000"],
  ["buffer", "900"],
  ["expiry", "86400"],
  ["relay", "wss://relay.example.com"]
]
```

---

## Scheduling Page Key Index (kind `32680`)

Because the view key only lives in the share URL, the host needs a way to recover it on a new device. Kind `32680` is a **self-encrypted**, parameterized replaceable record — one per scheduling page — that stores the view key durably on relays.

### Structure

```jsonc
{
  "kind": 32680,
  "pubkey": "<host-pubkey>",
  "created_at": 1700000000,
  "tags": [
    ["d", "<page-d-tag>"]
  ],
  "content": "<nip44-self-encrypted-json>"
}
```

The content is `nip44.encrypt(JSON.stringify(payload), selfConversationKey)` where `selfConversationKey = nip44.getConversationKey(hostSecretKey, hostPubkey)`.

The payload JSON schema (versioned):

```json
{
  "v": 1,
  "viewKey": "nsec1...",
  "dTag": "<page-d-tag>",
  "createdAt": 1700000000
}
```

A **tombstone** is an empty-content event with the same `d` tag. Clients that encounter a tombstone MUST treat the corresponding scheduling page as deleted and stop displaying it.

---

## Public Busy List (kind `31926`)

A host publishes their **free/busy** state as per NIP-52E. This lets visiting bookers exclude already-taken slots without learning what those slots are.

When a booking is approved, the host client MAY add a `block` entry to the relevant month's busy list and republish it, depending on whether the user wants it or not.

---

## Booking Request (kind `1059`, k=`1057`)

When a booker selects a slot, they send a **NIP-59 gift wrap** (kind `1059`) to the host. The gift wrap seals an unsigned rumor (kind `57`) carrying the appointment details. The outer `["k", "1057"]` tag allows relay-side filtering to distinguish booking requests from other gift-wrapped content.

Crucially, the booker generates both the `d` tag and the **view key** for the future private event *before* sending the request. This means:

1. The booker can add the event to their calendar immediately, with the correct view key.
2. The host uses the booker's key directly, so the booker never needs to receive and store a key from the host.

### Outer gift wrap (kind `1059`)

Standard NIP-59 gift wrap addressed to the host.

```jsonc
{
  "kind": 1059,
  "pubkey": "<ephemeral-pubkey>",
  "created_at": "<randomized-timestamp>",
  "tags": [
    ["p", "<host-pubkey>"],
    ["k", "1057"]
  ],
  "content": "<nip44-encrypted-seal>"
}
```

### Inner rumor (kind `57`, unsigned)

```jsonc
{
  "kind": 57,
  "pubkey": "<booker-pubkey>",
  "created_at": 1700000000,
  "tags": [
    ["a", "31927:<host-pubkey>:<page-d-tag>"],
    ["start", "1700000000"],
    ["end", "1700001800"],
    ["title", "Intro call with Bob"],
    ["note", "Looking forward to chatting!"],
    ["d", "<pre-generated-event-d-tag>"],
    ["viewKey", "nsec1<pre-generated-view-key>"]
  ],
  "content": ""
}
```

| Tag | Description |
|-----|-------------|
| `a` | `a`-tag reference to the scheduling page (`31927:<host-pubkey>:<page-d-tag>`) |
| `start` | Slot start as Unix seconds |
| `end` | Slot end as Unix seconds |
| `title` | Appointment title (may default to page's `event_title`) |
| `note` | Optional free-text note from the booker |
| `d` | Pre-generated `d` tag the host MUST use as the private event's `d` tag |
| `viewKey` | `nsec`-encoded view secret key the host MUST use to encrypt the private event |

---

## Booking Response (kind `1059`, k=`1058`)

After processing the request, the host sends a **NIP-59 gift wrap** (kind `1059`) back to the booker confirming approval or decline. The outer `["k", "1058"]` tag distinguishes booking responses from other gift-wrapped content.

### Outer gift wrap (kind `1059`)

Standard NIP-59 gift wrap addressed to the booker. The `status` tag is left in plaintext on the outer event so relays can filter responses by status without decrypting.

```jsonc
{
  "kind": 1059,
  "pubkey": "<ephemeral-pubkey>",
  "created_at": "<randomized-timestamp>",
  "tags": [
    ["p", "<booker-pubkey>"],
    ["k", "1058"],
    ["status", "approved"]
  ],
  "content": "<nip44-encrypted-seal>"
}
```

### Inner rumor — approved (kind `58`, unsigned)

```jsonc
{
  "kind": 58,
  "pubkey": "<host-pubkey>",
  "created_at": 1700000000,
  "tags": [
    ["a", "31927:<host-pubkey>:<page-d-tag>"],
    ["start", "1700000000"],
    ["end", "1700001800"],
    ["status", "approved"],
    ["event_ref", "32678:<host-pubkey>:<event-d-tag>", "wss://relay.example.com"],
    ["viewKey", "nsec1<view-key-echoed-from-request>"]
  ],
  "content": ""
}
```

### Inner rumor — declined (kind `58`, unsigned)

```jsonc
{
  "kind": 58,
  "pubkey": "<host-pubkey>",
  "created_at": 1700000000,
  "tags": [
    ["a", "31927:<host-pubkey>:<page-d-tag>"],
    ["start", "1700000000"],
    ["end", "1700001800"],
    ["status", "declined"],
    ["reason", "That slot is no longer available."]
  ],
  "content": ""
}
```

| Tag | Description |
|-----|-------------|
| `a` | `a`-tag reference to the scheduling page |
| `start` | Requested slot start as Unix seconds |
| `end` | Requested slot end as Unix seconds |
| `status` | `"approved"` or `"declined"` |
| `event_ref` | (approved only) coordinate of the published private event plus relay hint |
| `viewKey` | (approved only) the booker's view key echoed back |
| `reason` | (declined only) optional human-readable decline reason |

---

## Private Calendar Event (kind `32678`)

When a booking is approved, the host publishes a private calendar event as defined in NIP-52E. The host SHOULD:

- Use the `d` tag supplied by the booker in the booking request.
- Use the `viewKey` supplied by the booker in the booking request to encrypt the event content.
- Include the booker's pubkey as a participant (`["p", "<booker-pubkey>"]`) in the encrypted content.
- Send a kind `1059` **calendar event gift wrap** (k=`1052`) to the booker (per NIP-52E) so the booker receives the viewKey as a fallback.

---

## Complete Example Flow

### Actors

- **Alice** (host): `npub1alice...`, has a scheduling page at `wss://relay.example.com`
- **Bob** (booker): `npub1bob...`, visits Alice's scheduling page via share link

### Step 1 — Alice publishes scheduling page

Alice generates `viewSecretKey_A`, encrypts the page body, and publishes:

```json
{
  "kind": 31927,
  "pubkey": "aabbcc...alice",
  "created_at": 1700000000,
  "id": "event-id-1",
  "tags": [["d", "alice-30min"]],
  "content": "<nip44-encrypted: [[\"title\",\"Schedule with Alice\"],[\"slot_duration\",\"1800\"],[\"duration_mode\",\"fixed\"],[\"avail\",\"recurring\",\"1\",\"09:00\",\"17:00\"],[\"timezone\",\"America/New_York\"],[\"buffer\",\"900\"],[\"relay\",\"wss://relay.example.com\"]]>"
}
```

Alice also publishes a kind `32680` self-encrypted key record and shares the URL:
```
https://calendar.formstr.app/schedule/naddr1...fds32?viewKey=abcdef1234...
```

Alice publishes her December 2024 busy list with one existing block:

```json
{
  "kind": 31926,
  "pubkey": "aabbcc...alice",
  "created_at": 1700000000,
  "tags": [
    ["d", "2024-12"],
    ["t", "2024-12"],
    ["t", "busy"],
    ["block", "1733220000", "1733221800"]
  ],
  "content": ""
}
```

### Step 2 — Bob visits the page and picks a slot

Bob opens the share URL. His client:
1. Fetches kind `31927` for `31927:aabbcc...alice:alice-30min`
2. Decrypts the content with `viewSecretKey_A` from the URL
3. Fetches Alice's kind `31926` busy list for December 2024
4. Computes available 30-minute slots that are not blocked and not within the 1-hour minimum notice window
5. Bob selects **Monday 2024-12-02 at 10:00 AM ET** (Unix: `1733230800`–`1733232600`)

### Step 3 — Bob generates keys and adds the event to his calendar

Bob's client generates:
```
eventDTag   = "a3f9c2..." (first 30 chars of sha256("booking-31927:aabbcc...alice:alice-30min-1733230800000-<ts>"))
viewSecretKey_B = generateSecretKey()
viewKey_B   = nip19.nsecEncode(viewSecretKey_B)  // "nsec1bob..."
```

Bob immediately adds the event ref to his calendar list (kind `32123`) with the real view key:
```
["a", "32678:aabbcc...alice:a3f9c2...", "", "nsec1bob..."]
```

### Step 4 — Bob sends the booking request

Bob's client NIP-59-wraps the following rumor and publishes a kind `1059` gift wrap to Alice's relay:

**Rumor (kind 57):**
```json
{
  "kind": 57,
  "pubkey": "ddeeff...bob",
  "created_at": 1700050000,
  "tags": [
    ["a", "31927:aabbcc...alice:alice-30min"],
    ["start", "1733230800"],
    ["end", "1733232600"],
    ["title", "Intro call with Bob"],
    ["note", "Happy to connect!"],
    ["d", "a3f9c2..."],
    ["viewKey", "nsec1bob..."]
  ],
  "content": ""
}
```

**Gift wrap (kind 1059):**
```json
{
  "kind": 1059,
  "pubkey": "ffff11...ephemeral",
  "created_at": 1699900000,
  "tags": [["p", "aabbcc...alice"], ["k", "1057"]],
  "content": "<nip44-encrypted-seal>"
}
```

### Step 5 — Alice approves the booking

Alice's client receives the kind `1059` gift wrap (k=`1057`), unwraps it, and reads the rumor. It extracts `d = "a3f9c2..."` and `viewKey = "nsec1bob..."`.

Alice's client:
1. Publishes kind `32678` using `d = "a3f9c2..."` and encrypts with `viewKey_B` (the booker's key):

```json
{
  "kind": 32678,
  "pubkey": "aabbcc...alice",
  "created_at": 1700060000,
  "tags": [["d", "a3f9c2..."]],
  "content": "<nip44-encrypted-with-viewKey_B: [[\"title\",\"Intro call with Bob\"],[\"description\",\"Happy to connect!\"],[\"start\",1733230800],[\"end\",1733232600],[\"d\",\"a3f9c2...\"],[\"p\",\"aabbcc...alice\"],[\"p\",\"ddeeff...bob\"]]>"
}
```

2. Sends a kind `1059` **calendar event gift wrap** (k=`1052`) to Bob's pubkey:

**Rumor (kind 1052):**
```json
{
  "kind": 1052,
  "pubkey": "aabbcc...alice",
  "created_at": 1700060000,
  "tags": [
    ["a", "32678:aabbcc...alice:a3f9c2...", "wss://relay.example.com"],
    ["viewKey", "nsec1bob..."]
  ],
  "content": ""
}
```

**Gift wrap (kind 1059):**
```json
{
  "kind": 1059,
  "pubkey": "ffff22...ephemeral",
  "created_at": 1699870000,
  "tags": [
    ["p", "ddeeff...bob"],
    ["k", "1052"]
  ],
  "content": "<nip44-encrypted-seal>"
}
```

3. Adds the event ref to her own calendar list.

4. Updates the busy list for December 2024 with the new block:

```json
{
  "kind": 31926,
  "pubkey": "aabbcc...alice",
  "created_at": 1700060000,
  "tags": [
    ["d", "2024-12"],
    ["t", "2024-12"],
    ["t", "busy"],
    ["block", "1733220000", "1733221800"],
    ["block", "1733230800", "1733232600"]
  ],
  "content": ""
}
```

5. Sends a kind `1059` booking response (k=`1058`) to Bob:

**Rumor (kind 58):**
```json
{
  "kind": 58,
  "pubkey": "aabbcc...alice",
  "created_at": 1700060000,
  "tags": [
    ["a", "31927:aabbcc...alice:alice-30min"],
    ["start", "1733230800"],
    ["end", "1733232600"],
    ["status", "approved"],
    ["event_ref", "32678:aabbcc...alice:a3f9c2...", "wss://relay.example.com"],
    ["viewKey", "nsec1bob..."]
  ],
  "content": ""
}
```

**Gift wrap (kind 1059):**
```json
{
  "kind": 1059,
  "pubkey": "ffff33...ephemeral",
  "created_at": 1699880000,
  "tags": [
    ["p", "ddeeff...bob"],
    ["k", "1058"],
    ["status", "approved"]
  ],
  "content": "<nip44-encrypted-seal>"
}
```

### Step 6 — Bob receives confirmation

Bob's client monitors for:
- **Kind `1059` with `["k", "1052"]`** — when this calendar invitation gift wrap arrives for an event already in Bob's calendar (`a3f9c2...` is already present in kind `32123`), his client auto-approves the matching outgoing booking record and marks it as confirmed. No user interaction needed.
- **Kind `1059` with `["k", "1058"]`** — the explicit booking response gift wrap. Either path is sufficient; clients SHOULD handle both for robustness.

Because Bob's client already stored the event ref with the correct view key in Step 3, the confirmed appointment appears on his calendar the moment he submitted the request — it transitions from "pending" to "confirmed" when either of the above messages arrives.

---

## Summary Flow Diagram

```
BOOKER                                       HOST
──────                                       ────
1. Fetch kind 31927 (scheduling page)
   Decrypt with viewKey from URL
   Fetch kind 31926 (busy list)
   Compute available slots
   Select slot

2. Generate eventDTag + viewKey_B
   Add event ref (with viewKey_B) to
   own calendar list (kind 32123)           
   Store outgoing booking (pending)

3. Publish kind 1059 gift wrap ──────────►  4. Unwrap kind 1059 (k=1057)
   (k=1057, carries d-tag + viewKey_B)          Extract dTag + viewKey_B
                                                Publish kind 32678
                                                  using dTag + viewKey_B
                                                Publish kind 1059 gift wrap ─┐
                                                  (k=1052, calendar invite)   │
                                                Add event to own calendar    │
                                                Update kind 31926 busy list  │
                                                Publish kind 1059 gift wrap ─┤
                                                  (k=1058, booking response)  │
5. Receive kind 1059 (k=1052) ◄────────────────────────────────────────────┘
   Event already in calendar →
   Auto-approve booking (pending → confirmed)
   OR
   Receive kind 1059 (k=1058) ◄──────────────────────────────────────────────┘
   Update booking status
```

---

## Client Directives

### Scheduling page host

- MUST generate a fresh random `viewSecretKey` for each new scheduling page.
- MUST publish a kind `32680` self-encrypted key record after publishing the scheduling page, so the view key is recoverable on new devices.
- MUST publish a tombstone kind `32680` (empty content) when deleting a scheduling page.
- MUST update the kind `31926` busy list after every approved booking.
- MUST use the `d` tag and `viewKey` from the booker's request rumor verbatim when publishing the kind `32678` private event.
- MUST include the booker's pubkey as a participant in the encrypted private event content.
- SHOULD send a kind `1059` gift wrap (k=`1052`) to the booker in addition to the kind `1059` (k=`1058`) response, so clients can auto-approve without user interaction.
- SHOULD include relay hints in both the kind `31927` inner `relay` tags and in the `event_ref` tag of the booking response.
- SHOULD set `["expiry", "<seconds>"]` on the scheduling page to give bookers a deadline to respond to pending requests.

### Booker

- MUST generate both the `d` tag and the `viewKey` for the future event locally before sending the booking request.
- MUST add the event ref (with the real `viewKey`, not a placeholder) to their calendar list at the time of submitting the request, so the event appears immediately in their calendar.
- MUST include `["d", "<pre-generated-d-tag>"]` and `["viewKey", "<nsec>"]` in the booking request rumor.
- SHOULD monitor for kind `1059` gift wraps with `["k", "1052"]` whose event `d` tag matches a pending outgoing booking. On receipt, SHOULD auto-approve the matching booking without requiring user action.
- SHOULD also monitor for kind `1059` gift wraps with `["k", "1058"]` as a fallback path.
- MUST check the host's kind `31926` busy list(s) for the relevant month(s) before rendering available slots, in addition to applying the scheduling page's `avail`/`blocked`/`buffer` rules.

### Both parties

- MUST use NIP-59 for all booking request and response messages (kind `1059` with `["k", "1057"]` or `["k", "1058"]` respectively).
- MUST randomize the `created_at` timestamp of gift wraps (±2 days from the actual time) per NIP-59 for metadata privacy.
- SHOULD set `minNotice` and `maxAdvance` constraints on the scheduling page to avoid requests for slots that are already past or too far in the future.
- SHOULD ignore or gracefully handle booking requests with a `d` tag or `viewKey` that conflicts with an existing event.

---

## Relay Directives

- Relays SHOULD support `"#p"` and `"#k"` tag filtering for kind `1059` so clients can efficiently retrieve only their own gift wraps filtered by type.
- Relays SHOULD apply standard NIP-01 parameterized-replaceable semantics to kinds `31926`, `31927`, and `32680` (keep only the latest version per `pubkey + d`).
- Relays MAY support `"#t"` tag filtering for kind `31926` to allow clients to query busy lists by month (`"#t": ["2024-12"]`).
- Relays MAY limit the number of gift wraps stored per `#p` recipient to prevent storage abuse.
- Relays SHOULD retain kind `31926` busy list replacements for at least as long as the month they represent, allowing late-arriving booker clients to catch up.

---

## Privacy Considerations

- The scheduling page body (title, availability, location) is NIP-44 encrypted. Only someone with the share URL can read it.
- Booking request and response messages are NIP-59 gift-wrapped — they are encrypted to the recipient and authored by an ephemeral key. Relays cannot link them to either party's Nostr identity.
- The confirmed appointment (`kind 32678`) is encrypted with a key chosen by the *booker*. Neither the relay nor any observer learns the appointment details.
- The busy list (`kind 31926`) reveals *when* the host is unavailable but not *why* or *with whom*.

---

## References

- [NIP-52](https://github.com/nostr-protocol/nips/blob/master/52.md) — Calendar Events
- [NIP-52E](./NIP-52E.md) — Private Calendar Events and Private Calendar Lists
- [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) — Gift Wrap
- [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) — Versioned Encryption
- [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md) — bech32-Encoded Entities
