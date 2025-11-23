NIP-58 Oracle Badges Extension
===============================

Gamification of Competence Certification via NIP-58 Badges
----------------------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-58](58.md) that integrates **badge emission** into the UPlanet Oracle System. This extension enables visual gamification of competence certification, making validated skills and achievements visible on user profiles across Nostr clients.

## Overview

This extension adds automatic badge emission when Oracle credentials (kind 30503) are issued, creating a **visual representation of validated competencies** that can be displayed in user profiles, enhancing the gamification aspect of the Web of Trust system.

## Motivation

The Oracle System (NIP-42 extension) issues W3C Verifiable Credentials (kind 30503) for validated competencies, but these credentials are:
- ❌ Not visually represented in user profiles
- ❌ Not easily discoverable by other users
- ❌ Not gamified for user engagement

This extension solves these problems by:
- ✅ Automatically emitting NIP-58 badges when credentials are issued
- ✅ Creating visual representations of competencies
- ✅ Enabling badge display in user profiles (kind 30008)
- ✅ Supporting gamification of the ecological and competence systems

## Integration with Oracle System

### Badge Emission Flow

When a credential (kind 30503) is issued by the Oracle System:

1. **Badge Definition (kind 30009)** - Created automatically if it doesn't exist
2. **Badge Award (kind 8)** - Emitted immediately after credential issuance
3. **Profile Badges (kind 30008)** - User can accept/reject and order badges

### Automatic Badge Creation

The Oracle System automatically creates badge definitions for:

#### Official Permits
- `PERMIT_ORE_V1` → Badge: `ore_verifier`
- `PERMIT_DRIVER` → Badge: `driver_license`
- `PERMIT_MEDICAL_FIRST_AID` → Badge: `first_aid_provider`
- `PERMIT_BUILDING_ARTISAN` → Badge: `building_artisan`
- `PERMIT_WOT_DRAGON` → Badge: `wot_dragon`

#### WoTx2 Auto-Proclaimed Permits
- `PERMIT_*_X1` → Badge: `{permit_name}_x1`
- `PERMIT_*_X2` → Badge: `{permit_name}_x2`
- `PERMIT_*_X3` → Badge: `{permit_name}_x3`
- ... (progression continues to X144+)

**Badge naming convention:**
- Base name: Permit ID converted to lowercase with underscores
- Level suffix: `_x{n}` for WoTx2 permits
- Example: `PERMIT_MAITRE_NAGEUR_X5` → Badge: `permit_maitre_nageur_x5`

## Event Structure

### Badge Definition (kind 30009)

Created by `UPLANETNAME.G1` (Oracle authority) when a permit is first defined or when a WoTx2 level is created.

```jsonc
{
  "kind": 30009,
  "pubkey": "<UPLANETNAME_G1_hex>",
  "tags": [
    ["d", "ore_verifier"],
    ["name", "ORE Environmental Verifier"],
    ["description", "Certified to verify ORE environmental contracts. Awarded after 5 peer attestations."],
    ["image", "https://u.copylaradio.com/badges/ore_verifier.png", "1024x1024"],
    ["thumb", "https://u.copylaradio.com/badges/ore_verifier_256x256.png", "256x256"],
    ["thumb", "https://u.copylaradio.com/badges/ore_verifier_64x64.png", "64x64"],
    ["permit_id", "PERMIT_ORE_V1"],
    ["t", "uplanet"],
    ["t", "oracle"],
    ["t", "badge"]
  ],
  "content": "",
  "created_at": <timestamp>,
  "sig": "<signature>"
}
```

**WoTx2 Level Badge Example:**

