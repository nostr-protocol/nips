# UPlanet Protocol Extensions

Official Nostr Protocol Extensions for the UPlanet/Astroport.ONE Ecosystem

---

**Status:** 🟢 Production (since 2024)

**Version:** 2.0.0

**Last Updated:** November 3, 2025

---

## 📖 Quick Navigation

### Core Systems
- **Identity & DIDs:** [NIP-101](101.md) + [42-twin-key-extension.md](42-twin-key-extension.md)
- **Oracle Permits:** [42-oracle-permits-extension.md](42-oracle-permits-extension.md)
- **Relay Sync:** [101-n2-constellation-sync-extension.md](101-n2-constellation-sync-extension.md)

### File & Media Management
- **File Provenance:** [94-provenance-extension.md](94-provenance-extension.md)
- **IPFS Storage:** [96-ipfs-extension.md](96-ipfs-extension.md)
- **Video Events:** [71-extension.md](71-extension.md)

### Geographic & Social
- **UMAP Chat Rooms:** [28-umap-extension.md](28-umap-extension.md)

### Documentation
- **Full Documentation:** [DID_IMPLEMENTATION.md](../Astroport.ONE/DID_IMPLEMENTATION.md)
- **ORE System:** [ORE_SYSTEM.md](../Astroport.ONE/docs/ORE_SYSTEM.md)
- **Oracle System:** [ORACLE_SYSTEM.md](../Astroport.ONE/docs/ORACLE_SYSTEM.md)
- **Economy:** [ZEN.ECONOMY.readme.md](../Astroport.ONE/RUNTIME/ZEN.ECONOMY.readme.md)

---

## 📚 Complete Documentation

This repository contains **8 official extensions** to the Nostr protocol for the UPlanet/Astroport.ONE ecosystem.

### 🎯 Overview

UPlanet extends Nostr with:
- 🗺️ **Geographic Identity** - Twin-Key system for location-based coordination
- 🔐 **Decentralized Identity (DID)** - W3C-compliant identities on Nostr
- 📁 **IPFS Integration** - Content-addressed file storage
- 🌐 **Provenance Tracking** - File attribution and deduplication
- 🎫 **Peer-Validated Credentials** - Oracle system for competence verification
- 🔄 **N² Synchronization** - Mesh network of relays for resilience
- 🌱 **Environmental Registry** - ORE (Ecological Real Obligations) system
- 💬 **Geographic Chat Rooms** - UMAP-based location discussion channels

---

## 📋 Extension List

### 🌟 Core Specification

- **[NIP-101](101.md)** - UPlanet: Decentralized Identity & Geographic Coordination
  - Hierarchical GeoKeys (UMAP, SECTOR, REGION)
  - DID Documents (kind 30800)
  - Oracle System (kinds 30500-30503)
  - ORE Environmental Registry (kinds 30312-30313)

- **[NIP-101 N² Constellation Sync Extension](101-n2-constellation-sync-extension.md)** - Astroport Relay Synchronization
  - **Extends:** NIP-101 (UPlanet Identity & Geographic Coordination)
  - **Architecture:** Hub (1) + Satellites (24) = N² synchronization matrix (600 sync paths)
  - **Synchronized kinds:** 18 event types (0,1,3,5,6,7,21,22,30023,30024,30312,30313,30500,30501,30502,30503,30800)
  - **Innovation:** Automatic peer discovery + bidirectional sync + geographic hierarchical coordination
  - **Topology:** Hub-and-satellite with mesh network capabilities
  - **Resilience:** 25x event replication across constellation (zero data loss even if 24 relays fail)

### 🔐 Authentication & Identity Extensions

- **[NIP-42 Twin-Key Extension](42-twin-key-extension.md)** - Geographic Identity Authentication
  - **Extends:** NIP-42 (Authentication to relays)
  - **Kind:** 22242 (auth events)
  - **Innovation:** Dual authentication (personal keypair + UMAP geographic keypair)
  - **New tags:** `did`, `umap`, `g` (geohash), `latitude`, `longitude`, `grid_level`
  - **Process:** User signs → UMAP signs → Relay links identities
  - **Use case:** Location-based content access + permission control

