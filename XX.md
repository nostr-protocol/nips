NIP-XX
======

DNS Delegation for NIP-05
------------------------

`draft` `optional`

## Abstract

This NIP defines an optional DNS-based delegation mechanism for [NIP-05](05.md).

It allows the operator of a domain to designate a separate HTTPS service as authoritative for NIP-05 lookups without requiring that service to control or modify the domain's primary web server.

The mechanism does not replace NIP-05, does not store Nostr identities in DNS, and does not change the NIP-05 response format.

DNS is used only to discover the HTTPS endpoint responsible for NIP-05 resolution.

After a successful DNS lookup establishes that no applicable delegation record exists, clients use ordinary NIP-05 resolution. DNS lookup failures are not evidence that delegation is absent.

## Motivation

NIP-05 identifiers intentionally resemble Internet email identifiers:

```
<local-part>@<domain>
```

NIP-05 currently resolves such an identifier by requesting:

```
https://<domain>/.well-known/nostr.json?name=<local-part>
```

This couples control of NIP-05 identity resolution to control of the web service operating at the domain.

For personal domains this may be acceptable. For organizations it is common for different services associated with the same domain to be operated by different providers.

For example:

- `www.example.com` may be operated by a web hosting provider;
- email for `example.com` may be operated by a mail provider;
- Nostr identity services may be operated by a Nostr provider.

Internet email solves the analogous problem using DNS delegation: a domain remains the user-visible namespace while DNS identifies the infrastructure responsible for providing the service.

NIP-05 currently lacks such an abstraction.

This creates particular difficulty for organizations wishing to issue NIP-05 identifiers matching existing email addresses without giving their Nostr identity provider control over their web infrastructure.

This NIP adds that missing delegation layer.

## Design Principles

The mechanism defined here follows several principles:

1. Existing NIP-05 remains valid and unchanged.
2. DNS contains no Nostr public keys or relay lists.
3. One DNS record delegates NIP-05 service for an entire domain.
4. The delegated server returns the existing NIP-05 JSON format.
5. Providers may serve NIP-05 for many independent domains.
6. Successful DNS lookups establishing absence of delegation lead to ordinary NIP-05 resolution.
7. DNSSEC can authenticate the delegation independently of the domain's web infrastructure.

## DNS Record

A domain MAY publish a TXT record at:

```
_nip05.<domain>
```

For example:

```
_nip05.example.com. TXT "v=nip05-1; target=nip05.provider.example"
```

The record consists of semicolon-separated fields. The parsing and selection rules below define which records are applicable and valid.

### Required fields

`v`

Protocol version. For this specification it MUST be:

```
nip05-1
```

`target`

The hostname of the HTTPS service responsible for NIP-05 resolution.

The target MUST be a DNS hostname.

It MUST NOT contain a URL scheme, port, path, query string, fragment, user information, or IP address literal.

### Parsing and record selection

For each TXT resource record, clients MUST concatenate its character-strings in wire order without inserting spaces. Character-strings belonging to different resource records MUST NOT be concatenated. Quotation marks used in DNS zone-file presentation are not part of the field values.

Clients MUST split the concatenated value at semicolons and trim ASCII spaces and tabs from each field. A record is applicable to this version if its first field is exactly `v=nip05-1`. Other records, including records for other versions, MUST be ignored. Matching is case-sensitive and uses the entire first field: `v=nip05-10` does not match.

Clients MUST count applicable records before validating their remaining fields. More than one applicable record is invalid, even if only one of those records is otherwise well formed.

For a sole applicable record:

- Each nonempty field MUST contain a nonempty field name and a nonempty value separated by the first `=`. Clients MUST trim ASCII spaces and tabs around the name and value.
- Field names MUST consist of lowercase ASCII letters, digits, or hyphens. Duplicate field names MUST cause rejection.
- The first field MUST be `v=nip05-1`, and exactly one `target` field MUST be present.
- One empty final field caused by a trailing semicolon MAY be present. Other empty fields MUST cause rejection.
- Unknown, well-formed fields MUST be ignored.
- `target` MUST satisfy the hostname rules below. A missing or malformed target MUST cause rejection, without fallback.