```jsonc
{
  "kind": 30009,
  "pubkey": "<UPLANETNAME_G1_hex>",
  "tags": [
    ["d", "permit_maitre_nageur_x5"],
    ["name", "Maître Nageur - Niveau X5 (Expert)"],
    ["description", "Expert level in swimming instruction. Requires 5 competencies and 5 attestations. Auto-proclaimed mastery with progressive validation."],
    ["image", "https://u.copylaradio.com/badges/maitre_nageur_x5.png", "1024x1024"],
    ["thumb", "https://u.copylaradio.com/badges/maitre_nageur_x5_256x256.png", "256x256"],
    ["permit_id", "PERMIT_MAITRE_NAGEUR_X5"],
    ["level", "X5"],
    ["label", "Expert"],
    ["t", "uplanet"],
    ["t", "oracle"],
    ["t", "wotx2"],
    ["t", "badge"]
  ],
  "content": "",
  "created_at": <timestamp>,
  "sig": "<signature>"
}
```

### Badge Award (kind 8)

Emitted automatically when a credential (kind 30503) is issued.

```jsonc
{
  "kind": 8,
  "pubkey": "<UPLANETNAME_G1_hex>",
  "tags": [
    ["a", "30009:<UPLANETNAME_G1_hex>:ore_verifier"],
    ["p", "<holder_hex>", "wss://relay.copylaradio.com"],
    ["credential_id", "<credential_id>"],
    ["permit_id", "PERMIT_ORE_V1"],
    ["t", "uplanet"],
    ["t", "oracle"]
  ],
  "content": "Credential issued: PERMIT_ORE_V1",
  "created_at": <timestamp>,
  "sig": "<signature>"
}
```

**Link to Credential:**
- The `credential_id` tag references the kind 30503 event ID
- Clients can resolve the full credential via the credential event

### Profile Badges (kind 30008)

Users can accept awarded badges and order them in their profile.

```jsonc
{
  "kind": 30008,
  "pubkey": "<user_hex>",
  "tags": [
    ["d", "profile_badges"],
    ["a", "30009:<UPLANETNAME_G1_hex>:ore_verifier"],
    ["e", "<badge_award_event_id>", "wss://relay.copylaradio.com"],
    ["a", "30009:<UPLANETNAME_G1_hex>:permit_maitre_nageur_x5"],
    ["e", "<badge_award_event_id_2>", "wss://relay.copylaradio.com"]
  ],
  "content": "",
  "created_at": <timestamp>,
  "sig": "<signature>"
}
```

## Badge Design Guidelines

### Official Permits
- **Color scheme**: Green gradient (environmental), Blue (professional), Gold (authority)
- **Icon**: Representative of the permit type
- **Text**: Permit name clearly visible

### WoTx2 Levels
- **X1-X4**: Bronze/Copper color scheme
- **X5-X10 (Expert)**: Silver color scheme
- **X11-X50 (Maître)**: Gold color scheme
- **X51-X100 (Grand Maître)**: Platinum/Diamond color scheme
- **X101+ (Maître Absolu)**: Rainbow/Multicolor gradient

**Visual progression:**
- Each level shows the number (X1, X2, X3, etc.)
- Level label (Expert, Maître, Grand Maître, Maître Absolu) displayed prominently
- Badge design becomes more elaborate at higher levels

## Integration with ORE System

Badges can also be awarded for ORE (Obligations Réelles Environnementales) achievements:

- **ORE Contract Active**: Badge for UMAPs with active ORE contracts
- **ORE Verified**: Badge for successful ORE contract verification
- **ORE Guardian**: Badge for maintaining ORE compliance over time
- **Biodiversity Champion**: Badge for high biodiversity scores

These badges are linked to the ORE system (kind 30312, 30313) and UMAP DIDs (kind 30800).

## Client Implementation

### Displaying Badges

Clients should:

1. **Query badge awards** (kind 8) for a user's pubkey
2. **Resolve badge definitions** (kind 30009) referenced by awards
3. **Check profile badges** (kind 30008) for user's display preferences
4. **Render badges** in user profiles, permit lists, and competence displays

### Badge Verification

