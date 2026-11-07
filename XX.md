NIP-XX
======

DNS Delegation for NIP-05
------------------------

`draft` `optional`

## Abstract

This NIP defines an optional DNS-based delegation mechanism for [NIP-05](05.md).

It allows the operator of a domain to designate a separate HTTPS service for NIP-05 lookups when the original domain's endpoint returns HTTP 404 Not Found or HTTP 410 Gone.

The mechanism does not replace NIP-05, does not store Nostr identities in DNS, and does not change the NIP-05 response format.

DNS is used only to discover the HTTPS endpoint responsible for NIP-05 resolution.

Clients attempt ordinary NIP-05 resolution first. Only a 404 or 410 response triggers DNS delegation discovery; other failures do not.

## Motivation

NIP-05 resolves `<local-part>@<domain>` by requesting:

```
https://<domain>/.well-known/nostr.json?name=<local-part>
```

Organizations commonly use separate providers for web, email, and identity services. Requiring NIP-05 to be served by the domain's web infrastructure makes it difficult for an independent Nostr identity provider to serve identifiers under that domain.

This NIP adds DNS-based service delegation when the original endpoint reports that the requested resource is absent.

## Design Principles

The mechanism defined here follows several principles:

1. Existing NIP-05 remains valid and unchanged.
2. DNS contains no Nostr public keys or relay lists.
3. One DNS record delegates NIP-05 service for an entire domain.
4. The delegated server returns the existing NIP-05 JSON format.
5. Providers may serve NIP-05 for many independent domains.
6. Ordinary NIP-05 takes precedence; only HTTP 404 or 410 triggers DNS delegation discovery.
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

### Ordinary NIP-05 first

A client using this extension MUST first attempt ordinary NIP-05 resolution. For `bob@example.com`, it requests:

```
https://example.com/.well-known/nostr.json?name=bob
```

If ordinary NIP-05 succeeds, the client MUST use that result and MUST NOT query `_nip05` for this lookup.

An HTTP 404 Not Found or HTTP 410 Gone response from this original HTTPS endpoint MUST trigger DNS delegation discovery; no other status may do so. Clients MUST perform normal TLS certificate validation for the original domain and MUST NOT follow redirects. The trigger is the HTTP status, not the content of an error page.

For this extension, 404 and 410 signal absence of the requested NIP-05 resource. A 410 can explicitly signal removal of a previously served resource, including during migration to delegation. The signal applies to the requested URI, including its `name` parameter; it does not prove that the domain serves no other names.

Timeouts, connection or TLS failures, HTTP 5xx, HTTP 401/403, redirects, malformed JSON, a missing requested name in valid NIP-05 JSON, public-key mismatches, and other NIP-05 validation failures MUST NOT trigger DNS discovery. Any response status other than 404 or 410 MUST NOT trigger DNS discovery. Existing NIP-05 validation rules continue to determine whether ordinary resolution succeeds.

### DNS discovery after 404 or 410

After receiving 404 or 410 from the original endpoint, the client MUST query:

```
_nip05.example.com TXT
```

The query always uses the original identifier's domain. Record selection, DNSSEC, alias handling, and resource limits follow the rules in this NIP.

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

### Failure handling

If a completed DNS lookup establishes that no applicable record exists, the overall lookup fails: the original endpoint has already returned 404 or 410 and there is no delegated alternative. This includes NXDOMAIN, NOERROR with no TXT records (NODATA), and a TXT RRset with no applicable version marker, subject to DNSSEC validation.

Invalid or ambiguous delegation, DNSSEC validation failures, SERVFAIL, REFUSED, timeouts, incomplete responses, and other DNS resolution errors MUST fail the lookup. They MUST NOT be interpreted as absence. Retrying DNS resolution is permitted; returning to the original HTTPS endpoint as a fallback is not.

Once a valid delegation is discovered, failure of the delegated service MUST fail the lookup without returning to the original endpoint or attempting further delegation. This includes target address resolution errors, connection or TLS errors, HTTP errors (including 404 and 410), redirects, timeouts, and invalid NIP-05 responses.

| Lookup result | Required behavior |
| --- | --- |
| Ordinary NIP-05 succeeds | Use its result; do not query `_nip05` |
| Original endpoint returns HTTP 404 or 410 | Query `_nip05.<domain>` |
| Ordinary NIP-05 otherwise fails | Fail; do not query `_nip05` |
| DNS finds exactly one applicable, valid delegation | Use the delegated HTTPS endpoint |
| DNS successfully finds no applicable delegation | Fail |
| DNS delegation is malformed or ambiguous | Fail |
| DNS resolution or DNSSEC validation fails | Fail |
| Delegated HTTPS request or NIP-05 validation fails | Fail; do not return to the original endpoint |

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

DNSSEC validation, when performed, MUST cover the alias chain as well as the final answer or denial of existence. An alias MUST NOT change the original domain used in the HTTPS `domain` parameter or the identity being resolved.

## DNSSEC

Domains using NIP-05 DNS delegation SHOULD sign the relevant zone using DNSSEC.

Clients capable of DNSSEC validation SHOULD validate the `_nip05` response.

A DNSSEC-validated delegation provides cryptographic evidence that the delegation was published by the authoritative DNS namespace.

Clients MUST NOT interpret the mere presence of DNSKEY, DS, or RRSIG records as successful validation.

DNSSEC validation applies to both positive responses and negative responses establishing absence. A bogus result (a response that should validate but fails validation) MUST fail the lookup without fallback. If validation is attempted but its result is indeterminate, the lookup MUST fail without fallback; clients MUST NOT silently retry with validation disabled.

