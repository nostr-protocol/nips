NIP-05 Signed Metadata
======

Adding Signed Metadata to DNS-based internet identifiers
----------------------------------------------------

`draft` `optional`

## Proposal

This NIP proposes the addtion of ```"metadata"``` to the nip-05 response to provide optionally signed metadata about the identifier.

## Rationale

The value of this NIP is that it extends the capability of a NIP-05 identifier to present unsigned or signed (verifiable) credentials about itself, or about the controller of the identifier. For example, a NIP-05 identifier such as ```bob@example.com``` can express a signed statement that Bob is indeed a professional engineer. This capability enables a NIP-05 identifier express trusted (signed) statements that can be presented as such in a client, where indication is required.

## Theory and Approach

Metadata is any information about an identifier or the controller of the identifier. Depending on the context, metadata can be provided as unsigned information or as signed information akin to a ```verifiable credential``` 

This proposal is a extends the NIP-05 capability to provide associated ```metadata``` that can be provided as is or be signed to ensure integrity. The same as NIP-05, a client can make a GET request to `https://example.com/.well-known/nostr.json?name=bob` and get back a response that has an additional key-value pair of ```"metadata"``` that maps a ```pubkey``` to an array of metadata elements. For backward compatibilty, this new key-value pair can be ignored by clients not wishing to use this capability.

The metadata value is structured as a nested array of elements that contain elements of metadata havng at least one MANDATORY element and two OPTIONAL elements. 

The metadata element array format is depicted below:
```json 
["MANDATORY kind 0 metadata format", "OPTIONAL signature", "OPTIONAL pubkey"]
```

* A MANDATORY first array element is MANDATORY and consists of a JSON stringified metadata consistent with ```kind 0```.  `0`: **metadata**: the JSON stringified metadata content  `{name: <username>, about: <string>, picture: <url, string>}` consisting of the desired information.
* An OPTIONAL second array element which is a JSON signature of the first array element. By default, the ```pubkey``` used to verify this signature is the pubkey that corresponds to value related to the ```name``` key. 
* An OPTIONAL third array element can be specified, if the pubkey used to verify the signature is other than the ```name```. This is for the use case where the metadata by signed by a party other than the named user - such as the NIP-05 provider, or another relevant authority.

The three combinations above enable three possible scenarios:

* The first scenario (just the MANDATORY element) is the simplest case where a NIP-05 provider can emit additional unsigned data about a named user, with little additional assurance other than the provider providing this information related to the user
* The second scenario is the case where the named user needs to sign or attest to the information. Depending on the implementation, the NIP-05 provider may have access to the user's ```nsec``` to sign the data on the user's behalf or the user has provided pre-signed metadata to the NIP-05 provider, who then stores this signed metadata and adds to the response to a NIP-05 request.
* The third scenario - most complex case - where the signer is a third party. An additional pubkey is specified, which has signed the metadata instead of the named user. This scenario account for the possibility of adding in third party signed metadata that could come from any relevant signing authority with a pubkey.

The NIP-05 example, below has been extended to illustrate the metadata for the three cases discussed above.

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [ "wss://relay.example.com", "wss://relay2.example.com" ]
  },
  "metadata": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      [
        "{\"name\": \"bob\", \"nip05\": \"bob@example.com\"}"
      ],
      [
        "{\"name\": \"Bob Smith\", \"email\": \"bsmith@example.com\", \"status\": \"employed\"}",
        "ebb83508a5072ed17e3dd7752fcfcaff9722ae6abb884328db6fde1fed86f357000f8fd75b4303a3ea7cc4913e72744e936064088c9ecc81ff84b442b60d1820"
      ],
      [
        "{\"name\": \"John Doe\", \"profession\": \"engineer\", \"status\": \"active\"}",
        "a2f4ba55bad75a84fd5679f1ae8fa05ffc9497db20f774c5ee1435b40ff81638f9f9f0a5a8ed8c631d52b9ae56d5d6209b3a48ed8ed535fb80cc693e79e2dba7",
        "e43f16ab84552a8680d3ade518803770fa16c9835da0a0f5b376cddef7f12786"
      ]
    ]
  }
}
````

## Resolving and Verifying Metadata

A response is the exactly same for NIP-05 request, except for additional metadata key-value pair. It can be ignored. If the metadata is used, the verifier (typically a client) is responsible for doing the verification process.

First, in the example, the "names" 'bob' is resolved to the ```pubkey``` and then the ```pubkey``` is used to resolve to the metadata array. A ```pubkey``` should the one given in `"names". If not metadata can be resolved, this can be treated like an ordinary NIP-05 request.

Second, each metadata array element is handled according to the number of elements it contains.

* If one element is present, this is the simplest cases: The metadata can be converted to JSON and treated by a client as a kind 0 event.
* If two elements are present, the second is the signature which is used to verify the metadata (first element) along with the previously resolved pubkey. A client may wish to indicate that, once verified, this metadata has been signed.
* If a third element is present, this is the alternative pubkey that is used to verify the metadata with the signature. There is no metadata stored regarding this pubkey; the metadata about this pubkey can be disovered via the nostr network, NIP-05 and the invocation of this method. A client may wish to indicate that, once verified, this metadata has been signed by another party.


### Security Constraints

There is also the use case that adversarial metadata may be provided by a non-cooperative counterparty. For the purposes of this proposal, adversarial metadata is considered to be out of scope, but implementors should be aware of this possibility. 

The `/.well-known/nostr.json` endpoint MUST NOT return any HTTP redirects.

Fetchers MUST ignore any HTTP redirects given by the `/.well-known/nostr.json` endpoint.