Clients should verify:
- Badge definition exists (kind 30009)
- Badge award is valid (kind 8, signed by `UPLANETNAME.G1`)
- Corresponding credential exists (kind 30503)
- Credential is not expired or revoked

### Badge Filtering

Clients MAY:
- Filter badges by issuer (whitelist `UPLANETNAME.G1`)
- Group badges by category (Official Permits, WoTx2, ORE)
- Show only highest level for WoTx2 permits (X5 instead of X1-X4)
- Allow users to hide/show specific badges

## Use Cases

### 1. Visual Competence Display

Alice has earned `PERMIT_ORE_V1`:
- Oracle issues credential (kind 30503)
- Oracle automatically emits badge award (kind 8)
- Alice's profile shows the "ORE Verifier" badge
- Other users can see Alice's competence at a glance

### 2. WoTx2 Progression Gamification

Bob creates "Maître Nageur" mastery:
- Bob earns X1 → Badge `permit_maitre_nageur_x1` awarded
- Bob earns X2 → Badge `permit_maitre_nageur_x2` awarded
- Bob earns X5 → Badge `permit_maitre_nageur_x5` (Expert) awarded
- Bob's profile shows progression: Bronze → Silver → Gold badges

### 3. ORE Ecological Achievements

Carol's UMAP has active ORE contract:
- ORE contract verified → Badge `ore_verified` awarded
- High biodiversity score → Badge `biodiversity_champion` awarded
- Carol's profile shows ecological commitment badges

## API Integration

The Oracle API (`/api/permit/issue/{request_id}`) automatically:

1. Issues credential (kind 30503)
2. Creates badge definition (kind 30009) if needed
3. Emits badge award (kind 8)
4. Returns badge information in response

**API Response Enhancement:**

```json
{
  "success": true,
  "credential_id": "cred_abc123",
  "holder_npub": "npub1...",
  "permit_id": "PERMIT_ORE_V1",
  "badge": {
    "badge_id": "ore_verifier",
    "badge_definition_event_id": "event_xyz...",
    "badge_award_event_id": "event_789...",
    "image_url": "https://u.copylaradio.com/badges/ore_verifier.png"
  }
}
```

## Compatibility

- ✅ **NIP-58 compliant**: Uses standard NIP-58 event kinds (30009, 8, 30008)
- ✅ **Backward compatible**: Existing credentials (30503) can be retroactively awarded badges
- ✅ **Client agnostic**: Any NIP-58 compatible client can display badges
- ✅ **Optional**: Clients can ignore badges if not supported

## Implementation Details

### Backend Implementation

The badge emission is implemented in `UPassport/oracle_system.py`:

1. **Function `emit_badge_for_credential()`**: Called automatically after credential issuance
   - Generates badge ID from permit ID
   - Creates badge definition (kind 30009) if needed
   - Emits badge award (kind 8) to credential holder

2. **Function `_get_badge_id_from_permit()`**: Converts permit IDs to badge IDs
   - Official permits: `PERMIT_ORE_V1` → `ore_verifier`
   - WoTx2 permits: `PERMIT_MAITRE_NAGEUR_X5` → `permit_maitre_nageur_x5`

3. **Function `_ensure_badge_definition()`**: Creates/updates badge definitions
   - Publishes kind 30009 events with metadata
   - Includes permit_id, level, label tags for WoTx2

4. **Function `_ensure_badge_definition()`**: Creates/updates badge definitions
   - Publishes kind 30009 events with metadata
   - Includes permit_id, level, label tags for WoTx2
   - **Automatically generates badge images** using `generate_badge_image.sh`

5. **Function `_generate_badge_images()`**: Generates badge images automatically
   - Uses AI (`question.py`) to create optimized Stable Diffusion prompts
   - Generates main image (1024x1024) via ComfyUI
   - Creates thumbnails (256x256, 64x64) using ImageMagick
   - Uploads all images to IPFS
   - Returns IPFS URLs for badge definition

