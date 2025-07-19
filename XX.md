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

## Workflows

### Client to Relay

- Any message the client wants to send to the Relay will be a write message.
- Any message the client receives from the Relay will be a read message.

### Relay to Client

The Relay should notify the Client about any new event matching subscription's filters by using the Notify action of the Read Characteristic. After that, the Client can proceed to read messages from the Relay.

### Device Synchronization

WIP