- **[NIP-42 Oracle Permits Extension](42-oracle-permits-extension.md)** - Multi-Signature Permit Management
  - **Extends:** NIP-42 (Authentication to relays)
  - **New kinds:** 30500 (definitions), 30501 (requests), 30502 (attestations), 30503 (credentials)
  - **Innovation:** Web of Trust (WoT) multi-signature competence validation
  - **Flow:** Define permit → Request → N attestations → Auto-issue W3C VC → Add to DID
  - **Examples:** `PERMIT_ORE_V1` (5 sigs), `PERMIT_DRIVER` (12 sigs, WoT insurance mutual)
  - **Integration:** Enhanced NIP-42 auth with `permit` and `credential_id` tags

### 📁 File Storage & Media Extensions

- **[NIP-71 Extension](71-extension.md)** - Video Events with IPFS & Thumbnails
  - **Extends:** NIP-71 (Video Events)
  - **Kinds:** 21 (normal videos), 22 (short videos < 60s) - **standard NIP-71**
  - **New tags:** `info` (info.json CID), `thumbnail_ipfs`, `gifanim_ipfs`
  - **Innovation:** Animated GIF previews + centralized `info.json` metadata on IPFS
  - **Compatibility:** Maintains NIP-71 `imeta` tag structure + adds IPFS-specific tags

- **[NIP-94 Provenance Extension](94-provenance-extension.md)** - File Provenance & Upload Chain
  - **Extends:** NIP-94 (File Metadata)
  - **Kind:** 1063 (file metadata events)
  - **New tags:** `upload_chain` (comma-separated pubkeys), `e`/`p` for provenance
  - **Innovation:** SHA256 deduplication BEFORE IPFS upload (99.9% faster re-uploads)
  - **Process:** Calculate hash → Query NOSTR (kind 1063 + tag `x`) → Reuse CID via `ipfs get` → Pin locally
  - **Network effect:** Each re-upload strengthens IPFS distribution

- **[NIP-96 IPFS Extension](96-ipfs-extension.md)** - IPFS-Optimized File Storage
  - **Extends:** NIP-96 (HTTP File Storage Integration)
  - **Endpoint:** `POST /upload2ipfs` (NIP-98 auth required)
  - **Discovery:** `/.well-known/nostr/nip96.json` with `extensions.ipfs: true`
  - **Innovation:** Native IPFS + provenance + Twin-Key authentication + `info.json`
  - **Response:** Extended NIP-96 format with `provenance` object

### 💬 Social & Communication Extensions

- **[NIP-28 UMAP Extension](28-umap-extension.md)** - Geographic Chat Rooms
  - **Extends:** NIP-28 (Public Chat)
  - **Kind:** 42 (channel messages)
  - **New tags:** `g` (geographic coordinates), references UMAP DID npub in `e` tag
  - **Innovation:** Location-based discussion rooms tied to UMAP DIDs (kind 30800)
  - **Channel ID:** Uses UMAP DID's `npub` or fallback to `UMAP_<lat>_<lon>`
  - **Use case:** Geographic coordination, ORE verification discussions, local community chat
  - **Integration:** Works with ORE System (kind 30312/30313) for environmental compliance

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UPlanet Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  NIP-101     │  │  NIP-42      │  │  NIP-96      │     │
│  │  Identity    │─▶│  Twin-Key    │◀─│  IPFS        │     │
│  │  + GeoKeys   │  │  + Oracle    │  │  Storage     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────────────────────────────────────────────┐     │
│  │         Nostr Relay (Astroport + strfry)         │     │
│  │   - Geographic event routing (UMAP/SECTOR)        │     │
│  │   - DID resolution (kind 30800)                   │     │
│  │   - Provenance tracking (NIP-94 extension)        │     │
│  │   - N² constellation sync (18 event kinds)        │     │
│  └──────────────────────────────────────────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  NIP-71      │  │  NIP-94      │  │  Oracle      │     │
│  │  Video       │  │  Provenance  │  │  System      │     │
│  │  + GIF       │  │  + Chain     │  │  (30500-503) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  IPFS Network   │
                    │  Content Store  │
                    └─────────────────┘
```

### Hub-and-Satellite Topology

```
Hub Central (1)
├── Coordinates 24 Satellites
├── Manages inter-satellite communication
├── Handles economic flows (Ẑen)
└── Provides global synchronization

