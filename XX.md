NIP-XX
======

Benchmarking
------------

`draft` `optional`

This NIP is a specification for benchmarking relay servers online. The specification defines a kind `XXXXX` that is never displayed to the client. Benchmarking software must specify the name and version in the tags in the following format.

```
"kind": xxxxx,
"client": "nostr-benchmark-v0.0.2", "31990:app1-pubkey:<d-identifier>", "wss://relay1"]
```

This NIP number SHOULD be provided from the NIP-11 relay information and the benchmarking software SHOULD see this information and cancel the benchmark.

# Relay server

Normally, the benchmarking software SHOULD delete the posted event after the benchmark has completed. Relay server CAN delete them automatically or one's own thinking.

# Client

Clients that are not interested in the data used in the benchmark SHOULD NOT receive this kind.