When relying on a validating resolver, clients MUST use a trusted resolver over an authenticated channel or a trusted local connection before treating its authenticated-data (AD) flag as evidence of validation. An AD flag received over an untrusted connection is not sufficient. The absence of AD does not by itself distinguish an unsigned answer from a validation failure; clients MUST also honor resolver error responses and MUST NOT disable validation to recover from them.

DNSSEC is recommended, not required by this NIP. Clients MAY accept insecure (unsigned) answers, or answers from a non-validating resolver, but MUST NOT describe those answers as DNSSEC-authenticated. A client performing validation MUST NOT reclassify a bogus or indeterminate result as insecure to continue resolution.

DNSSEC authenticates the delegation. HTTPS authenticates and protects communication with the delegated service.

After the original endpoint returns 404 or 410, an attacker able to forge an unauthenticated DNS answer can substitute a target hostname they control and obtain a valid TLS certificate for that hostname. Successful HTTPS authentication of that target does not prove authorization by the original domain. Forging the absence of a delegation can instead cause the lookup to fail. These attacks do not override a successful ordinary NIP-05 lookup, which does not consult `_nip05`.

## Web Clients and DNS-over-HTTPS

Browser clients do not need DNS access for successful ordinary NIP-05 lookups. Only clients implementing this extension, after observing HTTP 404 or 410 from the original endpoint, need to query `_nip05.<domain>`. Browser JavaScript MAY use DNS-over-HTTPS for that lookup.

A client using a third-party DNS-over-HTTPS resolver should be aware that this exposes the queried domain to that resolver. DNS-over-HTTPS protects communication with the chosen resolver; it does not itself prove that the resolver validates DNSSEC or that a response is DNSSEC-authenticated. The resolver API must expose DNS response status and, when relying on resolver validation, authentication state. A transport or API failure MUST NOT be interpreted as an empty TXT answer.

The original endpoint's 404 or 410 response must be readable under browser CORS rules for JavaScript to observe the fallback signal. Operators supporting browser clients SHOULD include `Access-Control-Allow-Origin: *` on those responses. A CORS failure or opaque response MUST NOT be interpreted as 404 or 410 and MUST NOT trigger DNS discovery.

Delegated endpoints SHOULD likewise serve `Access-Control-Allow-Origin: *`, as described by NIP-05. A CORS failure at the delegated endpoint fails the lookup.

Implementations unable or unwilling to perform DNS lookups MAY continue using ordinary NIP-05 without enabling this extension.

## Security Considerations

### Authority and delegation

Publishing:

```
_nip05.example.com. TXT "v=nip05-1; target=nip05.provider.example"
```

authorizes `nip05.provider.example` to return NIP-05 mappings for `example.com` after the original endpoint returns 404 or 410. It does not override a successful ordinary NIP-05 response.

Compromise of the DNS control plane can therefore compromise mappings obtained through delegation. Control of the original HTTPS endpoint still allows its operator to serve mappings that take precedence; DNSSEC does not remove that authority.

Domains SHOULD use DNSSEC and protect access to DNS management accordingly.

### HTTPS remains required

Delegated endpoints MUST use HTTPS.

Clients MUST perform normal TLS certificate validation for the delegated hostname.

DNS delegation does not replace HTTPS authentication.

### Redirects

As required by NIP-05, both the original and delegated endpoints MUST NOT return HTTP redirects, and clients MUST NOT follow them. A redirect from the original endpoint MUST NOT trigger DNS discovery; a redirect from the delegated endpoint fails the lookup.

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

Client first requests:

```
https://example.com/.well-known/nostr.json?name=bob
```

The response satisfies NIP-05. The client uses it without querying `_nip05`, regardless of whether a delegation record exists.

### Delegated organizational domain

DNS:

```
_nip05.example.org. TXT "v=nip05-1; target=nostr.identity-provider.example"
```

Identifier:

```
alice@example.org
```

Client first requests `https://example.org/.well-known/nostr.json?name=alice`. It receives HTTP 404 or 410, queries `_nip05.example.org`, and then requests:

```
https://nostr.identity-provider.example/.well-known/nostr.json?name=alice&domain=example.org
```

The provider returns an ordinary NIP-05 response.

The original endpoint must return 404 or 410, with CORS access for browser clients. A website already returning such responses needs no special routing to the identity provider. Clients using only NIP-05 cannot resolve this delegated identifier.

### Provider serving multiple organizations

DNS:

```
_nip05.example.org. TXT "v=nip05-1; target=nip05.provider.example"

_nip05.example.net. TXT "v=nip05-1; target=nip05.provider.example"
```

After the respective original endpoints return 404 or 410 and DNS discovery succeeds, the delegated requests are:

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

NIP-05 prohibits redirects. DNS delegation lets the domain operator select a provider without configuring a redirect or proxy at the website, provided the original endpoint returns 404 or 410. It cannot bypass a website that returns other statuses or blocks browser access to those responses.

### Why existing NIP-05 takes precedence

The original HTTPS endpoint corresponds to the domain in the identifier, and a valid response is authoritative under NIP-05. Keeping it first preserves existing resolution and avoids DNS/DoH lookups in the normal case. Delegation is consulted only when that endpoint explicitly returns 404 or 410.

## Backwards Compatibility

Existing clients continue using ordinary NIP-05. Clients implementing this extension use the same result when ordinary resolution succeeds and do not consult `_nip05`. Publishing a delegation record does not override an existing successful NIP-05 response.

Only HTTP 404 or 410 enables the additional discovery step. Other failures, including a missing name or mismatched public key in the original response, cannot be bypassed through delegation. DNS errors therefore do not affect an otherwise successful ordinary NIP-05 lookup.

Delegation alone does not make an identifier resolvable by older clients. Returning 404 or 410 to migrate an identifier to delegation means clients without this extension cannot resolve it. Domains that need older clients to keep resolving an identifier must continue serving a valid ordinary NIP-05 response for it.
