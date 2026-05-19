# NIP-101 Economic Health Extension

## Swarm Economic Status Broadcasting Protocol

`draft` `extension` `optional`

This document defines a **decentralized economic health broadcasting protocol** for UPlanet/Astroport constellation networks. It enables transparent, auditable, and legally compliant financial reporting across the swarm.

## Overview

The Economic Health Extension extends [NIP-101](101.md) with standardized events for broadcasting station and swarm-level economic data. This creates a **distributed ledger of economic health** that is:

- ✅ **Transparent**: All economic data publicly auditable on NOSTR
- ✅ **Decentralized**: No central authority controls the data
- ✅ **Legally Compliant**: Follows SCIC accounting standards
- ✅ **Real-time**: Daily updates synchronized via N² constellation
- ✅ **Aggregatable**: Swarm-level metrics computed from station data

## Motivation

Current challenges:
- ❌ No standardized way to share economic health across constellation
- ❌ Manual reporting for cooperative compliance
- ❌ Lack of swarm-level economic visibility
- ❌ No audit trail for economic decisions

This extension solves these problems by:
- ✅ Automatic daily economic health broadcasts
- ✅ Standardized event format for accounting
- ✅ Aggregated swarm dashboards
- ✅ Cryptographically signed financial reports

## Event Kinds

### Economic Health Report (kind: 30850)

Economic health snapshot published by each station. The `created_at` timestamp indicates when the report was published and represents the latest economic state at that time.

