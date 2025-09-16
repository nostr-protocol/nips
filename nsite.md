NIP-XX
======

Pubkey Static Websites
----------------------

`draft` `optional`

This nip describes a method by which static websites can be hosted under public keys using specialized host servers

### Static file definition

A static file event uses the kind `34128` and MUST have a `d` and `x` tag

The `d` tag MUST be an absolute path ending with a filename and extension
The `x` tag MUST be the sha256 hash of the file that will be served under this path

For example:

```jsonc
{
  "content": "",
  "created_at": 1727373475,
  "id": "5324d695ed7abf7cdd2a48deb881c93b7f4e43de702989bbfb55a1b97b35a3de",
  "kind": 34128,
  "pubkey": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
  "sig": "f4e4a9e785f70e9fcaa855d769438fea10781e84cd889e3fcb823774f83d094cf2c05d5a3ac4aebc1227a4ebc3d56867286c15a6df92d55045658bb428fd5fb5",
  "tags": [
    // absolute path for the file
    ["d", "/index.html"],
    // sha256 hash of the file to be served
    ["x", "186ea5fd14e88fd1ac49351759e7ab906fa94892002b60bf7f5a428f28ca1c99"]
  ]
}
```

### Host server implementation

A host server is a HTTP server that is responsible for serving pubkey static websites

#### Resolving Pubkeys

Host servers may choose to resolve a pubkey however they see fit, NIP-05 ids, `npub` subdomains, hardcoded names, DNS records, or a single pubkey for the server

However it is recommended to resolve pubkeys using a NIP-19 encoded pubkey `npub1...` as the subdomain. since this allows the host server to serve all pubkey sites while still keeping the pubkey in the URL

If the host server is using `npub` subdomains it MAY serve anything at its own root domain `nsite-host.com` ( a landing page for example )

Example subdomain `npub10phxfsms72rhafrklqdyhempujs9h67nye0p67qe424dyvcx0dkqgvap0e.npub-sites.com`

#### Resolving Paths

When the host server receives a request and is able to determine the pubkey. it should fetch the users `10002` [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) relay list and lookup `34128` events with a `d` tag matching the requested path

```jsonc
// For /index.html
{ "kinds": [34128], "authors": [<pubkey>], "#d": ["/index.html"] }
```

If the request path does not end with a filename the host server MUST fallback to using the `index.html` filename

For example: `/` -> `/index.html` or `/blog/` -> `/blog/index.html`

#### Resolving Files

Once the host server has found the `34128` event for the pubkey and path it should use the sha256 hash defined in the `x` tag to retrieve the file

If the pubkey has a `10063` [BUD-03 user servers](https://github.com/hzrd149/blossom/blob/master/buds/03.md) event the server MUST attempt to retrieve the file from the listed servers using the path defined in [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md#get-sha256---get-blob)
If a pubkey does not have a `10063` event the host server MUST respond with a status code 404

The host server MUST forward the `Content-Type`, and `Content-Length` headers from the Blossom server. If none are defined the host server MAY set `Content-Type` from the file extension in the requested path

#### Handling Not Found

If a host server is unable to find a `34128` event matching the requested path it MUST use `/404.html` as a fallback path
