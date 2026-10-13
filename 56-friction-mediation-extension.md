# NIP-56 Extension — WoTx² Friction Mediation Protocol

> **Status**: Draft  
> **Author**: UPlanet Cooperative (support@qo-op.com)  
> **Depends on**: NIP-01, NIP-33, NIP-56, NIP-101 (UPlanet WoTx²)

---

## Abstract

This extension defines how NIP-56 **Kind 1984** reports with `report-type=friction` trigger a two-tier decentralized mediation protocol (N1 amiable → N2 arbitration) using **Kind 30506** (mediation dossier, NIP-33 parameterized replaceable) and **Kind 1506** (mediation acts, regular append-only).

The system replaces centralized insurance with **WoT-based mutual assurance**: the N1 circle (direct contacts, ~100 peers via Kind 3) handles amiable mediation, while the N2 circle (friends-of-friends, ~10,000 peers via `amisOfAmis.txt`) handles formal arbitration.

---

## Motivation

Standard NIP-56 Kind 1984 events handle abuse reports (`spam`, `harassment`, etc.) but provide no mechanism for resolving resource-sharing disputes between WoTx² participants (use of shared objects, service delivery, skill certification disagreements). This extension fills that gap by defining a full lifecycle from declaration to resolution.

---

## New Event Kinds

| Kind | NIP-01 Type | Role |
|------|-------------|------|
| **30506** | Parameterized replaceable (NIP-33) | Mediation dossier — current state |
| **1506** | Regular (append-only) | Mediation acts journal — votes, escalations, verdicts |

---

## Kind 1984 — Trigger Extension

A friction report **MUST** include the tag `["report-type", "friction"]`. It **SHOULD** also include:

```json
{
  "kind": 1984,
  "pubkey": "<reporter_hex>",
  "tags": [
    ["report-type", "friction"],
    ["p", "<reported_pubkey>"],
    ["reason", "Usage d'un objet partagé sans le niveau WoT requis"],
    ["object", "<dtag_of_kind_30505_object>"],
    ["skill", "permis-conduire-vehicule:x2"],
    ["friction-amount", "5"],
    ["e", "<event_id_of_kind_30505_if_relevant>"]
  ],
  "content": "Narrative description of the friction"
}
```

### Tag Reference

| Tag | Required | Description |
|-----|----------|-------------|
| `report-type` | **Yes** | Must be `"friction"` to trigger this protocol |
| `p` | **Yes** | Pubkey of the reported party (respondent) |
| `reason` | **Yes** | Short description of the dispute |
| `object` | No | `d`-tag of the Kind 30505 object involved |
| `skill` | No | Skill and level required but not held (`skill_id:xN`) |
| `friction-amount` | No | Claimed reparation amount in ẐEN |

### Relay Processing (NIP-101 filter/1984.sh)

When a relay receives a Kind 1984 with `report-type=friction`:

1. Validates both parties are MULTIPASS holders (local, swarm, or amisOfAmis)
2. Determines mediation level based on amount: `≤10ẐEN → N1`, `>10ẐEN → N2`, `>50ẐEN → constellation`
3. Writes a pending case JSON to `~/.zen/tmp/justice_pending/<case_id>.json`
4. Asynchronously triggers `ASTROBOT/N1Mediation.sh` to create Kind 30506

---

## Kind 30506 — Mediation Dossier

Kind 30506 is a **NIP-33 parameterized replaceable event**: the `d` tag uniquely identifies a case, and new publications replace previous ones (tracking status evolution).

### Mandatory Tags

| Tag | Description |
|-----|-------------|
| `d` | Unique case identifier. Format: `friction-<plaignant6>-<défendeur6>-<timestamp>` |
| `t` | Must be `"friction"` |
| `status` | Current status (see Status Values below) |
| `p` + `"role:plaignant"` | Reporting party's pubkey |
| `p` + `"role:défendeur"` | Respondent's pubkey |

### Optional Tags

| Tag | Description |
|-----|-------------|
| `e` | Event ID of the triggering Kind 1984 |
| `object` | `d`-tag of the Kind 30505 object involved |
| `skill` | Disputed skill and level (`skill_id:xN`) |
| `reparation` | Agreed or requested reparation amount in ẐEN |

