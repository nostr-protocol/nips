# Nostr P2P Trading Ecosystem Proposal

**Date**: November 17, 2025  
**Proposal Type**: NIP Update + Two New NIPs  
**Target Repository**: nostr-protocol/nips

---

## Executive Summary

This proposal introduces a comprehensive peer-to-peer (P2P) trading ecosystem for Nostr through three interconnected NIPs:

1. **NIP-69 Update**: Add `from` tag to enable orders to reference their originating adverts
2. **New NIP (Advert Events)**: Define standing offer/advert events for liquidity discovery
3. **NIP-1129 (Arbiter Profile)**: Define arbiter profiles for dispute resolution

Together, these NIPs create a complete P2P trading infrastructure: **liquidity discovery → order execution → dispute resolution**.

---

## Motivation

### The Problem

Current P2P trading on Nostr (via NIP-69) enables specific trade orders but lacks:
- **Discovery mechanism**: No standard way for makers to broadcast standing offers
- **Lifecycle tracking**: No way to connect orders back to their originating adverts
- **Dispute resolution**: No standard for arbiter profiles when trades encounter problems
- **Separation of concerns**: NIP-69 should be treated as either an order event or an advert event, not both.

These problems prevent the network from providing a seamless peer-to-peer trading experience compared to centralized exchanges.

### The Solution

Our proposal addresses these gaps through three coordinated improvements:

**1. Liquidity Discovery (Advert Events)**
- Makers broadcast standing offers with their available liquidity, trading pairs, and conditions
- Takers discover suitable makers before creating specific orders
- Creates a "marketplace" layer on top of order execution

**2. Lifecycle Tracking (NIP-69 `from` tag)**
- Orders reference their originating adverts via the `from` tag
- Adverts maintain lists of related orders via the `orders` tag
- Enables complete trading lifecycle visibility

**3. Dispute Resolution (Arbiter Profiles)**
- Arbiters publish discoverable profiles with fees, expertise, and past reviews from past arbitrations.
- Platforms can implement standardized dispute resolution
- Increases trust and safety in P2P trades

---

## Proposed NIPs Overview

### 1. Update to NIP-69: Adding the `from` Tag

**Change Type**: Minor update (backwards compatible)  
**Event Kind**: 38383 (existing)  
**Status**: Update to existing NIP

#### What Changes

Add one optional tag to NIP-69 order events:

```json
["from", "advert-event-id"]
```

This tag allows orders to reference the advert event ID where they originated, creating a bidirectional relationship between adverts and orders.

#### Documentation Updates

- Add `from` tag to the example event JSON
- Document the tag in the Tags section

#### Backwards Compatibility

Fully backwards compatible. The `from` tag is optional and does not affect existing implementations.

**Full specification**: See `69.md`

---

### 2. New NIP: Peer-to-Peer Advert Events

**NIP Number**: TBD  
**Event Kind**: TBD (requesting assignment in 30000-39999 range, suggest 38384)  
**Status**: New NIP proposal  
**File**: `nip-69-advert.md`

#### Purpose

Define advert events that enable makers to broadcast standing offers to trade. While NIP-69 defines specific trade requests (orders), adverts are ongoing availability announcements.

#### Key Features

**Event Structure**:
- Addressable events (parameterized replaceable) so makers can update their offers
- Contains trading pairs, exchange rates, trade limits
- Lists supported payment methods
- Includes maker profile reference (NIP-39)
- Maintains list of related order events

**Integration with NIP-69**:
- Adverts include `orders` tag listing related NIP-69 order event IDs
- Orders include `from` tag pointing back to originating advert
- Creates complete trading lifecycle: `[Advert] ↔ [Order]`

#### Use Cases

1. **Maker**: Creates advert broadcasting "I'll sell BTC for USD via bank transfer"
2. **Taker**: Discovers adverts, finds suitable maker
3. **Taker**: Creates NIP-69 order with `from` tag referencing the advert
4. **Maker**: Updates advert's `orders` tag to include the new order event ID
5. **Platform**: Tracks complete lifecycle from discovery to execution

#### Tags Defined

- `d` (required): Advert ID
- `k` (required): Advert type (sell/buy)
- `f` (required): Fiat currency (ISO 4217)
- `a` (required): Asset being traded (ISO 4217)
- `s` (required): Status (active/inactive/expired)
- `exchange_rate` (required): Exchange rate
- `pair` (required): Trading pair
- `tm` (required): Trade limits (min/max amounts)
- `pm` (required): Payment methods
- `p` (required): Profile (NIP-39)
- `network` (required): Network (mainnet/testnet/etc)
- `layer` (required): Layer (onchain/lightning/liquid)
- `y` (required): Platform pubkey
- `z` (required): Document type ("advert")
- `volume` (optional): Available volume
- `reviews` (optional): Review URLs
- `orders` (optional): Related NIP-69 order event IDs
- `g` (optional): Geohash
- `updated_at` (optional): Last update timestamp
- `expiration` (optional): Expiration date

