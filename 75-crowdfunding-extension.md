# NIP-75 Crowdfunding Extension

## UPlanet Forest Garden Acquisition System

**Extends:** NIP-75 (Zap Goals)

**Status:** 🟡 Draft

**Version:** 1.0.0

---

## Overview

This extension adds support for **multi-currency crowdfunding goals** specifically designed for:
- **Property acquisition** (forest gardens, shared spaces)
- **Commons donations** (non-convertible Ẑen → CAPITAL)
- **Cash sales** (convertible Ẑen/€ → ASSETS)
- **Ğ1 (June)** donations to community wallets

It integrates with the **Collaborative Commons System** (kind 30023 documents) for community governance.

---

## New Event Kind: 30904 (Crowdfunding Campaign)

While NIP-75's kind 9041 handles simple Lightning zap goals, kind **30904** extends this for complex multi-owner, multi-currency property acquisitions.

```json
{
  "kind": 30904,
  "pubkey": "<UMAP_PUBKEY or CAPTAIN_PUBKEY>",
  "created_at": 1705920000,
  "content": "# 🌳 Forêt Enchantée\n\nProjet de forêt jardin collaborative...",
  "tags": [
    ["d", "crowdfund-43.60-1.44-foret-enchantee"],
    ["title", "🌳 Forêt Enchantée"],
    ["t", "crowdfunding"],
    ["t", "UPlanet"],
    ["t", "commons"],
    ["t", "foret-jardin"],
    ["g", "43.6047,1.4442"],
    ["p", "<UMAP_PUBKEY_HEX>", "", "umap"],
    
    // Project identification
    ["project-id", "CF-20250120-A1B2C3D4"],
    ["captain", "<CAPTAIN_PUBKEY>"],
    
    // Owners with their modes
    ["owner", "<OWNER_A_PUBKEY>", "commons", "500", "ZEN"],
    ["owner", "<OWNER_B_PUBKEY>", "cash", "1000", "EUR"],
    
    // Funding goals (multi-currency)
    ["goal", "ZEN_CONVERTIBLE", "1000", "0"],
    ["goal", "G1", "150", "0"],
    ["goal", "ZEN_COMMONS", "500", "0"],
    
    // Wallet destinations
    ["wallet", "ASSETS", "<ASSETS_G1PUB>"],
    ["wallet", "CAPITAL", "<CAPITAL_G1PUB>"],
    ["wallet", "G1", "<UPLANETNAME_G1_PUB>"],
    
    // Status and dates
    ["status", "crowdfunding"],
    ["closed_at", "1707840000"],
    ["image", "ipfs://Qm.../forest.jpg"],
    
    // Governance (links to collaborative document)
    ["quorum", "3"],
    ["governance", "majority"],
    
    // Reference to detailed document
    ["a", "30023:<UMAP_PUBKEY>:doc-43.60-1.44-foret-enchantee"]
  ]
}
```

---

## Tag Specifications

### Required Tags

| Tag | Format | Description |
|-----|--------|-------------|
| `d` | `crowdfund-{lat}-{lon}-{slug}` | Unique identifier (NIP-33) |
| `title` | string | Campaign title |
| `t` | hashtags | Must include `crowdfunding`, `UPlanet` |
| `g` | `{lat},{lon}` | Geographic coordinates |
| `p` | `[pubkey, "", "umap"]` | UMAP reference for discoverability |
| `project-id` | `CF-{DATE}-{HEX}` | Unique project identifier |

### Owner Tags

```json
["owner", "<PUBKEY>", "<MODE>", "<AMOUNT>", "<CURRENCY>"]
```

| Mode | Currency | Description |
|------|----------|-------------|
| `commons` | `ZEN` | Donation to commons (non-convertible €) |
| `cash` | `EUR` | Sale requiring € liquidity |

### Goal Tags

```json
["goal", "<TYPE>", "<TARGET>", "<COLLECTED>"]
```