```jsonc
{
  "kind": 30850,
  "pubkey": "<CAPTAIN_HEX>",
  "created_at": 1736280000,
  "tags": [
    ["d", "economic-health"],  // Replaceable event ID - latest report per station
    ["t", "uplanet"],
    ["t", "economic-health"],
    ["constellation", "<UPLANETG1PUB>"],  // e.g. "AwdjhpJNqzQgmSrvpUk5Fd2GxBZMJVQkBQmXn4JQLr6z"
    ["station", "<IPFSNODEID>"],
    ["g1pub", "<UPLANETG1PUB>"],
    ["uplanetname", "ORIGIN"],
    
    // Wallet balances (in Ẑen)
    ["balance:cash", "1250.50"],
    ["balance:rnd", "890.25"],
    ["balance:assets", "2100.00"],
    ["balance:impot", "450.75"],
    ["balance:capital", "480.00"],
    ["balance:amortissement", "20.00"],
    ["balance:node", "42.00"],
    
    // Revenue metrics
    ["revenue:multipass", "125.00"],
    ["revenue:zencard", "200.00"],
    ["revenue:total", "325.00"],
    
    // Cost metrics
    ["cost:paf", "14.00"],
    ["cost:captain", "28.00"],
    ["cost:total", "42.00"],
    
    // Allocation metrics
    ["allocation:treasury", "94.33"],
    ["allocation:rnd", "94.33"],
    ["allocation:assets", "94.34"],
    
    // Capacity metrics
    ["capacity:multipass_used", "85"],
    ["capacity:multipass_total", "250"],
    // ZenCard: distinguish between renters (pay weekly rent) and owners (sociétaires, no rent)
    ["capacity:zencard_total", "12"],      // Total ZenCard users
    ["capacity:zencard_renters", "9"],     // Locataires - pay weekly ZCARD rent
    ["capacity:zencard_owners", "3"],      // Sociétaires - made capital contribution, no rent
    ["capacity:zencard_capacity", "24"],   // Maximum capacity
    
    // Health indicators (Resilience Levels — pas de "faillite", seulement de la résilience)
    ["health:status", "healthy"],  // healthy | assets_solidarity | rnd_solidarity | volunteer
    ["health:resilience_level", "0"],  // 0=Abondance | 1=Solidarité ASSETS | 2=Solidarité R&D | 3=Bénévolat Actif
    ["health:weeks_runway", "45"],
    ["health:bilan", "283.00"],
    
    // Love Ledger — bénévolat comptabilisé (Ğ1=Liberté, Ẑen=Égalité, ❤️=Fraternité)
    ["love_ledger:total_zen", "0"],   // Total Ẑen offerts aux Communs (≈ € de sacrifice)
    ["love_ledger:weeks", "0"],        // Nombre de semaines de bénévolat
    
    // Fiscal provisions
    ["provision:tva", "65.00"],
    ["provision:is", "35.50"],
    
    // Depreciation
    ["depreciation:machine_value", "500.00"],
    ["depreciation:residual", "480.00"],
    ["depreciation:percent", "4.00"]
  ],
  "content": "{
    \"report_version\": \"1.1\",
    \"report_type\": \"daily_economic_health\",  // Published daily (was "weekly_economic_health" in old version)
    \"generated_at\": \"2026-01-07T14:30:00Z\",
    \"station\": {
      \"ipfsnodeid\": \"12D3KooWABC...\",
      \"uplanetname\": \"ORIGIN\",
      \"relay_url\": \"wss://relay.copylaradio.com\",
      \"captain_npub\": \"npub1abc...\",
      \"captain_email\": \"captain@example.com\"
    },
    \"wallets\": {
      \"g1_reserve\": { \"g1pub\": \"...\", \"balance_g1\": 126.05, \"balance_zen\": 1250.50 },
      \"cash\": { \"g1pub\": \"...\", \"balance_g1\": 126.05, \"balance_zen\": 1250.50 },
      \"rnd\": { \"g1pub\": \"...\", \"balance_g1\": 90.02, \"balance_zen\": 890.25 },
      \"assets\": { \"g1pub\": \"...\", \"balance_g1\": 211.00, \"balance_zen\": 2100.00 },
      \"impot\": { \"g1pub\": \"...\", \"balance_g1\": 46.08, \"balance_zen\": 450.75 },
      \"capital\": { \"g1pub\": \"...\", \"balance_g1\": 49.00, \"balance_zen\": 480.00 },
      \"amortissement\": { \"g1pub\": \"...\", \"balance_g1\": 3.00, \"balance_zen\": 20.00 },
      \"node\": { \"g1pub\": \"...\", \"balance_g1\": 5.20, \"balance_zen\": 42.00 },
      \"captain_dedicated\": { \"g1pub\": \"...\", \"balance_g1\": 15.00, \"balance_zen\": 140.00 }
    },
    \"revenue\": {
      \"multipass\": { \"count\": 85, \"rate\": 1.0, \"total\": 85.00, \"tva\": 17.00 },
      \"zencard\": { \"renters\": 9, \"rate\": 4.0, \"total\": 36.00, \"tva\": 7.20 },
      \"note\": \"ZenCard owners (3) are sociétaires - no weekly rent (capital contribution instead)\",
      \"total_ht\": 121.00,
      \"total_tva\": 24.20,
      \"total_ttc\": 145.20
    },
    \"costs\": {
      \"paf_node\": 14.00,
      \"captain_salary\": 28.00,
      \"total\": 42.00
    },
    \"allocation\": {
      \"surplus\": 91.00,
      \"is_provision\": 22.75,
      \"net_surplus\": 68.25,
      \"treasury\": 22.75,
      \"rnd\": 22.75,
      \"assets\": 22.75
    },
    \"capacity\": {
      \"multipass\": { \"used\": 85, \"total\": 250, \"percent\": 34 },
      \"zencard\": { \"total\": 12, \"renters\": 9, \"owners\": 3, \"capacity\": 24, \"percent\": 50 }
    },
    \"health\": {
      \"status\": \"healthy\",
      \"bilan\": 283.00,
      \"weeks_runway\": 45,
      \"paf_coverage\": 6.7,
      \"risk_level\": \"low\"
    },
    \"depreciation\": {
      \"machine_value\": 500.00,
      \"capital_date\": \"20251215143000\",
      \"weeks_elapsed\": 3,
      \"depreciation_weeks\": 156,
      \"weekly_depreciation\": 3.21,
      \"total_depreciated\": 9.63,
      \"residual_value\": 490.37,
      \"percent\": 1.93
    },
    \"compliance\": {
      \"tva_provisioned\": 65.00,
      \"is_provisioned\": 35.50,
      \"audit_ready\": true,
      \"last_allocation_date\": \"2026-01-06T00:00:00Z\"
    }
  }",
  "id": "<event_id>",
  "sig": "<signature>"
}
```

