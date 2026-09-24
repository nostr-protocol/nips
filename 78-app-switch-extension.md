# UPlanet Extension — kind 30078 : App Switch Configuration

## Résumé

Utilisation de **NIP-78** (kind 30078, parameterized replaceable) pour stocker
la configuration personnalisée du menu FAB UPlanet par utilisateur.

## Identifiant

| Champ | Valeur |
|-------|--------|
| kind  | 30078  |
| d tag | `uplanet:app-switch` |
| client tag | `UPlanet` |

## Schéma de l'événement

```json
{
  "kind": 30078,
  "pubkey": "<hex pubkey>",
  "created_at": 1700000000,
  "tags": [
    ["d", "uplanet:app-switch"],
    ["client", "UPlanet"]
  ],
  "content": "<JSON stringifié>"
}
```

## Format du content (JSON)

```json
{
  "v": 1,
  "ring1": [
    { "id": "index",    "icon": "🌍", "label": "Accueil",  "href": "index.html" },
    { "id": "udrive",   "icon": "📁", "label": "uDRIVE",   "href": "https://home-station/..." },
    { "id": "custom_1", "icon": "🔗", "label": "Mon lien", "href": "https://example.com" }
  ],
  "ring2": [
    { "id": "multipass", "icon": "🪪", "label": "42.5 Ẑ", "href": "nostr_profile_viewer.html" },
    { "id": "economy",   "icon": "📊", "label": "Économie","href": "economy.html" }
  ]
}
```

### Format d'un item

| Champ    | Type   | Requis | Description |
|----------|--------|--------|-------------|
| `id`     | string | ✓      | Identifiant unique (stable, utilisé pour updateItem) |
| `icon`   | string | ✓      | Emoji ou texte court (≤ 4 chars) |
| `label`  | string | ✓      | Nom affiché sous l'icône |
| `href`   | string | ✓      | URL relative ou absolue |

Les items avec `action` (fonctions callbacks) ne sont pas sérialisés — ils sont
réinjectés dynamiquement par `app_switch_data.js` à la connexion.

## Modes

| Mode       | Source des anneaux | Déclenchement |
|------------|--------------------|---------------|
| `origin`   | APPS / APPS2_DEFAULT (statiques) | Par défaut, ou `AppSwitch.setMode('origin')` |
| `player`   | kind 30078 chargé depuis relay + cache localStorage | À la connexion NOSTR, ou `AppSwitch.setMode('player')` |

## Chargement

1. À la détection de `window.userPubkey`, `app_switch_nostr.js` applique d'abord
   le cache localStorage (`asw_nostr_config`, TTL 30 min) pour une UI instantanée.
2. Puis souscrit `kinds:[30078], authors:[pubkey], '#d':['uplanet:app-switch']`
   sur le relay NOSTR.
3. Si un event est reçu et plus récent que le cache, il remplace la config.

## Sauvegarde

`AppSwitch.save()` → signe le contenu actuel (`ring1` + `ring2`) via NIP-07
(`window.nostr.signEvent`) et publie `['EVENT', signed]` sur le relay.

## Items dynamiques (hors NIP-78)

Certains items sont ajoutés/mis à jour dynamiquement par `app_switch_data.js`
et ne persistent dans le kind 30078 qu'après un appel explicite à `AppSwitch.save()` :

| id           | Source                                      | Anneau |
|--------------|---------------------------------------------|--------|
| `udrive`     | `window.userProfile.website` (home station) | 1      |
| `multipass`  | Label mis à jour avec solde ẐEN             | 2      |
| `_switch`    | Toggle ORIGIN ↔ PLAYER                      | 1      |
| `_add`       | Bouton « ➕ Ajouter »                        | 2      |
| `custom_*`   | Ajoutés via formulaire « ➕ »               | 1 ou 2 |

## Raccourcis épinglés (localStorage)

Les items épinglés via `AppSwitchData.pinItem(item)` sont stockés séparément
dans `localStorage['asw_pinned']` — ils apparaissent comme icônes flottantes
à côté du FAB (bureau mobile) et ne font pas partie du kind 30078.

## API JavaScript

```javascript
// Charger en mode PLAYER (depuis NOSTR)
window.AppSwitch.setMode('player');

// Revenir au menu ORIGIN
window.AppSwitch.setMode('origin');

// Ajouter un item personnalisé
window.AppSwitch.addItem(1, { id: 'mon-app', icon: '⭐', label: 'Mon App', href: 'https://...' });

// Modifier un item existant
window.AppSwitch.updateItem(2, 'multipass', { label: '42.5 Ẑ' });

// Sauvegarder la config dans NOSTR
await window.AppSwitch.save();   // → true si OK, false si erreur

// Épingler un item sur le "bureau"
window.AppSwitchData.pinItem({ id: 'mon-app', icon: '⭐', label: 'Mon App', href: 'https://...' });

// Hook connexion
window.AppSwitch.onConnect(function(pubkey, relay) {
    // appelé une fois par session quand userPubkey est disponible
});
```

## Ordre de chargement des scripts

```html
<script src="nostr.bundle.js"></script>
<script src="common.js"></script>
<!-- ... contenu de la page ... -->
<script src="app_switch.js"></script>
<script src="app_switch_nostr.js"></script>   <!-- optionnel, mode PLAYER -->
<script src="app_switch_data.js"></script>    <!-- optionnel, solde ẐEN + bureau -->
```

## Voir aussi

- [NIP-78](78.md) — Arbitrary custom app data (kind 30078)
- `earth/app_switch.js` — Core FAB + anneaux
- `earth/app_switch_nostr.js` — Lecture/écriture kind 30078
- `earth/app_switch_data.js` — Solde ẐEN, uDRIVE, bureau mobile