**Full specification**: See `nip-69-advert.md`

---

### 3. NIP-1129: Arbiter Profile for Dispute Resolution

**NIP Number**: 1129 (proposed)  
**Event Kind**: 1129  
**Status**: New NIP proposal  
**File**: `nip-1129.md`

#### Purpose

Define arbiter profiles for neutral third parties who resolve disputes in P2P trades. When NIP-69 orders encounter problems, both parties may need an arbiter to review evidence and make fair judgments.

#### Key Features

**Profile Structure**:
- Arbiter identity and description
- Fee structure (percentage of trade value)
- Supported currencies and payment methods
- Geographic availability (geohash)
- Ratings and reviews from past arbitrations
- Based on NIP-39 profiles

**Integration with NIP-69**:
- When disputes arise in NIP-69 orders, parties can select arbiters
- Arbiters publish discoverable profiles via this NIP
- Platforms implement dispute resolution using these standard profiles

#### Use Cases

1. **Arbiter**: Publishes profile with fees, expertise, supported currencies
2. **Platform**: Discovers available arbiters matching trade parameters
3. **Dispute**: Buyer and seller in NIP-69 order select arbiter
4. **Resolution**: Arbiter reviews evidence and makes judgment
5. **Feedback**: Parties update arbiter's reviews/ratings

#### Tags Defined

- `p` (optional): NIP-39 public profile
- `f` (optional): Fee percentage
- `reviews` (optional): Review list
- `fiat` (optional): Supported fiat currencies (ISO 4217)
- `pms` (optional): Supported payment methods
- `g` (optional): Geohash
- `updated_at` (optional): Last update timestamp
- `y` (optional): Arbiter pubkey
- `z` (optional): Document type ("arbiter")
- `t` (optional): Creation timestamp
- `e` (optional): Event expiration timestamp
- `country` (optional): Country of the arbiter

**Full specification**: See `nip-1129.md`

---

## How the NIPs Work Together

```
Discovery Phase:
┌──────────────────┐
│  NIP-69 Advert   │  ← Maker broadcasts standing offer
│  "I sell BTC"    │
└────────┬─────────┘
         │ (Taker discovers)
         ↓

Order Phase:
┌──────────────────┐
│   NIP-69 Order   │  ← Taker creates specific order
│   from: advert   │     References advert via 'from' tag
└────────┬─────────┘
         │ (Trade executes)
         ↓

Dispute Phase (if needed):
┌──────────────────┐
│  NIP-1129        │  ← Parties select arbiter
│  Arbiter Profile │     Dispute resolution
└──────────────────┘
```

### Bidirectional Relationships

**Adverts ↔ Orders**:
- Order → Advert: `from` tag in NIP-69 order points to advert event ID
- Advert → Orders: `orders` tag in advert lists related order event IDs

**Orders ↔ Arbiters**:
- Orders can reference arbiter profiles when disputes arise
- Arbiters accumulate reviews based on order resolutions

---

## Implementation Notes

### Event Kind Numbers

**Proposed Event Kinds**:
- NIP-69 (Orders): **38383** (existing, addressable)
- Advert Events: **TBD** (requesting 38384 or similar in 30000-39999 range)
- NIP-1129 (Arbiters): **1129** (proposed)

**Rationale**:
- Adverts should be addressable (30000-39999) so makers can update offers
- Requesting 38384 for adverts shows relationship with NIP-69 (38383)
- 1129 for arbiters is mnemonic and in regular events range
- Alternative: Consider 31129 for arbiters if updatable profiles are preferred

### Security Considerations

**Adverts**:
- Makers should update or expire stale adverts
- Clients should filter expired/inactive adverts
- Consider rate limiting to prevent spam

**Orders**:
- `from` tag is optional and can be omitted if order doesn't originate from advert
- Clients should validate that referenced advert exists

**Arbiters**:
- Platforms should implement arbiter selection mechanisms
- Consider privacy implications (arbiters are publicly visible)
- Reviews/ratings should be verifiable (link to actual order events)

### Privacy Considerations

**Adverts**:
- Reveal maker's trading preferences and liquidity
- Geohash provides approximate location for face-to-face trades

