NIP-XX
======

Pubkey Static Websites
----------------------

`draft` `optional`

This nip describes a method by which static websites can be hosted under public keys using specialized host servers

### Site Manifest Definition

A site manifest event MUST be a replaceable or an addressable event as defined in [NIP-01](01.md). There are two types of site manifest event kinds:

- **Root site**: Uses kind `15128` and MUST NOT include a `d` tag. This is a single replaceable event per pubkey and serves as the root site for the pubkey.
- **Named sites**: Uses kind `35128` and MUST have a `d` tag containing the site identifier. These can be smaller websites under a pubkey and can be throught of as sub-domains.

The event MUST include one or more `path` tags that map absolute paths to sha256 hashes. Each `path` tag MUST have the format `["path", "/absolute/path", "sha256hash"]` where:
- The first element is the literal string `"path"`
- The second element is an absolute path ending with a filename and extension
- The third element is the sha256 hash of the file that will be served under this path

The event MAY include `server` tags that hint at which blossom servers can be used to find the blobs associated with the hashes.

The event MAY include `title` and `description` tags that provide simple site information.

The site icon SHOULD be provided by setting the `/favicon.ico` path in the manifest.

For example, a root site manifest:

```jsonc
{
  "content": "",
  "created_at": 1727373475,
  "id": "5324d695ed7abf7cdd2a48deb881c93b7f4e43de702989bbfb55a1b97b35a3de",
  "kind": 15128,
  "pubkey": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
  "sig": "f4e4a9e785f70e9fcaa855d769438fea10781e84cd889e3fcb823774f83d094cf2c05d5a3ac4aebc1227a4ebc3d56867286c15a6df92d55045658bb428fd5fb5",
  "tags": [
    // path mappings: absolute path -> sha256 hash
    ["path", "/index.html", "186ea5fd14e88fd1ac49351759e7ab906fa94892002b60bf7f5a428f28ca1c99"],
    ["path", "/about.html", "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"],
    ["path", "/favicon.ico", "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"],
    // optional: blossom server hints
    ["server", "https://blossom.example.com"],
    // optional: site metadata
    ["title", "My Nostr Site"],
    ["description", "A static website hosted on Nostr"]
  ]
}
```

And a named site manifest:

```jsonc
{
  "content": "",
  "created_at": 1727373475,
  "id": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "kind": 35128,
  "pubkey": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
  "sig": "f4e4a9e785f70e9fcaa855d769438fea10781e84cd889e3fcb823774f83d094cf2c05d5a3ac4aebc1227a4ebc3d56867286c15a6df92d55045658bb428fd5fb5",
  "tags": [
    // site identifier
    ["d", "blog"],
    // path mappings: absolute path -> sha256 hash
    ["path", "/index.html", "186ea5fd14e88fd1ac49351759e7ab906fa94892002b60bf7f5a428f28ca1c99"],
    ["path", "/post.html", "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"],
    // optional: blossom server hints
    ["server", "https://blossom.example.com"],
    // optional: site metadata
    ["title", "My Blog"],
    ["description", "A blog hosted on Nostr"]
  ]
}
```

### Host server implementation

A host server is a HTTP server that is responsible for serving pubkey static websites

#### Resolving Pubkeys

Host servers may choose to resolve a pubkey (and identifier for named sites) however they see fit, NIP-05 ids, `npub` subdomains, hardcoded names, DNS records, or a single pubkey for the server

However it is recommended to use the URL format `[identifier].<npub>.nsite-host.com` where:
- The root site uses `<npub>.nsite-host.com` (no identifier)
- Named sites use `[identifier].<npub>.nsite-host.com` as subdomains under the npub site

This allows the host server to serve all pubkey sites while still keeping the pubkey in the URL, and enables multiple sites per pubkey through identifiers.

If the host server is using `npub` subdomains it MAY serve anything at its own root domain `nsite-host.com` ( a landing page for example )

Example subdomains:
- Root site: `npub10phxfsms72rhafrklqdyhempujs9h67nye0p67qe424dyvcx0dkqgvap0e.nsite-host.com`
- Named site: `blog.npub10phxfsms72rhafrklqdyhempujs9h67nye0p67qe424dyvcx0dkqgvap0e.nsite-host.com`

#### Resolving Paths

When the host server receives a request and is able to determine the pubkey and identifier, it should fetch the users `10002` [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) relay list and lookup the site manifest event for the pubkey and identifier.

The host server MUST determine the identifier from the request. If no identifier is found in the request, it MUST query for the root site manifest.

The host server should query for the site manifest event:

```jsonc
// For root site (kind 15128, no d tag)
{ "kinds": [15128], "authors": [<pubkey>] }

// For named site (kind 35128, with d tag)
{ "kinds": [35128], "authors": [<pubkey>], "#d": [<identifier>] }
```

Once the site manifest event is found, the host server MUST extract the path-to-hash mappings from the `path` tags in the manifest. The host server should look for a `path` tag where the second element matches the requested path.

If the request path does not end with a filename the host server MUST fallback to using the `index.html` filename

For example: `/` -> `/index.html` or `/blog/` -> `/blog/index.html`

#### Resolving Files

Once the host server has found the site manifest event and located the matching `path` tag for the requested path, it should use the sha256 hash defined in the third element of the `path` tag to retrieve the file.

The host server SHOULD prioritize using `server` tags from the site manifest event as hints for which blossom servers to query. If the manifest includes `server` tags, the host server SHOULD attempt to retrieve the file from those servers first.

If the pubkey has a `10063` [BUD-03 user servers](https://github.com/hzrd149/blossom/blob/master/buds/03.md) event the server MUST attempt to retrieve the file from the listed servers using the path defined in [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md#get-sha256---get-blob)
If a pubkey does not have a `10063` event and no `server` tags are found in the manifest, the host server MUST respond with a status code 404

The host server MUST forward the `Content-Type`, and `Content-Length` headers from the Blossom server. If none are defined the host server MAY set `Content-Type` from the file extension in the requested path

#### Handling Not Found

If a host server is unable to find a site manifest event or a matching `path` tag for the requested path, it MUST use `/404.html` as a fallback path

### Legacy Support

Kind `34128` is marked as legacy/deprecated. This kind was used for individual static file events where each file was represented by a separate event with a `d` tag for the path and an `x` tag for the sha256 hash.

Host servers MAY still support kind `34128` for backward compatibility with existing sites, but new sites SHOULD use kind `15128` (root site manifest) or kind `35128` (named site manifest) instead.

Read the [legacy version](https://github.com/hzrd149/nips/blob/41e77b45a1e8a8d170097e363f7d7254797cc5c5/nsite.md) for more details.
