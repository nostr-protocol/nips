NIP-FC
======

Maven Repositories
------------------

`draft` `optional`

This NIP defines how to publish Maven artifacts (jars, aars, klibs, POMs, Gradle module metadata, sources, javadoc, signatures) as [Blossom][] blobs pinned by signed events, so that any client can serve them as a regular Maven repository without a central registry.

## Overview

- Every file of a release is a Blossom blob, hosted on the publisher's servers ([BUD-03][], `kind:10063`).
- A **manifest** blob lists every file of the release with its sha256 and size.
- A **release** (`kind:3071`, regular) pins the manifest. Releases are immutable.
- A **snapshot** (`kind:33071`, addressable) pins the manifest of a `-SNAPSHOT` version and is replaced by newer builds.

## Manifest

A JSON object serialized with [RFC 8785][] (sorted keys, no whitespace) so the same files always produce the same hash:

```json
{"coordinate":"com.example:lib:1.0.0","files":{"lib-jvm/1.0.0/lib-jvm-1.0.0.jar":{"sha256":"<hex>","size":1234},"lib/1.0.0/lib-1.0.0.module":{"sha256":"<hex>","size":567}},"schema":1}
```

- `coordinate`: `groupId:artifactId:version` of the release's root module.
- `files`: keyed by `<artifactId>/<version>/<file name>`, the path below the group directory of a Maven repository. One release MAY span several modules sharing a group and version (a Kotlin Multiplatform library publishes `lib`, `lib-jvm`, `lib-iosarm64`, …).
- `schema`: `1`. Clients MUST refuse higher values and ignore unknown fields.

Checksum files (`.md5`, `.sha1`, `.sha256`, `.sha512`) and `maven-metadata.xml` are not listed: clients compute them.

## Release

```jsonc
{
  "kind": 3071,
  "content": "",
  "tags": [
    ["j", "com.example:lib"],                        // one per module in the manifest, root first
    ["j", "com.example:lib-jvm"],
    ["v", "1.0.0"],                                  // version, as Maven spells it
    ["manifest", "<manifest sha256>", "<size>"],
    ["x", "<manifest sha256>"],
    ["x", "<sha256 of a primary artifact>"],         // main jars/aars/klibs, POMs, .module files
    ["server", "https://blossom.example.com"],       // where the blobs were uploaded
    ["alt", "Release of com.example:lib:1.0.0"]
  ]
}
```

`x` tags let anyone find who signed a given file. Publishers SHOULD keep the event under 16 KB by dropping trailing primary `x` tags; every file remains in the manifest.

For a module `G:A` and version `V`, the canonical release among events **by the publisher the client trusts for `G`** that carry `["j","G:A"]` and `["v","V"]` is the one with the earliest `created_at`, ties broken by the lowest `id`. Publishers MUST NOT publish a second release of a version; a bad release is superseded by a new version. [NIP-09][] deletion requests do not apply to releases.

## Snapshot

Same tags as a release, plus `["d", "<groupId>:<artifactId>:<version>"]` with the root coordinate. The version ends in `-SNAPSHOT`, and file names in the manifest use Maven's timestamped form (`lib-1.0-20260101.120000-3.jar`), from which clients generate the snapshot's `maven-metadata.xml`.

## Release key

A `groupId` is a reversed domain, so the domain vouches for the key that signs its releases, through [NIP-05][]:

1. Reverse the `groupId` into a host: `com.vitorpamplona.quartz` → `quartz.vitorpamplona.com`.
2. From that host down to its registrable domain (per the [Public Suffix List][]), look up `releases`: `releases@quartz.vitorpamplona.com`, then `releases@vitorpamplona.com`.
3. The first key found is the group's release key, for the group and its subgroups.

Only a definite absence (the domain doesn't exist, `/.well-known/nostr.json` returns 404, or doesn't list `releases`) moves the walk to the parent domain. A domain that can't be read stops it, so an outage never hands a group to another key.

The name is `releases` rather than `_`, which is usually the domain's general identity, so the release key can live apart from any account that posts. Clients MAY let users choose another name on the same domains, or pin a key directly; the latter is the only option for a group that isn't a domain.

## Publishing

1. Check that the group's release key (above) is the signing key; stop otherwise.
2. Read the publisher's `kind:10063` server list.
3. Check every blob with [BUD-06][] (`HEAD /upload`) and stop **before signing anything** if some blob fits on no server.
4. Upload missing blobs with one [BUD-02][] `kind:24242` authorization whose `x` tags cover every blob, falling back to one authorization per blob for servers that refuse it.
5. Upload the manifest, then sign the release and send it to the publisher's [NIP-65][] write relays.

A release costs two signatures. Builds spread over several machines MAY upload blobs from each and sign one release once every file referenced by every `.module` is present.

## Using

Clients accept events for a group only from its release key. To serve `G/A/V/file`:

```json
{"kinds":[3071], "authors":["<release key>"], "#j":["G:A"], "#v":["V"]}
```

Query several relays, merge results, check signatures, pick the canonical release, fetch the manifest and then the file from the release's `server` tags, then the publisher's current `kind:10063`, and check every blob's sha256. Listing all versions of a module for `maven-metadata.xml` uses the same filter without `#v`, with kinds `3071` and `33071`.

Clients SHOULD record, per project, the release key of each group and the manifest hash each resolved version came from, and SHOULD fail rather than switch when either changes. Because `created_at` is set by the signer, this record is what protects existing builds if a publisher's key leaks. Pinning the manifest rather than the event id lets a publisher who rotates keys re-sign the same manifests without breaking locked builds.

## Tags

`j` (`groupId:artifactId`) and `v` (version) are the indexed tags this NIP adds; neither has another meaning in this repository. `x` keeps its [NIP-94][] meaning (a sha256).

[Blossom]: https://github.com/hzrd149/blossom
[BUD-02]: https://github.com/hzrd149/blossom/blob/master/buds/02.md
[BUD-03]: https://github.com/hzrd149/blossom/blob/master/buds/03.md
[BUD-06]: https://github.com/hzrd149/blossom/blob/master/buds/06.md
[RFC 8785]: https://www.rfc-editor.org/rfc/rfc8785
[Public Suffix List]: https://publicsuffix.org/
[NIP-05]: 05.md
[NIP-09]: 09.md
[NIP-65]: 65.md
[NIP-94]: 94.md