**Arbiters**:
- Profiles are public and discoverable
- Consider pseudonymous arbiters for privacy-conscious users
- Review links may reveal dispute patterns

---

## Benefits to the Nostr Ecosystem

### For P2P Platforms

1. **Unified Liquidity Pool**: All platforms share the same advert and order events
2. **Better Discovery**: Users find trading opportunities across all platforms
3. **Standard Dispute Resolution**: Consistent arbiter interface
4. **Reduced Development**: Standard protocols reduce implementation complexity

### For Traders

1. **More Options**: Access to liquidity across all Nostr P2P platforms
2. **Better Prices**: Unified pool increases competition
3. **Transparency**: Complete lifecycle tracking from advert to order
4. **Safety**: Standard dispute resolution with rated arbiters

### For the Network

1. **Network Effects**: More liquidity attracts more traders
2. **Decentralization**: No single platform controls the market
3. **Innovation**: Standard protocols enable new platform features
4. **Interoperability**: Seamless experience across implementations

---

## Existing Implementations

### NIP-69 (Current)

Currently implemented by:
- [Mostro](https://github.com/MostroP2P/mostro)
- [@lnp2pBot](https://github.com/lnp2pBot/bot)
- [Robosats](https://github.com/RoboSats/robosats/pull/1362)
- [Peach Bitcoin](https://github.com/Peach2Peach/peach-nostr-announcer-bot)

### Potential for New NIPs

These platforms could benefit from advert events and arbiter profiles:
- Mostro already implements mediation (could use NIP-1129)
- Platforms could add advert broadcasting for better discovery
- Unified arbiter pool could serve all platforms

---

## Backwards Compatibility

### NIP-69 Update
- **Fully backwards compatible**
- `from` tag is optional
- Existing implementations continue to work without changes
- Platforms can adopt incrementally

### New NIPs
- **No breaking changes** to existing protocols
- Additive features that enhance NIP-69
- Platforms can implement independently
- Full benefits realized when adopted together

---

## Next Steps for Reviewers

### Review Process

1. **Review NIP-69 Update**: Check `69.md` for the `from` tag addition
2. **Review Advert NIP**: Check `nip-69-advert.md` for event structure
3. **Review Arbiter NIP**: Check `nip-1129.md` for profile structure
4. **Consider Relationships**: Evaluate how the three NIPs work together

### Key Questions for Review

**Technical**:
- Are event kinds appropriately chosen?
- Are tag names consistent with NIP-01 conventions?
- Are mandatory vs optional tags clearly marked?
- Are there any edge cases not covered?

**Ecosystem**:
- Do these NIPs solve real problems?
- Will existing platforms adopt them?
- Are there any conflicts with other NIPs?
- Is the specification clear enough for implementation?

**Improvements**:
- Should arbiter selection be more detailed?
- Should advert spam prevention be specified?
- Should dispute resolution process be more defined?
- Are there security considerations we've missed?
- Should there be an event to represent the dispute resolution process?

---

## Submission Structure

This proposal consists of:

1. **PROPOSAL.md** (this document): Executive summary and context
2. **69.md**: Updated NIP-69 with `from` tag
3. **nip-69-advert.md**: New advert events NIP
4. **nip-1129.md**: New arbiter profile NIP

### Suggested Review Order

1. Start with this PROPOSAL.md for context
2. Review the NIP-69 update (minimal change)
3. Review the Advert NIP (core feature)
4. Review the Arbiter NIP (complementary feature)

---

## References

- [NIP-01: Basic Protocol Flow](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-39: External Identities](https://github.com/nostr-protocol/nips/blob/master/39.md)
- [NIP-40: Event Expiration](https://github.com/nostr-protocol/nips/blob/master/40.md)
- [NIP-69: Peer-to-peer Order Events](https://github.com/nostr-protocol/nips/blob/master/69.md)
- [Mostro Protocol Specification](https://mostro.network/protocol/)
- [n3xB Specification](https://github.com/nobu-maeda/n3xb)

---

## Contact

For questions, feedback, or discussion about these proposals:
- Nostr:  [primal.net/p/nprofile1qqsvhjymsenhjfat4d9s20kpqrkml3y7fushz9j8ha5tq2t0l88p4lghrtzd0](primal.net/p/nprofile1qqsvhjymsenhjfat4d9s20kpqrkml3y7fushz9j8ha5tq2t0l88p4lghrtzd0)
- Email: [whitemaxwell5@gmail.com]
- Twitter/X: [@iamConstM](https://x.com/iamConstM)
---

**Submitted**: November 17, 2025  
**Version**: 1.0  
**Status**: Awaiting Review