An incorrectly spelled or misplaced version marker is not applicable under these rules. Publishers MUST put the exact `v=nip05-1` marker first; clients cannot infer an intended delegation from arbitrary TXT content.

### Hostnames and identifier encoding

The original domain and target MUST be represented as ASCII DNS hostnames; internationalized labels MUST use valid IDNA A-labels. Each label MUST be 1 to 63 octets of ASCII letters, digits, or hyphens, with no leading or trailing hyphen. The hostname, excluding an optional terminal dot, MUST be at most 253 octets. IP address literals are not hostnames for this specification.

Clients MUST lowercase ASCII hostname letters and remove one optional terminal dot before constructing the DNS query or HTTPS URL. The resulting `_nip05.<domain>` query name MUST also fit within DNS name-length limits. User-interface conversion of Unicode input to A-labels is outside this specification.

The local part MUST satisfy NIP-05's `a-z0-9-_.` restriction, including its `_` root identifier convention. Clients MUST construct `name` and `domain` as separate URL query parameter values, rather than interpreting either value as URL syntax. The `domain` value MUST be the normalized original domain, never the delegated target or a DNS alias destination.

## Resolution

When resolving:

```
bob@example.com
```

a client using this extension MUST first query:

```
_nip05.example.com TXT
```

### Delegated resolution

If exactly one applicable record exists and it passes validation, the client MUST use its target and construct the request:

```
https://<target>/.well-known/nostr.json?name=bob&domain=example.com
```

For example, given:

```
_nip05.example.com. TXT "v=nip05-1; target=nip05.provider.example"
```

the request becomes:

```
https://nip05.provider.example/.well-known/nostr.json?name=bob&domain=example.com
```

The `domain` parameter identifies the original NIP-05 namespace being delegated. This allows one provider to serve multiple domains.

The server response MUST use the NIP-05 response format.