## ZenCard User Classification

### Renters vs Owners (Sociétaires)

ZenCard users are classified into two distinct categories for revenue calculation:

#### Renters (Locataires) 🏠
- **No `U.SOCIETY` file** in their player folder, OR
- **Expired `U.SOCIETY.end`** date
- **Pay weekly ZCARD rent** (default: 4 Ẑ/week HT)
- Counted in `zencard_renters` field
- Contribute to weekly revenue

#### Owners (Sociétaires) 👑  
- **Valid `U.SOCIETY` file** in player folder
- **Active membership** (no end date OR end date not reached)
- **Made one-time capital contribution** via `UPLANET.official.sh`
- **No weekly rent** - they're co-owners, not renters
- Counted in `zencard_owners` field
- NOT counted in weekly rental revenue

### Detection Logic

```bash
if [[ -s "${player_dir}U.SOCIETY" ]]; then
    if [[ -s "${player_dir}U.SOCIETY.end" ]]; then
        if [[ "$CURRENT_DATE" < "$USOCIETY_END" ]]; then
            # Active membership - OWNER (no rent)
            ZENCARD_OWNERS=$((ZENCARD_OWNERS + 1))
        else
            # Expired membership - now a RENTER
            ZENCARD_RENTERS=$((ZENCARD_RENTERS + 1))
        fi
    else
        # No end date = permanent membership - OWNER
        ZENCARD_OWNERS=$((ZENCARD_OWNERS + 1))
    fi
else
    # No U.SOCIETY file - RENTER (pays rent)
    ZENCARD_RENTERS=$((ZENCARD_RENTERS + 1))
fi
```

### Revenue Impact

Only renters contribute to weekly rental revenue:

```
ZENCARD_REVENUE = ZENCARD_RENTERS × ZCARD_RATE
```

Not:
```
ZENCARD_REVENUE = ZENCARD_TOTAL × ZCARD_RATE  // WRONG!
```

## Synchronization

### N² Constellation Sync

Economic health events are synchronized across the constellation:

```jsonc
{
  "sync_event_kinds": [
    // ... existing kinds ...
    30850  // Station economic health
  ]
}
```

### Publication Schedule

| Event Kind | Publisher | Frequency | Timing |
|------------|-----------|-----------|--------|
| **30850** | Each Station | As needed | After `ZEN.ECONOMY.sh` |

Each event represents the latest economic state at the time of publication (indicated by `created_at` timestamp).

## Query Patterns

### Get Station Economic Health

```javascript
// Latest economic health for a station
{
  "kinds": [30850],
  "authors": ["<CAPTAIN_HEX>"],
  "limit": 1
}

// Economic health history (last 30 days - daily reports)
{
  "kinds": [30850],
  "authors": ["<CAPTAIN_HEX>"],
  "since": <timestamp_30_days_ago>,
  "limit": 30
}
```

### Get All Stations in Constellation

```javascript
// All stations in same swarm (identified by UPLANETG1PUB)
{
  "kinds": [30850],
  "#constellation": ["<UPLANETG1PUB>"]  // G1 wallet distributing usage tokens
}

// Get latest reports (use since to limit time range)
{
  "kinds": [30850],
  "#constellation": ["<UPLANETG1PUB>"],
  "since": <timestamp>
}
```

### Get Stations by Health Status

```javascript
// Stations needing attention
{
  "kinds": [30850],
  "#constellation": ["<UPLANETG1PUB>"],
  "#health:status": ["warning", "critical"]
}
```

## Legal Compliance

### Audit Trail

Each economic health event provides:
- **Cryptographic signature** by Captain (non-repudiation)
- **Timestamp** (proof of reporting date)
- **Wallet public keys** (verifiable on Ğ1 blockchain)
- **Detailed breakdown** (accounting categories)