### Content JSON

```json
{
  "title": "Friction: usage véhicule partagé",
  "status": "N1_ouvert",
  "level": "N1",
  "description": "Utilisation d'une voiture partagée sans permis x2 WoT validé",
  "resolution": null,
  "reparation_zen": 5,
  "created_at": "2026-05-31T12:00:00Z"
}
```

### Status Values

| Value | Meaning |
|-------|---------|
| `N1_ouvert` | Amiable mediation in progress (direct circle) |
| `N1_résolu` | Amiable resolution reached at N1 |
| `N2_ouvert` | Escalated to formal arbitration (extended circle) |
| `N2_résolu` | Formal verdict rendered at N2 |
| `classé` | Case closed without resolution |

### Complete Example

```json
{
  "kind": 30506,
  "pubkey": "<oracle_station_hex>",
  "created_at": 1748736000,
  "tags": [
    ["d", "friction-coucou1-jean56-1748736000"],
    ["t", "friction"],
    ["status", "N1_ouvert"],
    ["p", "<coucou_hex>", "role:plaignant"],
    ["p", "<jean_hex>", "role:défendeur"],
    ["e", "<event_id_of_kind_1984>"],
    ["object", "voiture-partagee-5-places-jean"],
    ["skill", "permis-conduire-vehicule:x2"],
    ["reparation", "5"]
  ],
  "content": "{\"title\":\"Friction: usage véhicule partagé\",\"status\":\"N1_ouvert\",\"level\":\"N1\",\"description\":\"Usage voiture sans permis x2 WoT\",\"resolution\":null,\"reparation_zen\":5,\"created_at\":\"2026-05-31T12:00:00Z\"}"
}
```

---

## Kind 1506 — Mediation Act

Kind 1506 is a **regular (non-replaceable) event**: each act is immutably recorded, creating an append-only journal for each case.

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | **Yes** | Case identifier (matches `d` tag of Kind 30506) |
| `e` | **Yes** | Event ID of the current Kind 30506 state |
| `p` | **Yes** (×2) | Pubkeys of both parties |
| `t` | **Yes** | Act type (see Action Values below) |

### Content JSON

```json
{
  "action": "vote_amiable",
  "arbitre": "<npub64_of_mediator>",
  "vote": "+1",
  "note": "Les deux parties sont d'accord pour 5 ẐEN de dédommagement",
  "reparation_zen": 5
}
```

### Action Values

| Value | Actor | Description |
|-------|-------|-------------|
| `N1_ouvert` | Oracle station | Opening act — dossier created |
| `vote_amiable` | N1 circle member | Mediation vote (+1 / -1) |
| `escalade_N2` | Oracle or mediator | Decision to escalate |
| `resolution` | Oracle station | N1 resolution act |
| `verdict` | N2 arbitration panel | Formal verdict (N2) |

### Example — Amiable Vote

```json
{
  "kind": 1506,
  "pubkey": "<mediateur_hex>",
  "created_at": 1748739600,
  "tags": [
    ["d",  "friction-coucou1-jean56-1748736000"],
    ["e",  "<event_id_of_kind_30506>"],
    ["p",  "<coucou_hex>"],
    ["p",  "<jean_hex>"],
    ["t",  "vote_amiable"]
  ],
  "content": "{\"action\":\"vote_amiable\",\"arbitre\":\"<npub64_mediateur>\",\"vote\":\"+1\",\"note\":\"5 ẐEN de dédommagement acceptés\",\"reparation_zen\":5}"
}
```

---

## Mediation Lifecycle