For example:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.example.com"
    ]
  }
}
```

All existing NIP-05 validation rules continue to apply, including matching the returned public key against the user's metadata event when verifying an identifier. A missing name, mismatched key, or invalid response is a failed lookup, not grounds for trying the original domain's endpoint.

Providers serving multiple domains MUST select mappings using the `domain` parameter and MUST NOT substitute another customer's namespace or a default namespace for an unknown domain.

### Fallback

Clients MUST use normal NIP-05 resolution only after a completed DNS lookup establishes that no applicable record exists. This includes NXDOMAIN, NOERROR with no TXT records (NODATA), and a TXT RRset with no applicable version marker, subject to the DNSSEC rules below:

```
https://<domain>/.well-known/nostr.json?name=<local-part>
```

Clients MUST NOT fall back after discovering an invalid or ambiguous delegation, a DNSSEC validation failure, SERVFAIL, REFUSED, a timeout, an incomplete response, or another DNS resolution error. These conditions fail the lookup. Retrying the DNS lookup is permitted; treating an error as absence is not.

Once a valid delegation is discovered, failure of the delegated service MUST NOT trigger fallback. This includes target address resolution errors, connection or TLS errors, HTTP errors or redirects, timeouts, and invalid NIP-05 responses.

| Lookup result | Required behavior |
| --- | --- |
| Completed lookup with no applicable record, including NXDOMAIN or NODATA | Ordinary NIP-05 resolution, subject to DNSSEC validation |
| Exactly one applicable, valid record | Use the delegated HTTPS endpoint |
| One malformed applicable record, or multiple applicable records | Fail; no fallback |
| DNSSEC validation failure or DNS resolution error | Fail; no fallback |
| Delegated HTTPS request or NIP-05 validation fails | Fail; no fallback |

A domain without delegation therefore retains ordinary NIP-05 resolution when DNS successfully establishes its absence. A temporary DNS failure can prevent resolution for clients using this extension even if the original HTTPS endpoint remains available.

A client that does not implement this NIP will likewise continue using existing NIP-05 resolution.

## Multiple Records

There MUST NOT be more than one applicable TXT record whose first field is:

```
v=nip05-1
```

at `_nip05.<domain>`.

If multiple such records exist, clients MUST treat DNS delegation as invalid.

Clients MUST NOT select the first record returned by DNS, because DNS RRset ordering is not authoritative and doing so would create ambiguous delegation semantics.

Clients MUST NOT fall back to ordinary NIP-05 resolution when delegation is invalid.

## DNS Aliases

Clients MUST use normal DNS alias resolution for CNAME and DNAME responses when querying `_nip05.<domain>`. Record selection applies to the final TXT RRset. Alias loops, resolution errors, or exceeded resource limits fail the lookup without fallback.

DNSSEC validation, when performed, MUST cover the alias chain as well as the final answer or denial of existence. An alias MUST NOT change the original domain used in the HTTPS `domain` parameter or the ordinary NIP-05 fallback URL.

## DNSSEC

Domains using NIP-05 DNS delegation SHOULD sign the relevant zone using DNSSEC.

Clients capable of DNSSEC validation SHOULD validate the `_nip05` response.

A DNSSEC-validated delegation provides cryptographic evidence that the delegation was published by the authoritative DNS namespace.

Clients MUST NOT interpret the mere presence of DNSKEY, DS, or RRSIG records as successful validation.

DNSSEC validation applies to both positive responses and negative responses establishing absence. A bogus result (a response that should validate but fails validation) MUST fail the lookup without fallback. If validation is attempted but its result is indeterminate, the lookup MUST fail without fallback; clients MUST NOT silently retry with validation disabled.

When relying on a validating resolver, clients MUST use a trusted resolver over an authenticated channel or a trusted local connection before treating its authenticated-data (AD) flag as evidence of validation. An AD flag received over an untrusted connection is not sufficient. The absence of AD does not by itself distinguish an unsigned answer from a validation failure; clients MUST also honor resolver error responses and MUST NOT disable validation to recover from them.

DNSSEC is recommended, not required by this NIP. Clients MAY accept insecure (unsigned) answers, or answers from a non-validating resolver, but MUST NOT describe those answers as DNSSEC-authenticated. A client performing validation MUST NOT reclassify a bogus or indeterminate result as insecure to continue resolution.

DNSSEC authenticates the delegation. HTTPS authenticates and protects communication with the delegated service.

Without authenticated DNS, an attacker able to forge a DNS answer can substitute a target hostname they control and obtain a valid TLS certificate for that hostname. Successful HTTPS authentication of that target does not prove authorization by the original domain. An attacker may also forge the absence of a delegation and induce ordinary NIP-05 fallback. The strict failure rules prevent fallback on detected errors; they cannot prevent these attacks on unauthenticated answers.

## Web Clients and DNS-over-HTTPS

Browser-based applications may not have access to the operating system's DNS resolver.

Such clients MAY query `_nip05.<domain>` using DNS-over-HTTPS.

A client using a third-party DNS-over-HTTPS resolver should be aware that this exposes the queried domain to that resolver.

Implementations unable or unwilling to perform DNS lookups MAY continue using ordinary NIP-05 resolution without enabling this extension. Once a lookup uses this extension, its error and fallback rules apply; a failed DNS lookup MUST NOT be treated as a reason to switch to ordinary NIP-05 resolution.

DNS-over-HTTPS protects communication with the chosen resolver; it does not itself prove that the resolver validates DNSSEC or that a response is DNSSEC-authenticated. Browser clients need a resolver API that exposes DNS response status and, when relying on resolver validation, authentication state. A transport or API failure MUST NOT be interpreted as an empty TXT answer.

Delegated endpoints SHOULD serve `Access-Control-Allow-Origin: *`, as described by NIP-05, so browser clients can read their responses. A browser CORS failure is a failed delegated request and MUST NOT trigger fallback.

This NIP is therefore an optional extension and does not make DNS resolution a requirement for all Nostr clients.

## Security Considerations

### Delegation is authoritative

Publishing:

```
_nip05.example.com. TXT "v=nip05-1; target=nip05.provider.example"
```

authorizes `nip05.provider.example` to return NIP-05 mappings for `example.com`.

Compromise of the DNS control plane can therefore result in compromise of NIP-05 mappings.

Domains SHOULD use DNSSEC and protect access to DNS management accordingly.

### HTTPS remains required

Delegated endpoints MUST use HTTPS.

Clients MUST perform normal TLS certificate validation for the delegated hostname.

DNS delegation does not replace HTTPS authentication.

### Redirects

As required by NIP-05, delegated endpoints MUST NOT return HTTP redirects, and clients MUST NOT follow them. A redirect fails the lookup without fallback.

This NIP does not change NIP-05 redirect semantics.

### DNS rebinding and private addresses

Automated resolvers, indexers, and server-side implementations SHOULD reject loopback, link-local, private, and other non-public destination addresses, including equivalent IPv4-mapped IPv6 forms. Implementations SHOULD check the address actually used for each connection and prevent a second DNS resolution from bypassing an earlier address check. A blocked destination fails the lookup without fallback.

A DNS delegation record MUST NOT be assumed safe merely because the target is syntactically valid.

### Resource limits

Implementations SHOULD impose reasonable limits on DNS resolution time, alias-chain length, TXT response size, HTTP request time, and HTTP response size. Exceeding a limit fails the lookup without fallback.

### Delegation is not endorsement

The presence of a delegation record indicates only which service the domain has designated to answer NIP-05 requests.

It does not imply that the delegated provider, returned Nostr identity, or associated relays are trustworthy beyond the semantics already provided by NIP-05.

## Examples

### Existing NIP-05 domain

A completed DNS lookup establishes that no applicable delegation record exists.

Client requests:

```
https://example.com/.well-known/nostr.json?name=bob
```

No behavior changes.

### Delegated organizational domain

DNS:

```
_nip05.example.org. TXT "v=nip05-1; target=nostr.identity-provider.example"
```

Identifier:

```
alice@example.org
```

Client requests:

```
https://nostr.identity-provider.example/.well-known/nostr.json?name=alice&domain=example.org
```

The provider returns an ordinary NIP-05 response.

The website at `example.org` requires no modification for clients using this extension. Clients using only NIP-05 still require the original domain's HTTPS endpoint.

### Provider serving multiple organizations

DNS:

```
_nip05.example.org. TXT "v=nip05-1; target=nip05.provider.example"