| Type | Description | Destination Wallet |
|------|-------------|-------------------|
| `ZEN_CONVERTIBLE` | Ẑen that can be converted to € | ASSETS |
| `ZEN_COMMONS` | Ẑen for commons (non-convertible) | CAPITAL |
| `G1` | Ğ1 (June) donations | UPLANETNAME_G1 |

### Wallet Tags

```json
["wallet", "<TYPE>", "<G1_PUBKEY>"]
```

Used for contribution routing and verification.

### Status Values

| Status | Description |
|--------|-------------|
| `draft` | Project created, owners being added |
| `crowdfunding` | Active campaign |
| `funded` | All goals reached |
| `completed` | Transfers executed |
| `cancelled` | Campaign cancelled |

---

## Contribution Event: Kind 9742

When users contribute to a crowdfunding campaign:

```json
{
  "kind": 9742,
  "pubkey": "<CONTRIBUTOR_PUBKEY>",
  "created_at": 1705920100,
  "content": "Contribution pour la Forêt Enchantée 🌳",
  "tags": [
    ["e", "<CROWDFUND_EVENT_ID>"],
    ["a", "30904:<PUBKEY>:crowdfund-43.60-1.44-foret-enchantee"],
    ["amount", "100"],
    ["currency", "ZEN"],
    ["target", "ZEN_CONVERTIBLE"],
    ["tx_ref", "CF:CF-20250120-A1B2:ZEN"],
    ["t", "crowdfunding-contribution"],
    ["t", "UPlanet"]
  ]
}
```

### Contribution Tags

| Tag | Description |
|-----|-------------|
| `e` | Reference to the crowdfund event |
| `a` | Addressable event coordinate |
| `amount` | Contribution amount |
| `currency` | `ZEN`, `G1`, or `EUR` |
| `target` | Which goal this contributes to |
| `tx_ref` | Blockchain transaction reference |

---

## Integration with Collaborative Commons (kind 30023)

Crowdfunding campaigns can be linked to collaborative documents for detailed governance:

### Document with Crowdfunding Link

```json
{
  "kind": 30023,
  "pubkey": "<UMAP_PUBKEY>",
  "content": "# 🌳 Projet Forêt Enchantée\n\n## Description\n...",
  "tags": [
    ["d", "doc-43.60-1.44-foret-enchantee"],
    ["title", "Projet Forêt Enchantée"],
    ["t", "collaborative"],
    ["t", "UPlanet"],
    ["t", "crowdfunding"],
    ["g", "43.60,1.44"],
    ["p", "<UMAP_PUBKEY>", "", "umap"],
    
    // Link to crowdfunding campaign
    ["goal", "<CROWDFUND_EVENT_ID>", "wss://relay.copylaradio.com"],
    
    // Document type
    ["doc-type", "crowdfund"]
  ]
}
```

### Document Types Extended

| Type | Emoji | Description |
|------|-------|-------------|
| `commons` | 🤝 | Shared rules and resources |
| `project` | 🎯 | Collective project |
| `decision` | 🗳️ | Proposal to vote |
| `garden` | 🌱 | Garden plan (ORE) |
| `resource` | 📦 | Resource inventory |
| **`crowdfund`** | 🏡 | **Crowdfunding campaign** (NEW) |

---

## Voting and Validation

### Reaction Events (kind 7)

```json
{
  "kind": 7,
  "pubkey": "<VOTER_PUBKEY>",
  "content": "✅",
  "tags": [
    ["e", "<CROWDFUND_EVENT_ID>"],
    ["vote", "approve"],
    ["t", "crowdfunding-vote"],
    ["t", "UPlanet"]
  ]
}
```

### Vote Types

| Vote | Emoji | Action |
|------|-------|--------|
| `approve` | ✅ | Support the campaign |
| `reject` | ❌ | Oppose the campaign |
| `contribute` | 💰 | Intent to contribute |

---