6. **Function `_emit_badge_award()`**: Publishes badge awards
   - Creates kind 8 events referencing badge definitions
   - Links to credential via `credential_id` tag

### Frontend Implementation

Badge display is implemented in `UPlanet/earth/common.js`:

1. **Function `fetchBadgeAwards(pubkey)`**: Fetches kind 8 events for a user
2. **Function `fetchBadgeDefinition(badgeId)`**: Fetches kind 30009 events
3. **Function `fetchUserBadges(pubkey)`**: Combines awards + definitions
4. **Function `renderBadge(badge, options)`**: Generates HTML for badge display
5. **Function `displayUserBadges(containerId, pubkey)`**: Displays badges in DOM

### Interface Integration

Badges are displayed in three main interfaces:

1. **oracle.html** (`/oracle`):
   - User badges section in "My Permits" tab
   - Badge preview for each permit in public list
   - Automatic loading after NOSTR connection

2. **wotx2.html** (`/wotx2`):
   - Badge displayed for each certified master in "Maîtres Certifiés"
   - Shows badge alongside master information

3. **plantnet.html** (`/plantnet`):
   - Oracle badges section in user dashboard
   - Displays alongside Flora achievement badges
   - Loads automatically when user stats are loaded

### Badge Image URLs

Badge images are automatically generated using AI (Stable Diffusion via ComfyUI):
- **Generation**: Images are created automatically when badge definitions are created
- **Script**: `Astroport.ONE/IA/generate_badge_image.sh`
- **Process**: 
  1. AI generates optimized Stable Diffusion prompt using `question.py`
  2. ComfyUI generates badge image (1024x1024)
  3. ImageMagick creates thumbnails (256x256, 64x64)
  4. All images uploaded to IPFS
  5. IPFS URLs stored in badge definition (kind 30009)

**Image Specifications**:
- Main image: 1024x1024 PNG
- Thumbnail 256: 256x256 PNG
- Thumbnail 64: 64x64 PNG
- Format: PNG with transparency support
- Storage: IPFS (decentralized, permanent)

**Color Schemes** (automatically applied based on level):
- Official Permits: Green/Blue/Gold gradient
- WoTx2 X1-X4: Bronze/Copper
- WoTx2 X5-X10: Silver
- WoTx2 X11-X50: Gold
- WoTx2 X51-X100: Platinum/Diamond
- WoTx2 X101+: Rainbow/Multicolor gradient

**Fallback**: If image generation fails, system uses static IPFS paths (images must be manually uploaded).

## References

- [NIP-58: Badges](58.md) - Base specification
- [NIP-42 Oracle Permits Extension](42-oracle-permits-extension.md) - Oracle System
- [NIP-101: UPlanet DID & Oracle](101.md) - Full UPlanet protocol
- [ORE System Documentation](../Astroport.ONE/docs/ORE_SYSTEM.md) - ORE contracts
- [Oracle System Documentation](../Astroport.ONE/docs/ORACLE_SYSTEM.md) - Oracle System

## Implementation Files

- **Backend**: 
  - `UPassport/oracle_system.py` (functions: `emit_badge_for_credential`, `_get_badge_id_from_permit`, `_ensure_badge_definition`, `_generate_badge_images`, `_emit_badge_award`)
  - `Astroport.ONE/IA/generate_badge_image.sh` (automatic badge image generation with AI)
- **Frontend**: `UPlanet/earth/common.js` (functions: `fetchBadgeAwards`, `fetchBadgeDefinition`, `fetchUserBadges`, `renderBadge`, `displayUserBadges`)
- **Interfaces**: 
  - `UPassport/templates/oracle.html`
  - `UPassport/templates/wotx2.html`
  - `UPlanet/earth/plantnet.html`

---

**Status**: Implemented  
**Version**: 1.0  
**Author**: UPlanet Development Team  
**Date**: 2025-12-01  
**Last Updated**: 2025-12-01