_nip05.example.net. TXT "v=nip05-1; target=nip05.provider.example"
```

Requests become:

```
https://nip05.provider.example/.well-known/nostr.json?name=alice&domain=example.org

https://nip05.provider.example/.well-known/nostr.json?name=bob&domain=example.net
```

The provider selects the appropriate namespace using the `domain` parameter.

## Rationale

### Why not publish individual identities in DNS?

Doing so would require one DNS record per identity, complicate operation for providers serving large numbers of users, and duplicate information already represented by the NIP-05 JSON response.

NIP-05 also supports associated relay information.

DNS is therefore used only for service discovery and delegation.

### Why TXT?

TXT records are widely deployable and allow the delegation mechanism to be introduced without requiring allocation and deployment of a new DNS resource-record type.

The underscored `_nip05` owner name separates these records from ordinary domain TXT records.

### Why DNS rather than HTTP redirects?

HTTP redirects still require control or cooperation from the web service operating the original domain.

DNS delegation allows the domain operator to assign NIP-05 service independently of its website.

This mirrors the separation of service identity from service infrastructure used elsewhere on the Internet.

### Why DNS first?

The presence of `_nip05.<domain>` explicitly states that the domain has delegated NIP-05 resolution.

Querying the designated service first avoids making delegation dependent upon failure of an unrelated web server.

When a completed DNS lookup establishes that no applicable delegation exists, resolution falls back to NIP-05. A detected failure cannot override a discovered delegation or establish its absence.

## Backwards Compatibility

This NIP requires no changes to existing NIP-05 deployments.

Existing clients continue resolving:

```
https://<domain>/.well-known/nostr.json?name=<local-part>
```

Clients implementing this NIP gain an additional DNS-based discovery step.

Domains may therefore deploy DNS delegation incrementally without invalidating existing NIP-05 infrastructure.

DNS delegation alone does not make an identifier resolvable by older clients. Domains that need those clients to continue resolving their identifiers MUST maintain the original NIP-05 HTTPS endpoint and SHOULD keep its mappings consistent with the delegated service. If the two endpoints disagree, older clients and clients using this extension can obtain different mappings.

This extension changes failure behavior for clients that enable it: DNS errors and discovered-but-invalid delegations fail the lookup even when the original HTTPS endpoint is reachable. It does not change the behavior of clients that use only NIP-05.