## CLI/Web Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW CROWDFUNDING                                │
└─────────────────────────────────────────────────────────────────────────────┘

  1. CRÉATION (CLI)              2. PUBLICATION               3. CONTRIBUTIONS
  ─────────────────             ─────────────────            ─────────────────
  • Captain crée projet         • kind 30904 publié          • Utilisateurs envoient
  • Ajoute propriétaires        • kind 30023 lié             • kind 9742 publiés
  • Configure objectifs         • Visible sur UMAP           • Wallets mis à jour
        │                              │                              │
        └──────────────────────────────┴──────────────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ collaborative-  │
                              │ editor.html     │
                              │ Type: crowdfund │
                              └────────┬────────┘
                                       │
                                       ▼
  4. VALIDATION                  5. FINALISATION
  ─────────────────             ─────────────────
  • Communauté vote (kind 7)    • Goals atteints → status: funded
  • Quorum atteint              • Captain finalise via CLI
  • UMAP peut republier         • Transferts exécutés
```

---

## Blockchain Transaction References

### Comment Format for Ğ1/Duniter Transactions

| Type | Format | Example |
|------|--------|---------|
| Contribution | `CF:{PROJECT_ID}:{CURRENCY}` | `CF:CF-20250120-A1B2:ZEN` |
| Commons Out | `UPLANET:{PUBKEY8}:COMMONS:{EMAIL}:{PROJECT_ID}:{NODE}` | ... |
| Cash Out | `UPLANET:{PUBKEY8}:CASHOUT:{EMAIL}:{PROJECT_ID}:{NODE}` | ... |

---

## Client Implementation

### Web Interface (crowdfunding.html)

1. **List campaigns** from kind 30904 events filtered by `#t: crowdfunding`
2. **Display progress** by aggregating kind 9742 contributions
3. **Show detailed document** via linked kind 30023
4. **Enable contributions** with QR codes and wallet addresses

### Collaborative Editor Integration

Add "🏡 Crowdfund" as a new document type in `collaborative-editor.html`:

```javascript
// New document type
docTypes['crowdfund'] = {
    icon: '🏡',
    label: 'Crowdfunding',
    template: `# 🌳 Nom du Projet

## 📍 Localisation
Coordonnées: (lat, lon)

## 👥 Propriétaires

| Propriétaire | Mode | Montant |
|--------------|------|---------|
| alice@example.com | 🤝 Commons | 500 Ẑen |
| bob@example.com | 💶 Cash | 1000€ |

## 💰 Objectifs de Financement

### Ẑen Convertible €
- Objectif: ___
- Collecté: 0

### Don Ğ1
- Objectif: ___
- Collecté: 0

## 📋 Conditions
...

---
#UPlanet #crowdfunding #commons`
};
```

---

## Security Considerations

1. **Captain Signature**: Only the designated captain can create/modify projects
2. **UMAP Validation**: Projects must be linked to valid UMAP coordinates
3. **Contribution Verification**: Each contribution must reference a valid blockchain transaction
4. **Finalization Authorization**: Only captain can trigger final transfers

---

## Related Extensions

- **[NIP-75](75.md)** - Zap Goals (Lightning-based funding)
- **[NIP-57](57.md)** - Lightning Zaps
- **[NIP-28 UMAP Extension](28-umap-extension.md)** - Geographic chat rooms
- **[NIP-101](101.md)** - UPlanet Identity & Geographic Coordination
- **[COLLABORATIVE_COMMONS_SYSTEM.md](../Astroport.ONE/docs/COLLABORATIVE_COMMONS_SYSTEM.md)** - Document governance

---

## Changelog

- **v1.0.0** (2025-01-20): Initial specification
  - Kind 30904 for crowdfunding campaigns
  - Kind 9742 for contributions
  - Integration with collaborative documents
  - Multi-currency support (Ẑen, Ğ1, €)

---

*Extension for UPlanet Crowdfunding - Forest Garden Commons Acquisition*