Satellites (24)
├── Local services (MULTIPASS, ZEN Cards)
├── Geographic UMAP management
├── Bidirectional sync with Hub
└── Peer sync with other Satellites
```

---

## 📊 Implementation Matrix

| Feature | Standard NIP | UPlanet Extension | Kind(s) | Status |
|---------|-------------|-------------------|---------|--------|
| **Authentication** | NIP-42 | [42-twin-key-extension.md](42-twin-key-extension.md) | 22242 | ✅ Production |
| **Oracle Permits** | NIP-42 | [42-oracle-permits-extension.md](42-oracle-permits-extension.md) | 30500-30503 | ✅ Production |
| **File Metadata** | NIP-94 | [94-provenance-extension.md](94-provenance-extension.md) | 1063 | ✅ Production |
| **File Storage** | NIP-96 | [96-ipfs-extension.md](96-ipfs-extension.md) | - (HTTP API) | ✅ Production |
| **Video Events** | NIP-71 | [71-extension.md](71-extension.md) | 21, 22 | ✅ Production |
| **Geographic Chat** | NIP-28 | [28-umap-extension.md](28-umap-extension.md) | 42 | ✅ Production |
| **Identity** | - | [NIP-101](101.md) | 30800 | ✅ Production |
| **Relay Sync** | NIP-101 | [101-n2-constellation-sync-extension.md](101-n2-constellation-sync-extension.md) | 18 kinds | ✅ Production |

### Event Kind Reference

| Kind | Name | Extension | Purpose |
|------|------|-----------|---------|
| 0 | Profile | Core | User profile metadata |
| 1 | Text Note | Core | Standard text posts |
| 3 | Contacts | Core | Contact/follow lists |
| 5 | Deletion | Core | Event deletion requests |
| 6 | Repost | Core | Event reposts |
| 7 | Reaction | Core | Like/reaction events |
| 21 | Media | Core | Media attachments |
| 22 | Comment | NIP-22 | Comment threads |
| 42 | Channel Message | NIP-28 + UMAP | Geographic chat room messages |
| 1063 | File Metadata | NIP-94 + Provenance | File metadata with upload chain |
| 22242 | Auth | NIP-42 + Twin-Key | Authentication with UMAP keypair |
| 30023 | Article | NIP-23 | Long-form content |
| 30024 | Draft | NIP-23 | Article drafts |
| 30312 | ORE Space | NIP-101 | Geographic meeting room |
| 30313 | ORE Verification | NIP-101 | Environmental validation |
| 30500 | Permit Definition | Oracle | License type definition |
| 30501 | Permit Request | Oracle | Application for permit |
| 30502 | Permit Attestation | Oracle | Expert signature |
| 30503 | Permit Credential | Oracle | W3C Verifiable Credential |
| 30800 | DID Document | NIP-101 | Decentralized identity |
| 21 | Video (Normal) | NIP-71 + IPFS | Normal videos (landscape, longer) |
| 22 | Video (Short) | NIP-71 + IPFS | Short videos (portrait, < 60s) |

---

## 🚀 Quick Start

### For Developers

1. **Read this guide** - Complete overview of UPlanet extensions
2. **Choose an extension** based on your needs
3. **Review reference implementations** (links in each doc)
4. **Test locally** with provided scripts

### For Users

1. **Create a MULTIPASS**: `./make_NOSTRCARD.sh email@example.com`
2. **Access the portal**: https://ipfs.copylaradio.com/ipns/copylaradio.com
3. **Use the services**:
   - 📹 Nostr Tube (videos)
   - 🗺️ UMAP (geolocation)
   - 🌱 ORE (environmental obligations)
   - 🎫 Oracle (multi-signature permits)

---

## 🎯 Use Cases

### 1. Geographic Social Network

Alice publishes from her UMAP neighborhood:
- Twin-Key authentication (NIP-42 extension)
- Publication with geographic tag
- N² synchronization to constellation
- Bob (subscribed to UMAP) sees post instantly

### 2. Decentralized Video Platform

Carol uploads a video:
- Upload to IPFS (NIP-96 extension)
- Thumbnails auto-generated (static + GIF)
- Metadata in info.json
- NIP-71 event published
- Dave re-uploads same video → instant (provenance tracking)

### 3. Competence Certification

Eve becomes environmental verifier:
- Requests PERMIT_ORE_V1 (kind 30501)
- 5 experts attest her competence (kind 30502)
- Oracle issues VC (kind 30503)
- Credential added to Eve's DID (kind 30800)
- Eve receives 10 Ẑen reward

### 4. Environmental Obligations

UMAP with ORE contract:
- UMAP DID created (kind 30800)
- ORE verification room (kind 30312)
- Expert verification (kind 30313)
- Automatic payment 10 Ẑen
- Redistribution to local guardians

---

## 🧪 Testing

```bash
# Test DIDs
cd Astroport.ONE/tools
./test_did_conformity.sh user@example.com

