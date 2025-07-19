NIP-XX
======

Nostr BLE Communications Protocol
---------------------------------

`draft` `optional`

This NIP specifies how Nostr apps can use BLE to communicate and synchronize with each other. The BLE protocol follows a client-server pattern, so this NIP emulates the WS structure in a similar way, but with some adaptations to its limitations.

## Device Advertisement
A device advertises itself with:
- Service UUID: `0000180f-0000-1000-8000-00805f9b34fb`
- Data: Device UUID in ByteArray format

## GATT Service
The device exposes a Nordic UART Service with the following characteristics:

1. Write Characteristic
   - UUID: `87654321-0000-1000-8000-00805f9b34fb`
   - Properties: Write

2. Read Characteristic
   - UUID: `12345678-0000-1000-8000-00805f9b34fb`
   - Properties: Notify, Read

## Role Assignment

When one device initially finds another advertising the service, it will read the service's data to get the device UUID and compare it with its own advertised device UUID. For this communication, the device with the highest ID will take the role of GATT Server (Relay), the other will be considered the GATT Client (Client) and will proceed to establish the connection.

For devices whose purpose will require a single role, its device UUID will always be:

- GATT Server: `FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF`
- GATT Client: `00000000-0000-0000-0000-000000000000`

## Messages

All messages will follow [NIP-01](/01.md) message structure. For a given message, a compression stream (DEFLATE) is applied to the message to generate a byte array. Depending on the BLE version, the byte array can be too large for a single message (20-23 bytes in BLE 4.2, 256 bytes in BLE > 4.2). In that case, this byte array is split into any number of batches following the structure:

```
[batch index (first 2 bytes)][batch n][is last batch (last byte)]
```
After reception of all batches, the other device can then join them and decompress. To ensure reliability, only 1 message will be read/written at a time. MTU can be negotiated in advance. The maximum size for a message is 64KB; bigger messages will be rejected.

## Examples

This example implements a function to split and compress a byte array into chunks, as well as another function to join and decompress them in order to obtain the initial result:

```kotlin
fun splitInChunks(message: ByteArray): Array<ByteArray> {
   val chunkSize = 500 // define the chunk size
   var byteArray = compressByteArray(message)
   val numChunks = (byteArray.size + chunkSize - 1) / chunkSize // calculate the number of chunks
   var chunkIndex = 0
   val chunks = Array(numChunks) { ByteArray(0) }

   for (i in 0 until numChunks) {
         val start = i * chunkSize
         val end = minOf((i + 1) * chunkSize, byteArray.size)
         val chunk = byteArray.copyOfRange(start, end)

         // add chunk index to the first 2 bytes and last chunk flag to the last byte
         val chunkWithIndex = ByteArray(chunk.size + 2)
         chunkWithIndex[0] = chunkIndex.toByte() // chunk index
         chunk.copyInto(chunkWithIndex, 1)
         chunkWithIndex[chunkWithIndex.size - 1] = numChunks.toByte()

         // store the chunk in the array
         chunks[i] = chunkWithIndex

         chunkIndex++
   }

   return chunks
}

fun joinChunks(chunks: Array<ByteArray>): ByteArray {
   val sortedChunks = chunks.sortedBy { it[0] }
   var reassembledByteArray = ByteArray(0)
   for (chunk in sortedChunks) {
         val chunkData = chunk.copyOfRange(1, chunk.size - 1)
         reassembledByteArray = reassembledByteArray.copyOf(reassembledByteArray.size + chunkData.size)
         chunkData.copyInto(reassembledByteArray, reassembledByteArray.size - chunkData.size)
   }

   return decompressByteArray(reassembledByteArray)
}

```

## Workflows

### Client to Relay

- Any message the client wants to send to the Relay will be a write message.
- Any message the client receives from the Relay will be a read message.

### Relay to Client

The Relay should notify the Client about any new event matching subscription's filters by using the Notify action of the Read Characteristic. After that, the Client can proceed to read messages from the Relay.

### Device Synchronization

WIP
