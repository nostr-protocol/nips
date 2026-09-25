# NIP WT. Nostr Web Tokens

`draft` `optional`

## Overview

A Nostr Web Token (NWT) is a signed Nostr event used to convey signed claims between parties on the web.

Claims are pieces of information asserted about a subject. A claim is identified by a name, and associated with one or more values.

A NWT is not a JSON Web Token (JWT), but adopts its semantics where applicable.

## Event

A NWT has a `kind 27519`, in reference to [REC-7519](https://datatracker.ietf.org/doc/html/rfc7519) that defines the JWT.

Claims are represented as `tags`, following JWT naming conventions and semantics where applicable. Claims that allow a single value MUST appear only once; claims that allow multiple values are represented by repeated tags.

### Example

```jsonc
{
    "id": <32-bytes hex-encoded sha256>,
    "pubkey": <32-bytes hex-encoded public key>,
    "created_at": <unix timestamp in seconds>,
    "kind": 27519,
    "tags": [
        ["aud", "blossom.example.com"],
        ["aud", "cdn.another.com"],
        ["aud", "cdn.last.one"],
        ["exp", "1710003600"],
        ["nbf", "1710000000"],
        ["action", "upload"],               // custom claim
        ["payload", "b1674191a...dsad"]     // custom claim
    ],
    "content": "upload bitcoin.pdf",
    "sig": <64-bytes hex-encoded signature>
}
```

### Registered Claims

| Claim     |   Tag  |   Status   | Type |     Cardinality     |
|-----------|--------|------------|------ | --------------------|
| Issuer | `iss` | Optional | string | single |
| Subject | `sub` | Optional | string | single |
| Audience | `aud` | Recommended | string | multi | 
| Issued At | `iat` | Optional | stringified timestamp* | single |
| Expiration | `exp` | Recommended | stringified timestamp* | single |
| Not Before | `nbf` | Optional | stringified timestamp* | single |

\* Timestamp values MUST be base-10 non-negative integer seconds since the Unix epoch. Verifiers SHOULD allow a small clock skew (e.g. ±60 seconds).

#### Issuer `iss`

The `iss` (issuer) claim identifies the entity that issued the
NWT.  
This tag is OPTIONAL. If not present, the issuer of the NWT is assumed to be the Nostr public key (`pubkey`) that signed the event.

#### Subject `sub`

The `sub` (subject) claim identifies the entity that is the subject of the NWT.  
This tag is OPTIONAL. If not present, the subject of the NWT is assumed to be the Nostr public key (`pubkey`) that signed the event.

#### Audience `aud`

The `aud` (audience) claim identifies the recipients that the NWT is
intended for.  
Recipients MAY be of various types, such as pubkeys, domain names or even specific endpoints. A verifier MUST reject a NWT if it doesn't identify itself with a value in the audience claim. The interpretation of "identify itself" is application-specific.  
This tag is OPTIONAL, but recommended. If not present, the audience of the NWT is assumed to be everyone, which may cause [security issues](#security-considerations).

#### Issued At `iat`

The `iat` (issued at) claim identifies the time at which the NWT was
issued.  
This tag is OPTIONAL. If not present, the issued timestamp is assumed to be the timestamp of the Nostr event (`created_at`). If present, verifiers MUST use `iat` instead of `created_at`.

#### Expiration `exp`

The `exp` (expiration) claim identifies the expiration time on
or after which the NWT MUST NOT be accepted for processing.  
This tag is OPTIONAL, but recommended. If not present, the expiration is assumed to never occur, which may cause [security issues](#security-considerations).

#### Not Before `nbf`

The `nbf` (not before) claim identifies the time before which the NWT
MUST NOT be accepted for processing.
This tag is OPTIONAL.

### Additional Claims

A producer and consumer of a NWT MAY agree to use additional claims (e.g. `roles`, `scope` etc.). These additional claims MUST be encoded as `tags`, however, their definition and intended use is application specific and is not defined here.


### Content

The `content` field SHOULD contain a human readable message intended to be displayed to the signer of the NWT, explaining its intended use. For example, `authorize deletion of fiat.pdf`.


## Validation Rules

A verifier MUST:

1. Verify the Nostr event id.
2. Verify the Nostr event signature.
3. Verify the event `kind` is `27519`
4. Enforce `exp`, `nbf`, and `aud` claims when present; apply default behaviors when absent.
5. Validate issuer trust (application-defined)


## Transport Encoding

A NWT MAY be transported using any non-destructive encoding.  
Its primary use, however, is transmission via an HTTP `Authorization` header using the `Nostr` scheme, where the token is encoded using `Base64URL` (URL-safe base 64) without padding.

Example:

```
Authorization: Nostr <base64url-no-padding-token>
```


## Security Considerations

NWTs are primarily intended for authentication and/or authorization purposes. Just like JWTs, they are bearer tokens; if a malicious actor is able to get a NWT, it may use it to impersonate the user.

Because of that, it is recommended to:

* Use short expiration times (e.g. 5 minutes)
* Restrict the audience for destructive operations to avoid [replay attacks](https://en.wikipedia.org/wiki/Replay_attack)
* Use the NWT event `id` if replay detection if needed