# Test Oracle system
./test_permit_system.sh --all

# Test ORE system
./ore_complete_test.sh
```

---

## 📚 Additional Documentation

### Core Systems
- [DID_IMPLEMENTATION.md](../Astroport.ONE/DID_IMPLEMENTATION.md) - Complete identity system
- [ORE_SYSTEM.md](../Astroport.ONE/docs/ORE_SYSTEM.md) - Environmental obligations
- [ORACLE_SYSTEM.md](../Astroport.ONE/docs/ORACLE_SYSTEM.md) - Permit system
- [ZEN.ECONOMY.readme.md](../Astroport.ONE/RUNTIME/ZEN.ECONOMY.readme.md) - Ẑen economy

### Reference Implementations
- **Backend:** [UPassport/54321.py](../UPassport/54321.py)
- **Scripts:** [Astroport.ONE/tools/](../Astroport.ONE/tools/)
- **Frontend:** [UPlanet/earth/](../UPlanet/earth/)

---

## 💡 Key Innovations

### Geographic Coordination
- **Hierarchical GeoKeys** (UMAP/SECTOR/REGION)
- **Location-based event routing**
- **Geographic discovery** via `g` tags
- **Constellation topology** for local resilience

### Identity & Credentials
- **W3C DID** on Nostr (kind 30800)
- **Twin-Key** authentication (personal + UMAP)
- **Verifiable Credentials** (W3C standard)
- **Multi-signature permits** (Web of Trust)

### File Management
- **Provenance tracking** via SHA256
- **Upload chain** (attribution & deduplication)
- **IPFS optimization** (99.9% faster re-uploads)
- **Automatic thumbnails** (static + animated GIF)

### Network Resilience
- **N² synchronization** (25 relays × 24 peers)
- **Hub-and-satellite** topology
- **18 event kinds** auto-synced
- **Zero single point of failure**

---

## 🔑 Key Architecture & Roles

### Cryptographic Key Hierarchy

UPlanet implements a **4-tier key system** that maps system roles to cryptographic identities:

```
┌─────────────────────────────────────────────────────────────┐
│                  UPlanet Key Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  NODE (Armateur)          → Machine Owner                   │
│  ├── Physical infrastructure (Raspberry Pi / PC Gamer)      │
│  ├── Receives PAF (Participation Aux Frais)                 │
│  ├── Hardware capital investment                            │
│  └── secret.NODE.dunikey                                    │
│                                                              │
│  SUDO (Captain)           → System Administrator            │
│  ├── Software maintenance & operations                      │
│  ├── Receives 2x PAF compensation                           │
│  ├── Manages MULTIPASS and ZEN Card users                   │
│  └── CAPTAIN wallet                                         │
│                                                              │
│  USER (MULTIPASS)         → Tenant / Service Consumer       │
│  ├── 1 Ẑ/week rental (uDRIVE 10GB storage)                 │
│  ├── NOSTR identity + basic services                        │
│  ├── Can earn Ẑ through content creation                    │
│  └── CAPTAIN.MULTIPASS wallet                               │
│                                                              │
│  OWNER (ZEN Card)         → Cooperative Member              │
│  ├── 50 Ẑ/year ownership (NextCloud 128GB)                 │
│  ├── Cooperative governance rights                          │
│  ├── Share in 3x1/3 profit distribution                     │
│  └── CAPTAIN.ZENCARD wallet                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Role Relationships

**Armateur (NODE)** ↔ **Captain (SUDO)**
- Armateur provides hardware infrastructure
- Captain operates and maintains the system
- Split compensation: 1x PAF (Armateur) + 2x PAF (Captain)

