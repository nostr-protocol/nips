NIP-XX: Decentralized file archival and retrieval
=================================================

`draft` `optional`

This NIP defines how immutable files can be located and referenced in a way that is decentralized, flexible, extensible, and easy to implement.

It specifies:
1. A content-addressable URI scheme that can used in notes and messages to reference files and hints on where to find them. Clients can use this URI to retrieve the file from any server or system that supports it in a tamper-proof way.
2. A standard HTTP endpoint interface that can be optionally used by providers to serve these files to clients.

## Motivation

Nostr currently relies on uploading and retrieving media through centralized servers. This NIP aims to provide a more decentralized approach without adding too much complexity, as well as to open doors to new applications and tools that want to deal with file archival and retrieval.

Here are the main issues with the current approach and other alternatives:

- **Centralized media uploaders**: Generally works, but presents the following issues:
  - Adds centralization to Nostr.
  - There is no way to verify the file was not tampered with or modified.
- **IPFS**: IPFS is decentralized, but:
  - it is not easy to integrate with. (The protocol is complex)
  - does not integrate well with other Nostr NIPs
  - it is not flexible enough to support other use cases
  - brings many other issues, which are well illustrated in [this article](https://fiatjaf.com/d5031e5b.html)

## Use cases

- More decentralized Nostr media uploader services
- File integrity and tamper detection for clients.
- A gallery of photos that are stored on a local file system, and replicated across multiple personal servers
- A decentralized `npm`-like registry for software packages or git repositories
- Monetization of file access (e.g. Pay to download a book)
- Private caching servers for files (e.g. Save bandwidth and increase privacy by caching files to a personal server)

## Specification

The following sections describe some primitive components of the spec. Clients and providers are free to implement one or many of these components or to integrate them with other specs or systems.

### 1. nblob bech32 entities

`nblob` are bech32 entities that identifies immutable file contents or any binary blob.

Obtaining the `nblob` of a file is done by:
1. hashing the file with SHA256
2. Encoding the hash as a bech32 string with the `nblob` prefix

Example implementation:

```python
import hashlib
import bech32
import sys

def nblob(file):
    hash = hashlib.sha256(file).digest()
    return bech32.encode('nblob', 0, hash)
    
if __name__ == '__main__':
    file_path = sys.argv[1]
    with open(file_path, 'rb') as f:
        file = f.read()
        print(nblob(file))
```

Example `nblob` identifier of this script file: `nblob1q9maw3n56tnvgqy2xaqzwgvjys5mptvh6hpffhwrpduc0r89pmr0q5k9p4t`

### 2. nostr+file URI

`nostr+file` is a [URI](https://www.rfc-editor.org/rfc/rfc3986) scheme that allows for referencing `nblob` entities.

The format of the URI is:

```
nostr+file:<nblob>?<query_parameters>
```

Where the _optional_ URL-encoded query parameters can be:
- `filename`: the name of the file with its extension
- `mime`: the MIME type of the file following the [IANA media types](https://www.iana.org/assignments/media-types/media-types.xhtml) standard
- `gateways`: a comma-separated list of gateways that can be used to retrieve the file. It provides a hint (or recommendation) to the client on where to look for the file. The client MAY ignore this hint.

If both `filename` and `mime` are provided, the client SHOULD prefer the `mime` parameter over the file extension to determine the MIME type of the file.

**Example `nostr+file` URI:** `nostr+file:nblob1q9maw3n56tnvgqy2xaqzwgvjys5mptvh6hpffhwrpduc0r89pmr0q5k9p4t?filename=example.py&gateways=https%3A%2F%2Fgateway.example.com%2Chttps%3A%2F%2Fgateway-example-2.com`

These URIs can be pasted into Nostr notes, messages, articles or whatever other content that supports URIs.

Clients MAY use any system or method to retrieve the file from the `nblob` identifier. The following section describes a standard HTTP endpoint interface that can be optionally used by clients to retrieve the file.

### 3. HTTP Gateways

HTTP Gateways are servers that can be used by clients to retrieve files.

Providers that are interested in serving files over HTTP under this NIP MUST implement the following endpoint:

#### GET `/.well-known/nostr/nipXX/<nblob_address>`

Clients can use this endpoint to retrieve the file contents of a `nblob` address.

Clients MAY use the following HTTP request headers:
- `Content-Type`: To specify the MIME type (optional)
- `Authorization`: Optional NIP-98 authentication or payment authentication (e.g. Using L402)

If the file could be found on the server and the user is allowed to access it, the server MUST return the file contents on the response body.

**HTTP response codes:**
- `200`: Found file and returned it
- `404`: File not found
- `401`: Unauthorized. Requires NIP-98 authentication
- `403`: NIP-98 passed, but the Nostr user is not allowed to access this resource.
- `402`: File access requires payment (using [L402](https://docs.lightning.engineering/the-lightning-network/l402/protocol-specification), for example)

**HTTP response headers:**
- `Content-Type`: Specifies the MIME type (Gateway SHOULD respect the MIME type requested by the client, but MAY show a different mime type if it is known by the server to be more accurate). Clients can use or ignore this header.

Once the file is retrieved, the client MAY verify the file contents by hashing it and comparing it to the `nblob` address.

## Example flow

Here is an example flow illustrating all components of this NIP working together:

1. Alice calculates the `nblob` identifier for a picture she wants to share. She then uploads the same file to `example.com` and `example2.com` which are HTTP gateways she trusts.
2. Alice writes a NIP-01 text note and includes the URI: `nostr+file:nblob1q9maw3n56tnvgqy2xaqzwgvjys5mptvh6hpffhwrpduc0r89pmr0q5k9p4t?filename=picture.jpg&gateways=https%3A%2F%2Fexample.com%2Chttps%3A%2F%2Fexample-2.com&mime=image%2Fjpeg` in the note.
2. Bob reads the text note. Bob's client identifies and parses the `nostr+file` URI.
3. Bob's client then tries to send a GET request to the private gateway in their private home server at `http://private.local/.well-known/nostr/nipXX/nblob1q9maw3n56tnvgqy2xaqzwgvjys5mptvh6hpffhwrpduc0r89pmr0q5k9p4t`
4. Unfortunately, the file is not found in the private gateway. Bob's client then tries the recommended gateway by sending the GET request to `https://example.com/.well-known/nostr/nipXX/nblob1q9maw3n56tnvgqy2xaqzwgvjys5mptvh6hpffhwrpduc0r89pmr0q5k9p4t`, with `Content-Type: image/jpeg` (Inferred from the filename).
4. The server responds with HTTP 404 because the file is not found. (Let's assume the file was deleted from the server)
5. Bob's client then sends the same request to `example2.com`.
6. The server `example2.com` responds with HTTP 200 and returns the file contents with `Content-Type: image/jpeg` _(in this case it also knows the MIME type of the file)_. Bob's client verifies the file contents by hashing it and comparing it to the `nblob` identifier.
7. Bob's client then displays the picture to Bob.


## Items intentionally left out of this NIP

There are many ways this spec can be extended, but they are probably better tracked in separate NIPs. Here are some examples of things that are left out of this NIP on purpose:

- **File upload endpoint**: This NIP does not specify how files are uploaded to the network. There could be an extension to the gateway interface to allow for file uploads, but that is out of scope for this NIP.
- **Directories**: This NIP does not specify how to organize files into directories. This is left to other NIPs or to the implementer.
- **Proof of storage**: This NIP does not specify a provider can prove that they are storing the file without sending the file itself. This is left to other NIPs or to the implementer.
- **Direct acyclic graphs of files**: This NIP does not specify how to handle a DAG of files. This is left to other NIPs or to the implementer.
- **Other discovery methods of gateways containing a file**: Outside the hints provided in the `gateways` query parameter, this NIP does not specify other ways to discover gateways containing a file. This is left to other NIPs or to particular use cases.
- **Serving files over other protocols**: This NIP only specifies serving files over HTTP for simplicity. Other protocols (such as Websockets, SFTP, etc.) are left to other NIPs or to the implementer.