### SCIC Compliance

The event structure maps to SCIC accounting:

| Tag Category | Accounting Purpose |
|--------------|-------------------|
| `balance:cash` | Compte 51 - Trésorerie |
| `balance:assets` | Compte 20 - Immobilisations |
| `balance:capital` | Compte 21 - Immobilisations corporelles |
| `balance:amortissement` | Compte 28 - Amortissements |
| `provision:tva` | Compte 4457 - TVA collectée |
| `provision:is` | Compte 444 - IS à payer |
| `revenue:*` | Compte 70 - Ventes |
| `cost:*` | Compte 60-65 - Charges |
| `allocation:*` | Compte 12 - Résultat |

### Export Formats

The content JSON can be transformed into:
- **FEC (Fichier des Écritures Comptables)** for French tax authority
- **CSV** for spreadsheet analysis
- **XBRL** for standardized financial reporting

## Dashboard Integration

### economy.Swarm.html

A new dashboard displaying swarm-level economics:

```
┌─────────────────────────────────────────────────────────────┐
│                  🌐 Constellation Economic Dashboard         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  25 Stations     │  │  Network Health  │                │
│  │  ████████████░░  │  │  ████████████░░  │                │
│  │  22 Healthy      │  │  88%             │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Total Treasury: 31,262.50 Ẑ  │ Total R&D: 22,256.25 Ẑ │ │
│  │ Total Assets:   52,500.00 Ẑ  │ Weekly Revenue: 8,125 Ẑ│ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Station List:                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🟢 ORIGIN     │ Bilan: 283 Ẑ  │ 42% capacity │ W45  │   │
│  │ 🟢 TOULOUSE   │ Bilan: 412 Ẑ  │ 67% capacity │ W52  │   │
│  │ 🟡 BORDEAUX   │ Bilan: 28 Ẑ   │ 12% capacity │ W8   │   │
│  │ 🔴 LYON       │ Bilan: -5 Ẑ   │ 5% capacity  │ W0   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### Data Integrity

- All events signed by Captain's NOSTR keypair
- Wallet balances verifiable on Ğ1 blockchain
- Timestamps prevent backdating

### Privacy

- Wallet public keys are already public on Ğ1
- Email addresses in `station` object are optional
- Aggregated swarm data doesn't expose individual transactions

### Sybil Prevention

- Only registered stations (primo-transaction) can publish
- Hub validates station membership before aggregation
- G1 Web of Trust provides identity verification

## Implementation

### Reference Implementation

- **Broadcast Script:** `Astroport.ONE/RUNTIME/ECONOMY.broadcast.sh`
- **Dashboard:** `UPlanet/earth/economy.Swarm.html` (Direct NOSTR connection, no API required)

### Integration with Existing Scripts

```bash
# In ZEN.ECONOMY.sh (daily, after cooperative allocation check)
${MY_PATH}/ECONOMY.broadcast.sh
```

## Future Enhancements

### Phase 1: Basic Reporting (Current)
- ✅ Kind 30850 station reports
- ✅ Daily publication cycle
- ✅ Client-side swarm aggregation (economy.Swarm.html)

### Phase 2: Real-Time Monitoring
- ⏳ WebSocket push for balance changes
- ⏳ Alert events (kind 30852) for critical status
- ⏳ Trend analysis and projections

### Phase 3: Advanced Analytics
- ⏳ Historical trend charts
- ⏳ Predictive modeling for runway
- ⏳ Cross-station benchmarking

## Compatibility

This extension is compatible with:
- ✅ [NIP-101](101.md) - UPlanet Identity & Geographic Coordination
- ✅ [NIP-101 N² Constellation Sync](101-n2-constellation-sync-extension.md)
- ✅ [NIP-10000 Analytics](10000-analytics-extension.md)
- ✅ Standard NOSTR clients (queryable events)

## License

This specification is released under **AGPL-3.0**.

## Authors

- **papiche** - [github.com/papiche](https://github.com/papiche)
- **CopyLaRadio SCIC** - Cooperative implementation