**Captain (SUDO)** ↔ **Users (MULTIPASS/ZEN Card)**
- Captain hosts user services
- Collects weekly rent from users
- Provides storage, identity, and connectivity

**Cooperative Model**
- Users pay rent (1-5 Ẑ/week)
- Infrastructure costs covered (3x PAF)
- Surplus distributed via 3x1/3 rule:
  - 33.33% → TREASURY (operations)
  - 33.33% → RND (research & development)
  - 33.34% → ASSETS (ecological investments)

---

## 💰 Ẑen Economy

### Economic Model

The **Ẑen** (Ẑ) is UPlanet's internal unit of account, backed by the Ğ1 blockchain:

**Exchange Rate:**
- **UPlanet ORIGIN** (testnet): `1 Ẑ = 0.1 Ğ1`
- **UPlanet Ẑen** (production): `1 Ẑ = 1€`

### Revenue Streams

#### MULTIPASS (Digital Studio)
```
Rent: 1 Ẑ/week HT + 0.2 Ẑ TVA
├── Services: uDRIVE 10GB + NOSTR identity
├── Script: NOSTRCARD.refresh.sh
└── Capacity: 250 per Raspberry Pi station
```

#### ZEN Card (Digital Apartment + Ownership)
```
Ownership: 50 Ẑ/year (one-time social shares purchase)
├── Services: NextCloud 128GB + premium features
├── Rights: Voting + profit sharing
├── Script: PLAYER.refresh.sh
└── Capacity: 24 per station
```

### Automated Scripts

| Script | Function | Frequency |
|--------|----------|-----------|
| `UPLANET.init.sh` | Initialize all wallets | Once |
| `ZEN.ECONOMY.sh` | PAF payment + 4-week burn + capital contribution | Weekly |
| `ZEN.COOPERATIVE.3x1-3.sh` | Surplus calculation & 3x1/3 allocation | Weekly |
| `NOSTRCARD.refresh.sh` | Collect MULTIPASS rent (1Ẑ HT + 0.2Ẑ TVA) | Weekly |
| `PLAYER.refresh.sh` | Collect ZEN Card rent | Weekly |
| `UPLANET.official.sh` | Official Ẑen emission | On-demand |

### Economic Simulators

