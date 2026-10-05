NIP-DB
======

Domain Service Bindings
-----------------------

`draft` `optional`

This NIP defines addressable events that bind an Internet domain name to a
Nostr public key that serves it, so that clients can reach a domain's
services through key-addressed overlay networks (such as
[fips](https://github.com/jmcorgan/fips), where a public key *is* a routable
IPv6 address) with or without access to the legacy DNS. The events replace
the DNS `TXT` record described below when DNS is unreachable and are
verified against it when it is.

Kind numbers are proposed in
[registry-of-kinds](https://github.com/nostr-protocol/registry-of-kinds/pull/16),
next to fips's overlay advert (`37195`). Reference implementation:
[fips-pub-domains](https://github.com/fr34aky/fips-pub-domains) (a resolver
daemon for desktops, the domain server, an operator tool) and
[fips2go](https://github.com/fr34aky/fips2go) (the Android client).

## Kind 37197: Domain Claim

Published by the key that serves the domain. Addressable; `d` is the domain
in lowercase, without trailing dot, ASCII (IDNs in A-label form).

```jsonc
{
  "kind": 37197,
  "pubkey": "<server pubkey>",
  "tags": [
    ["d", "example.org"],
    ["service", "fips-dns", "5355"],                 // service name, port
    ["dnssec", "<base64 RFC 9102 chain>"]             // optional
  ],
  "content": ""
}
```

- `service`: the service the author offers for the domain and the port it
  listens on, on the author's overlay address. `fips-dns` is a DNS server
  answering names under the domain over the overlay (see "Resolution"). Other
  services MAY be added; a claim MAY carry several `service` tags.
- `dnssec` (optional): the `_<service>.<domain> TXT` RRset together with its
  RRSIG chain to the root, serialized as in RFC 9102 §3 (a sequence of
  RRsets in wire format, base64). It lets a client verify the binding without
  querying DNS.

**A claim proves only that the author agreed to serve the domain.** It does
not prove the author controls the domain. Any key can publish a claim for
any domain; clients MUST NOT act on a claim alone (see "Verification").

## Kind 37198: Binding Attestation

Published by a third party (a "witness") that verified a claim.

```jsonc
{
  "kind": 37198,
  "pubkey": "<witness pubkey>",
  "tags": [
    ["d", "example.org"],
    ["p", "<server pubkey>"],
    ["method", "dnssec"],          // "dnssec" | "dns"
    ["verified_at", "<unix seconds>"]
  ],
  "content": ""
}
```

An attestation is worth only the trust the reader places in the witness.
Clients SHOULD require attestations from `k` witnesses they configured, and
MUST NOT accept attestations from arbitrary keys.

## Kind 37199: Zone Record

Published by the server: the names under the domain and the keys that serve
them, so that a client can resolve while the server is unreachable.

```jsonc
{
  "kind": 37199,
  "pubkey": "<server pubkey>",
  "tags": [
    ["d", "example.org"],
    ["name", "www", "<pubkey>"],
    ["name", "git", "<pubkey>"],
    ["name", "*", "self"]
  ],
  "content": ""
}
```

Labels follow RFC 1123 hostname rules (≤ 63 characters, letters, digits,
hyphens). `*` is a wildcard for any otherwise unlisted name; `self` means
the author. At most 256 `name` tags; clients ignore larger events.

## DNS counterpart

A domain owner that wants the binding verifiable publishes, in the
legacy DNS:

```
_fips-dns.example.org.  TXT  "v=fips1 npub=<npub> port=5355"
```

The record is `TXT` rather than `SRV` because SRV targets are hostnames
that DNS hosters validate; a TXT record under an underscore-prefixed name
(as in ACME DNS-01 and DKIM) can be set anywhere. Its content is
space-separated `key=value` pairs: `v=fips1` first, `npub` (bech32 public
key) required, `port` optional (the claim's `service` tag is
authoritative), unknown keys ignored. Several records may name several
servers. Signing the zone with DNSSEC makes the verification cryptographic
and enables the `dnssec` tag.

## Verification

A client that receives one or more claims for a domain MUST classify each
before use, in this order of strength:

1. **DNS-verified** — the client fetched the `TXT` record itself and one
   of its `npub` values equals the claim's author (`dnssec` if validated,
   `dns` if not; unsigned answers SHOULD be confirmed by more than one
   resolver).
2. **Proof-verified** — the claim's `dnssec` tag validates against the DNS
   root trust anchor and names the author. Works offline.
3. **Attested** — at least `k` configured witnesses published kind 37198 for
   (domain, author).
4. **Pinned** — the client verified (1–3) earlier and stored the binding.
   A pinned binding is replaced only by a fresh verification of equal or
   stronger method.
5. **Unverified** — none of the above. Clients MUST NOT resolve through an
   unverified claim without an explicit, user-visible indication.

When several authors claim the same domain, the highest classification
wins; ties are unverified.

## Resolution

To resolve `www.example.org`, a client with a verified binding to
`<server pubkey>` sends an ordinary DNS query for `www.example.org` over the
overlay to the server's address and the claimed port, over UDP, retrying
over TCP if the answer is truncated. The server answers `CNAME
<npub>.fips.` for a name it serves and NXDOMAIN otherwise. Overlays other
than fips substitute their own key-to-name form.

If the server is unreachable, the client MAY use the newest kind 37199 from
the same author instead.

## Freshness and withholding

Relays can withhold a newer event but cannot forge one. Clients keep the
highest `created_at` seen per (kind, author, `d`) and ignore older
replacements, and ignore events whose `created_at` is more than 10 minutes
in the future.

## Privacy

Querying relays for every domain a user visits discloses the user's
browsing to relay operators. When the legacy DNS is reachable, clients
SHOULD query the `TXT` record first — the resolver that answers it is about
to resolve the name anyway — and query relays only for domains whose `TXT`
exists. When DNS is unreachable, clients query relays directly; users
SHOULD prefer relays they trust, including relays reachable only over the
overlay.

## Relationship to other NIPs

- NIP-05 maps a `user@domain` identifier to a pubkey over HTTPS — the
  opposite direction, and dependent on HTTPS and DNS.
- NIP-85 trusted assertions (kind 30384) could carry an attestation about a
  claim's address; this NIP keeps a dedicated kind so that witnesses need no
  NIP-85 vocabulary, but a future revision may fold 37198 into it.
