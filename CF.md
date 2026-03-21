NIP-CF
======

Nostr Apps (napps)
------------------

`draft` `optional`

This NIP describes a method for publishing and discovering web applications on Nostr. An app consists of an **app listing** event for metadata and discoverability, paired with a [NIP-XX](XX.md) static website that serves the application files.

Files are stored on [Blossom](https://github.com/hzrd149/blossom) servers and referenced by their SHA-256 hash in the site manifest. Host server implementation, file resolution, and URL routing are defined in [NIP-XX](XX.md).

### Definitions

- **App identifier (`d` tag)**: A short string (1-7 characters, `[a-z0-9]`) that uniquely identifies an app under a given pubkey and channel.
- **Channel**: One of `main` (stable), `next` (beta), or `draft` (preview). Each channel uses a distinct app listing event `kind`.

### App Listing Event

The app listing event is an addressable event as defined in [NIP-01](01.md). It contains metadata for discovery and display: the app's name, summary, icon, categories, and availability.

Each listing MUST reference a [NIP-XX](XX.md) site manifest via an `a` tag, linking the listing to the static website that contains the application files.

> [!TIP]
> App listings should be published to specialized app marketplace relays as well as the author's [NIP-65](65.md) write relays.

> [!IMPORTANT]
> If the website has no [NIP-07](07.md) support, it should not be considered a Nostr app. In that case, publish only the [NIP-XX](XX.md) site manifest without an app listing.

| Channel | Kind  |
|---------|-------|
| main    | 37348 |
| next    | 37349 |
| draft   | 37350 |

#### Required tags

| Tag    | Format                                    | Description                           |
|--------|-------------------------------------------|---------------------------------------|
| `d`    | `["d", "<identifier>"]`                   | App identifier (1-7 chars, `[a-z0-9]`)|
| `a`    | `["a", "35128:<pubkey>:<site-d-tag>"]`    | Reference to the [NIP-XX](XX.md) named site manifest containing the app's files. |
| `name` | `["name", "<display name>", "<lang>?"]`   | Human-readable app name. Optional ISO 639-1 language code in third element. |
| `icon` | `["icon", "<sha256>"]`                    | App icon. `sha256` is the hash of the icon blob stored on the author's [Blossom](https://github.com/hzrd149/blossom) servers. If absent, clients SHOULD use the `/favicon.ico` path from the referenced site manifest. |
| `c`    | `["c", "<country or *>"]`                 | ISO 3166-1 alpha-2 uppercase country code or `*` for global availability. May appear multiple times. |

Both `name` and `icon` MUST be present for a listing to be considered complete. Clients SHOULD NOT display incomplete listings in app directories.

#### Optional tags

| Tag           | Format                                          | Description                           |
|---------------|-------------------------------------------------|---------------------------------------|
| `summary`     | `["summary", "<text>", "<lang>?"]`              | Short description. Optional ISO 639-1 language code. |
| `l`           | `["l", "napp.<category>:<subcategory>"]`        | Category label (see [Categories](#categories)). Up to 3 recommended. |
| `t`           | `["t", "<hashtag>", "<label>?"]`                | Hashtag for search/filtering. Up to 3 allowed. Value MUST be lowercased with whitespace removed. |
| `self`        | `["self", "<pubkey>"]`                          | The app's own Nostr profile pubkey. |
| `auto`        | `["auto", "<field>"]`                           | Marks a field (`name`, `summary`, or `icon`) as auto-derived (e.g. extracted from HTML metadata). Clients updating the listing SHOULD overwrite auto-derived fields but SHOULD NOT overwrite manually-set fields. |
| `description` | `["description", "<text>", "<lang>?"]`          | Long description. Optional ISO 639-1 language code. |
| `key-art`     | `["key-art", "<sha256>"]`                       | Main image (e.g. to show on an app card). |
| `screenshot`  | `["screenshot", "<sha256>"]`                    | Screenshot image. May appear multiple times. |

#### Example

```jsonc
{
  "kind": 37348,
  "pubkey": "<32-byte-hex>",
  "content": "",
  "tags": [
    ["d", "myapp"],
    ["a", "35128:<32-byte-hex>:myapp"],
    ["name", "My Application"],
    ["summary", "A decentralized note-taking app"],
    ["icon", "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"],
    ["c", "*"],
    ["l", "napp.utilities:office"],
    ["t", "notes"],
    ["t", "productivity"],
    ["auto", "summary"]
  ],
  "created_at": 1727373475
}
```

### Site Manifest

An app's file manifest is a [NIP-XX](XX.md) named site manifest (kind `35128`). NIP-CF does not define its own file manifest format.

The site manifest MUST use `path` tags as defined in [NIP-XX](XX.md). `path` tags MAY include an optional fourth element for MIME type:

```
["path", "/favicon.ico", "<sha256>", "image/x-icon"]
```

When a MIME type is present in the `path` tag, host servers SHOULD use it for the `Content-Type` header. When absent, the MIME type SHOULD be derived from the file extension or forwarded from the storage server's response headers.

> [!TIP]
> MIME types are optional and SHOULD be omitted when the file extension is sufficient for type detection. This reduces event size, which is important when the event is transmitted via [NIP-44](44.md) encrypted payloads (e.g. for [NIP-46](46.md) authenticated access).

The site manifest MAY include `server` tags hinting at which Blossom servers host the files. See [NIP-XX](XX.md) for file resolution details.

#### Channel-to-site mapping

Each app listing channel references a site manifest via its `a` tag. Different channels may reference different site manifests:

| Listing Channel | Listing Kind | Example site `d` tag |
|-----------------|--------------|----------------------|
| main            | 37348        | `myapp`              |
| next            | 37349        | `myappn`             |
| draft           | 37350        | `myappd`             |

The site manifest's `d` tag does not need to match the app listing's `d` tag. The `a` tag in the listing is the authoritative reference.

#### Example: app listing with site manifest

The app listing (kind 37348):

```jsonc
{
  "kind": 37348,
  "pubkey": "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e",
  "content": "",
  "tags": [
    ["d", "myapp"],
    ["a", "35128:7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e:myapp"],
    ["name", "My Application"],
    ["icon", "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"],
    ["c", "*"]
  ],
  "created_at": 1727373475
}
```

The referenced site manifest (kind 35128, from [NIP-XX](XX.md)):

```jsonc
{
  "kind": 35128,
  "pubkey": "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e",
  "content": "",
  "tags": [
    ["d", "myapp"],
    ["path", "/index.html", "186ea5fd14e88fd1ac49351759e7ab906fa94892002b60bf7f5a428f28ca1c99"],
    ["path", "/assets/style.css", "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"],
    ["path", "/assets/app.js", "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"],
    ["path", "/favicon.ico", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "image/x-icon"],
    ["server", "https://blossom.example.com"]
  ],
  "created_at": 1727373475
}
```

### NIP-19 `napp` entity encoding

Apps are optionally referenced using a `napp` entity string prefixed with `+` characters (not `napp1`). See [reference implementation](https://github.com/44Billion/nappup/blob/main/src/helpers/nip19.js).

> [!NOTE]
> A `napp` entity can be used as a path (e.g. `https://host.example/<napp entity>`) or inside a kind:1 note's content as `nostr:<napp entity>`.

The entity encodes the app identifier, optional relay hints, and the author's pubkey using a TLV (Type-Length-Value) binary format encoded in base-62.

The channel is indicated by a prefix of `+` characters:

| Prefix | Channel |
|--------|---------|
| `+`    | main    |
| `++`   | next    |
| `+++`  | draft   |

The TLV payload contains:

| Type | Content                       | Encoding     |
|------|-------------------------------|--------------|
| 0    | App identifier                | UTF-8        |
| 1    | Relay URL (optional, repeats) | UTF-8        |
| 2    | Author pubkey                 | 32 raw bytes |

Each TLV entry is encoded as: `[type: 1 byte] [length: 1 byte] [value: length bytes]`.

The resulting binary is encoded in base-62 and prefixed with the channel marker. For example, a stable app might be referenced as `+5kJx8...` while its beta channel would be `++5kJx8...`.

The entity format matches the regex: `^\+{1,3}[A-Za-z0-9]{48,}$`

### Categories

App listings MAY include up to 3 `l` tags with category labels in the format `napp.<category>:<subcategory>`. The following categories and subcategories are defined:

| Category      | Subcategories |
|---------------|---------------|
| `other`       | `other` |
| `games`       | `other`, `action`, `rpg`, `strategy`, `shooter`, `fighting`, `simulation`, `puzzle`, `board`, `gambling`, `racing`, `sports`, `ar`, `vr` |
| `money`       | `other`, `crypto`, `loans`, `investments`, `wallet`, `gambling`, `raffle`, `crowdfunding`, `donation`, `jobs` |
| `shopping`    | `other`, `marketplace`, `store`, `auction` |
| `social`      | `other`, `network`, `messenger`, `blog`, `dating` |
| `audiovisual` | `other`, `podcast`, `music`, `video`, `news` |
| `utilities`   | `other`, `weather`, `office`, `finances`, `learning`, `text editor`, `image editor`, `audio editor`, `video editor`, `ar`, `vr`, `ai` |

Clients SHOULD validate category labels against this table and ignore unrecognized values.

### App identifier constraints

The `d` tag value (app identifier) MUST satisfy:

- Length: 1 to 7 characters
- Character set: `[a-z0-9]` (lowercase alphanumeric, base-36)

Publishers that need to derive an identifier from an arbitrary string (e.g. a folder name) SHOULD hash the string with SHA-1 and encode the first 4 bytes in base-36, truncated to 7 characters.

### Publishing flow

A publisher SHOULD follow this sequence:

1. **Discover relays**: Fetch the author's [NIP-65](65.md) relay list (kind `10002`) to determine write relays.
2. **Discover Blossom servers**: Fetch the author's [BUD-03](https://github.com/hzrd149/blossom/blob/master/buds/03.md) server list (kind `10063`) and health-check each server.
3. **Upload files**: Upload all application files to one or more healthy Blossom servers. Compute the SHA-256 hash for each file.
4. **Publish site manifest**: Create and sign a [NIP-XX](XX.md) named site manifest (kind `35128`) with `path` tags mapping each filename to its SHA-256 hash. Include `server` tags for Blossom server hints.
5. **Upload icon**: If an icon is provided separately (not part of the app's file tree), upload it to Blossom servers.
6. **Publish app listing**: Create and sign an app listing event (kind 373xx) with metadata tags including an `a` tag referencing the site manifest. If a previous listing exists and only auto-derived fields have changed, update only those fields.

When updating an existing app, the `created_at` of the new event MUST be greater than the previous event's `created_at`. If the current timestamp is not greater, the publisher SHOULD use `previous.created_at + 1`. The app version is the site manifest event's `created_at` field value.

### App configuration file

Publishers MAY include a `.well-known/napp.json` file in their application directory. This file is consumed by the publishing tool to populate listing metadata and is NOT included in the published site manifest.

The file MAY contain the following fields:

```jsonc
{
  "stallName": [["My App", "en"]],
  "stallSummary": [["Short description", "en"]],
  "stallDescription": [["Long description", "en"]],
  "stallIcon": [["data:image/png;base64,...", "US"], ["data:image/png;base64,..."]],
  "self": [["<hex-pubkey>"]],
  "country": ["US", "GB"],
  "category": [["utilities", ["office", "ai"]]],
  "hashtag": [["productivity", "Productivity"]],
  "keyArt": [["data:image/png;base64,...", "JP"], ["data:image/png;base64,..."]],
  "screenshot": [["data:image/png;base64,..."], ["data:image/png;base64,...", "BR"]]
}
```

### Deduplication and updates

Since app listing events are addressable events ([NIP-01](01.md)), relays MUST store only the most recent version (highest `created_at`) per `kind + pubkey + d` combination. Publishers SHOULD:

- Compare the current file manifest against the most recent site manifest before publishing. If identical, skip the update to avoid bumping the app version.
- Preserve manually-set metadata fields when auto-deriving values from HTML content.
- Re-upload existing events to relays that are missing them, rather than creating new events with identical content.
