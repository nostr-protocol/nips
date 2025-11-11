NIP-BE
======

Nostr BLE Communications Protocol
---------------------------------

`draft` `optional`

This NIP specifies how Nostr apps can use BLE to communicate and synchronize with each other. The BLE protocol follows a client-server pattern, so this NIP emulates the WS structure in a similar way, but with some adaptations to its limitations.

## Device advertisement
A device advertises itself with:
- Service UUID: `0000180f-0000-1000-8000-00805f9b34fb`
- Data: Device UUID in ByteArray format

## GATT service
The device exposes a Nordic UART Service with the following characteristics:

1. Write Characteristic
   - UUID: `87654321-0000-1000-8000-00805f9b34fb`
   - Properties: Write

2. Read Characteristic
   - UUID: `12345678-0000-1000-8000-00805f9b34fb`
   - Properties: Notify, Read

## Role assignment

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

### Client to relay

- Any message the client wants to send to a relay will be a write message.
- Any message the client receives from a relay will be a read message.

### Relay to client

The relay should notify the client about any new event matching subscription's filters by using the Notify action of the Read Characteristic. After that, the client can proceed to read messages from the relay.

### Device synchronization

Given the nature of BLE, it is expected that the direct connection between two devices might be extremely intermittent, with gaps of hours or even days. That's why it's crucial to define a synchronization process by following [NIP-77](./77.md) but with an adaptation to the limitations of the technology.

After two devices have successfully connected and established the Client-Server roles, the devices will use half-duplex communication to intermittently send and receive messages.

#### Half-duplex synchronization

Right after the 2 devices connect, the Client starts the workflow by sending the first message.

1. Client - Writes ["NEG-OPEN"](/77.md#initial-message-client-to-relay) message.
2. Server - Sends `write-success`.
3. Client - Sends `read-message`.
4. Server - Responds with ["NEG-MSG"](./77.md#subsequent-messages-bidirectional) message.
5. Client -
   1. If the Client has messages missing on the Server, it writes one `EVENT`.
   2. If the Client doesn't have any messages missing on the Server, it writes `EOSE`. In this case, subsequent messages to the Server will be empty while the Server claims to have more notes for the Client.
6. Server - Sends `write-success`.
7. Client - Sends `read-message`.
8. Server -
   1. If the Server has messages missing on the Client, it responds with one `EVENT`.
   2. If the Client doesn't have any messages missing on the Server, it responds with `EOSE`. In this case, subsequent responses to the Client will be empty.
9. If the Client detects that the devices are not synchronized yet, jump to step 5.
10. After the two devices detect that there are no more missing events on both ends, the workflow will pause at this point.

#### Half-duplex event spread

While two devices are connected and synchronized, it might happen that one of them receives a new message from another connected peer. Devices MUST keep track of which notes have been sent to its peers while they are connected. If the newly received event is detected as missing in one of the connected and synchronized peers:

1. If the peer is a Server:
   1. Client - It writes the `EVENT`.
   2. Server - Sends `write-success`.
2. If the peer is a Client:
   1. Server - It will send an empty notification to the Client.
   2. Client - Sends `read-message`.
   3. Server - Responds with the `EVENT`.
