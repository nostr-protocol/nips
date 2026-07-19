NIP-PIP
=======

`Perfect IP Packets`
--------------------

`draft` `optional`

This NIP defines a packet-tree transport for arbitrary byte buffers. It is a
small, repair-oriented protocol built to carry recursive packet splitting,
parity repair, integrity tracking, and JSON wire encoding.

It is intentionally narrower than generic file metadata or torrent metadata.
Where [NIP-94](94.md) and [NIP-1063](1063.md) describe files, PIP describes the
packet tree that can reconstruct them.

## Motivation

Some data needs to survive partial relay availability, packet loss, or delayed
reconstruction. A sender may want to publish a file, a directory tree, or any
other byte buffer in a way that allows peers to recover missing chunks from
parity data.

PIP makes that possible by defining:

- a manifest event that describes the whole packet tree,
- one event per packet slice,
- a repair-request event for missing slices,
- JSON content shapes for the packet tree model.

## Relation to existing kinds

This NIP builds on established Nostr kind ranges:

- `78` / `30078` in [NIP-78](78.md) show that arbitrary application data can be
  stored in Nostr events.
- `1617` / `1618` in [NIP-34](34.md) show how larger structured artifacts can be
  announced and updated.
- `94` and `1063` describe file metadata, but not packet repair.

PIP uses its own application-specific kind family to avoid overloading those
generic formats.

## Example implementation

The sender can model the protocol with three data types:

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct PacketHeader {
    seq_num: u64,
    total_packets: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct ProtocolSlice {
    id: String,
    header: PacketHeader,
    data: Vec<u8>,
    is_parity: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct PacketManifest {
    root: String,
    sha256: String,
    size: u64,
    packets: u64,
    depth: u32,
    mtu: u64,
    encoding: &'static str,
    path: String,
}
```

Packetization can then emit one manifest plus a tree of data and parity slices:

```rust
fn build_manifest(bytes: &[u8], path: &str) -> PacketManifest {
    PacketManifest {
        root: "ROOT".to_string(),
        sha256: format!("{:x}", sha2::Sha256::digest(bytes)),
        size: bytes.len() as u64,
        packets: 63,
        depth: 5,
        mtu: 1460,
        encoding: "json",
        path: path.to_string(),
    }
}

fn encode_slice(slice: &ProtocolSlice) -> String {
    serde_json::to_string(slice).expect("valid PIP slice")
}
```

Wire examples:

```json
{
  "kind": 39078,
  "content": "{\"root\":\"ROOT\",\"sha256\":\"50f3...00f4\",\"size\":3000,\"packets\":63,\"depth\":5,\"mtu\":1460,\"encoding\":\"json\",\"path\":\"docs/example.bin\"}"
}
```

```json
{
  "kind": 39079,
  "content": "{\"id\":\"ROOT.0.0.0.0.0\",\"header\":{\"seq_num\":0,\"total_packets\":63},\"data\":[171,171,171],\"is_parity\":false}"
}
```

## Kind family

### `39078` — PIP Manifest

An addressable event describing one packet tree.

```jsonc
{
  "kind": 39078,
  "content": "{\"root\":\"ROOT\",\"sha256\":\"50f3...00f4\",\"size\":3000,\"packets\":63,\"depth\":5,\"mtu\":1460,\"encoding\":\"json\",\"path\":\"docs/example.bin\"}",
  "tags": [
    ["d", "<root-id>"],
    ["sha256", "<sender-sha256>"],
    ["size", "<original-byte-length>"],
    ["packets", "<total-packets>"],
    ["depth", "<tree-depth>"],
    ["mtu", "1460"],
    ["encoding", "json"],
    ["path", "<relative-path>"],
    ["t", "pip"],
    ["t", "manifest"]
  ]
}
```

The `d` tag MUST be stable for the payload. A sender SHOULD use the payload
hash or another collision-resistant root id. If the payload comes from a
directory walk, `path` SHOULD preserve the relative path from the walk root.

### `39079` — PIP Slice

A regular event carrying one packet slice.

```jsonc
{
  "kind": 39079,
  "content": "{\"id\":\"ROOT.0.0.0.0.0\",\"header\":{\"seq_num\":0,\"total_packets\":63},\"data\":[171,171,171],\"is_parity\":false}",
  "tags": [
    ["d", "<root-id>"],
    ["e", "<manifest-event-id>", "", "root"],
    ["seq", "<sequence-number>"],
    ["path", "<packet-id>"],
    ["type", "data"],
    ["encoding", "json"],
    ["t", "pip"],
    ["t", "slice"]
  ]
}
```

Parity slices use the same kind, but MUST set `is_parity` to `true` and SHOULD
set `type` to `parity`.

The `content` field MUST be the JSON serialization of the `ProtocolSlice`
structure. In Rust, that means the standard `serde_json` representation of the
struct, including `Vec<u8>` as an array of byte values.

### `39080` — PIP Repair Request

A request event describing missing packet ids.

```jsonc
{
  "kind": 39080,
  "content": "{\"want\":[\"ROOT.0.0.0.P\",\"ROOT.1.1.0.1.1\"],\"root\":\"<root-id>\",\"encoding\":\"json\"}",
  "tags": [
    ["d", "<root-id>"],
    ["e", "<manifest-event-id>", "", "request"],
    ["want", "<missing-packet-id>"],
    ["want", "<another-missing-packet-id>"],
    ["encoding", "json"],
    ["t", "pip"],
    ["t", "repair"]
  ]
}
```

Peers that have the requested slices SHOULD answer by publishing matching
`39079` slice events that reference the request via `e`.

## Reconstruction rules

1. Collect all `39079` slice events for the same `d` tag.
2. Order data slices by `seq`.
3. Reconstruct missing slices from parity when available.
4. Concatenate recovered leaf payloads in tree order.
5. Verify the reconstructed payload against the `sha256` in the manifest.

If all data slices are present, parity is not required for reconstruction. It
becomes useful when one or more slices are missing.

## JSON transport

PIP uses JSON because it is easy to inspect, proxy, and store in relays. A
packet slice on the wire is simply the JSON form of `ProtocolSlice`. The byte
array in `data` is transported as a JSON array of integers.

## Security considerations

- The manifest hash SHOULD be checked before reconstruction.
- Slices from different roots MUST NOT be mixed.
- A repair responder SHOULD only publish slices for data it already has.
- Consumers SHOULD reject malformed or truncated JSON content.

## Compatibility

PIP is compatible with general Nostr relay infrastructure because it uses
ordinary event kinds and JSON content. It does not require new transport
primitives, only new application semantics.