```
1. User publishes Kind 1984 (report-type=friction)
   └─► relay filter/1984.sh detects friction tag
       ├─► Validates both parties are MULTIPASS
       ├─► Determines level: ≤10ẐEN=N1 / >10ẐEN=N2 / >50ẐEN=constellation
       └─► Triggers ASTROBOT/N1Mediation.sh (async)

2. Oracle station creates Kind 30506 (status=N1_ouvert)
   └─► d-tag = "friction-<slug>-<ts>"
   └─► Signed by station's NSEC (secret.nostr)

3. N1 circle notified (common contacts in amisOfAmis.txt)
   └─► Mediators publish Kind 1506 (vote_amiable: +1 or -1)

4a. N1 Resolution (≤10ẐEN, majority positive votes)
    ├─► Kind 1506 (action=resolution) published
    ├─► Reparation paid via Kind 7 (+N) on complainant's wallet
    └─► Kind 30506 updated (status=N1_résolu)

4b. N2 Escalation (>10ẐEN or N1 disagreement)
    ├─► Kind 1506 (action=escalade_N2) published
    ├─► Kind 30506 updated (status=N2_ouvert, level=N2)
    ├─► 5 titled N2 members selected from amisOfAmis.txt
    └─► 7-day arbitration window

5. N2 Verdict
   ├─► Kind 1506 (action=verdict) published by N2 panel
   ├─► Reparation enforced if verdict positive
   └─► Kind 30506 updated (status=N2_résolu)
```

---

## Threshold Table

| Amount (ẐEN) | Circuit | Quorum |
|--------------|---------|--------|
| ≤ 10 ẐEN | N1 only (amiable + vote) | Majority of common contacts |
| > 10 ẐEN | Mandatory N2 (formal arbitration) | 5 titled N2 members |
| > 50 ẐEN | Extended constellation vote | Assembly vote |

---

## Relay Implementation (NIP-101)

### filter/30506.sh — Acceptance Policy

A relay accepting Kind 30506 MUST validate:
1. Publisher is authorized (local MULTIPASS, swarm, or amisOfAmis)
2. Tag `t` equals `"friction"` (mandatory type)
3. Tag `d` starts with `"friction-"` (case ID format)

### filter/1984.sh — Friction Detection

When `report-type=friction` is detected, the relay SHOULD:
1. Log the case to `~/.zen/tmp/justice_cases.log`
2. Trigger async Kind 30506 creation via oracle NSEC

### backfill_constellation.sh — Synchronization

Kind 30506 and Kind 1506 MUST be included in constellation backfill to ensure mediation cases are visible across all constellation relay nodes. Add to kinds list:

```
1506, 1984, 30506
```

---

## WoT-Based Mutual Assurance Model

### Solidarity Pool

The solidarity pool is funded by the **TREASURY** fraction (1/3 of PAF per the 3×1/3 rule in `ZEN.ECONOMY.sh`). There is no centralized insurer.

Reparations are paid via Kind 7 (`+N`) on the complainant's wallet, funded from the station TREASURY wallet. The trace is recorded in Kind 1506 (`action=resolution` or `action=verdict`).

### Skill-Required Objects

Kind 30505 objects MAY carry a `skill_required` tag:

```json
["skill_required", "permis-conduire-vehicule:x2"]
```

This tag is **advisory** in N1 mediation and **binding** in N2 arbitration: a respondent lacking the required WoT level for an object they used is presumed at fault.

---

## Security Considerations

- Kind 30506 MUST be signed by the station oracle (NSEC in `secret.nostr`), not by the reporting party, to prevent self-serving dossiers.
- Relay filters MUST verify both parties are MULTIPASS holders before creating a dossier.
- The `d` tag format `friction-<6char>-<6char>-<ts>` provides sufficient entropy to prevent d-tag collisions between cases.
- amisOfAmis.txt should be treated as a trust list and only populated by known-good events.

---

## References

- [NIP-01](01.md) — Basic protocol
- [NIP-33](33.md) — Parameterized replaceable events
- [NIP-56](56.md) — Reporting (Kind 1984)
- [NIP-101 (UPlanet)](101.md) — WoTx² identity and oracle system
- [NIP-42 Oracle Permits Extension](42-oracle-permits-extension.md) — WoTx² P2P certification
- `Astroport.ONE/docs/reference/KIND_30506_JUSTICE.md` — Implementation reference
- `NIP-101/relay.writePolicy.plugin/filter/1984.sh` — Relay filter
- `Astroport.ONE/ASTROBOT/N1Mediation.sh` — Oracle automation script
- `Astroport.ONE/admin/dashboard.JUSTICE.manager.sh` — Admin CLI for mediation cases