**Live Simulators:**
- [Constellation Simulator](https://ipfs.copylaradio.com/ipns/copylaradio.com/economy.Constellation.html) - Full cooperative model
- [Basic Economy](https://ipfs.copylaradio.com/ipns/copylaradio.com/economy.html) - Simple financial flows

**Features:**
- Real-time economic projections
- Break-even analysis
- Cooperative profit distribution
- Ecological impact calculation (forest acquisition)
- Infrastructure capacity planning

---

## 🤖 AI Integration

### Made In Zen AI System

UPlanet integrates decentralized AI services for cooperative members:

**AI Services:**
- **Personal AI Assistants** - Private, user-controlled AI instances
- **Content Generation** - Text, image, and media creation tools
- **Community Moderation** - AI-assisted content curation
- **Knowledge Management** - Semantic search and organization

**Architecture:**
- **Decentralized Processing** - AI runs on member nodes
- **Privacy-First** - User data never leaves their control
- **Ğ1-Based Payments** - AI services paid in Ẑen tokens
- **Cooperative Training** - Community-contributed AI improvements

**Access Points:**
- MULTIPASS users: Basic AI services included
- ZEN Card owners: Premium AI features + priority access
- Captains: AI tools for system administration

**Integration:**
- NOSTR events for AI requests/responses
- IPFS storage for AI-generated content
- DID-based authentication for AI services
- Oracle system for AI service validation

---

## 🏗️ Anarchitecture Philosophy

### Decentralized Sovereignty

UPlanet implements **Anarchitecture** - a philosophy of decentralized, self-sovereign systems:

**Core Principles:**
1. **Three-Tier Trust** (vs blind trust in admins)
   - **User:** Keeps master key sovereign
   - **Relay (Dragon):** Service provider with limited session key
   - **Ğ1 Web of Trust:** Distributed human identity certification

2. **Nation-States of Mind**
   - Create chosen collectives based on trust (Ğ1) and shared values
   - Digital sovereign territories with group-defined rules
   - Ẑen as indicator of group health and value creation

3. **Cognitive Dystopia Antidote**
   - Escape centralized algorithm control
   - Build trust networks (N1: friends, N2: friends of friends)
   - Curated relays instead of global noise

### Economic Philosophy

**Digital-to-Physical Bridge:**
- Online activity generates Ẑen value
- Cooperative profits → ecological regeneration
- Net surplus → forest/farmland acquisition
- Social shares = co-ownership of physical commons

**Cooperative Model (3x1/3):**
- Not profit-driven but commons-oriented
- Transparent on-chain accounting
- Standardized infrastructure contributions
- Community-validated governance

### Entry Paths

| Path | Target | Entry Point | Ẑen Rate | Status |
|------|--------|-------------|----------|--------|
| **🧭 Explorer** | Curious users | [qo-op.com](https://qo-op.com) | 1 Ẑ = 0.1 Ğ1 | Testnet |
| **🛠️ Builder** | Ğ1 members | [OpenCollective](https://opencollective.com/uplanet-zero) | 1 Ẑ = 1€ | Production |

**Explorer (UPlanet ORIGIN):**
- Email signup in 1 minute
- Test services (AI, NOSTR, storage)
- Discover ecosystem potential
- Internal sandbox economy

**Builder (UPlanet Ẑen):**
- Join G1FabLab community
- Purchase cooperative shares
- Seal pact with certified Ğ1 account
- Become active SCIC member
- Real cooperative economy

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Test locally
4. Submit a pull request with documentation

---

## 📜 License

All UPlanet specifications and implementations are under **AGPL-3.0**.

---

## 👥 Community

- **Matrix:** #uplanet:matrix.org
- **Forum:** https://forum.copylaradio.com
- **GitHub:** [Astroport.ONE Organization](https://github.com/papiche)
- **Email:** contact@copylaradio.com

### Join the Ecosystem

**For Explorers (Testnet):**
- Portal: https://qo-op.com
- Demo: https://ipfs.copylaradio.com/ipns/copylaradio.com
- Network Visualization: https://ipfs.copylaradio.com/ipns/copylaradio.com/bang.html

**For Builders (Production):**
- Cooperative: https://opencollective.com/uplanet-zero
- G1FabLab: https://opencollective.com/monnaie-libre
- SCIC Statutes: https://pad.p2p.legal/s/CopyLaRadio#

**Economic Tools:**
- Constellation Simulator: https://ipfs.copylaradio.com/ipns/copylaradio.com/economy.Constellation.html
- Basic Economy: https://ipfs.copylaradio.com/ipns/copylaradio.com/economy.html

**Technical Resources:**
- Help Guide: https://pad.p2p.legal/s/UPlanet_Enter_Help
- Raspberry Pi Guide: https://pad.p2p.legal/s/RaspberryPi#
- Trust Model: https://www.copylaradio.com/blog/blog-1/post/relation-de-confiance-decentralisee-a-3-tiers-avec-la-g1-149

---

## ✍️ Authors

**Lead Developers:**
- [papiche](https://github.com/papiche) - UPlanet & Astroport.ONE architecture
- CopyLaRadio SCIC - Cooperative governance & implementation

**Contributors:**
- Astroport.ONE community
- Ğ1 libre currency community
- NOSTR protocol community

---

## 🌟 Why UPlanet Extensions?

UPlanet extends Nostr to create a **complete decentralized society infrastructure**:

### Digital Sovereignty
- **Own your identity** (DID with SSSS 3/2 secret sharing)
- **Control your data** (IPFS + personal storage)
- **Verify your competencies** (W3C Verifiable Credentials)

### Geographic Coordination
- **Local communities** (UMAP neighborhoods)
- **Regional organization** (SECTOR/REGION hierarchy)
- **Global network** (N² constellation sync)

### Economic Integration
- **Ẑen currency** (Ğ1 blockchain based)
- **Cooperative model** (3x1/3 profit sharing)
- **Environmental rewards** (ORE system)

### Technical Excellence
- **W3C standards** (DID Core v1.1, VC Data Model)
- **IPFS integration** (content addressing)
- **Nostr native** (events, relays, protocol)
- **Production ready** (since 2024)

---

**Version:** 2.0.0  
**Last Updated:** November 3, 2025  
**Status:** 🟢 Production

**🌍 Building a decentralized future, one extension at a time.**
