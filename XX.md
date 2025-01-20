NIP-XX
======

Nostr BLE Signing Device Protocol
---------------------------------

`draft` `optional`

This NIP specifies how Nostr signing devices can provide key management and message signing capabilities over BLE. The protocol enables secure communication between a client application and a hardware signing device using standardized BLE UART services.

## Protocol Details

### Device Advertisement
The signing device advertises itself with:
- Service UUID: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` (Nordic UART Service)
- Device Name Format: `NSD-XXXXXX` where XXXXXX is derived from the device's BLE MAC address
- Advertisement Interval: 20ms - 150ms
- Flags: General Discoverable Mode & BR/EDR Not Supported

### GATT Services
The device exposes a Nordic UART Service with the following characteristics:

1. RX Characteristic (Write)
   - UUID: `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
   - Properties: Write, Write Without Response
   - Used by client to send commands to the device

2. TX Characteristic (Read/Notify)
   - UUID: `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`
   - Properties: Notify
   - Used by device to send command responses

### Command Format
Commands are sent as UTF-8 encoded strings in the format: 
- `/command [parameters]`

Responses are returned in the format:
- `/command response_data`

### Supported Commands

#### Key Management
- `/public-key`: Returns the active public key in hex format
- `/add-key <hex_private_key>`: Adds a new private key to the device
- `/remove-key <index>`: Removes the private key at specified index
- `/list-keys`: Lists all stored public keys with their indices
- `/switch-key <index>`: Changes the active key to the specified index
- `/new-key`: Generates a new random private key
- `/name-key <index> <name>`: Assigns a human-readable name to a key

#### Message Signing
- `/sign-message <hex_message>`: Signs a 32-byte message with the active key
- `/shared-secret <hex_pubkey>`: Performs ECDH with provided public key
- `/encrypt-message <hex_pubkey> <message>`: Encrypts a message for recipient
- `/decrypt-message <hex_pubkey> <encrypted>`: Decrypts a message from sender

#### Device Management  
- `/help`: Lists available commands
- `/ping`: Tests device connectivity
- `/reboot`: Restarts the device
- `/wipe`: Erases all stored keys and settings

### Command Queue
The device implements a circular buffer queue (size 10) for BLE commands to handle rapid command transmission. Commands are processed in FIFO order.

## Client Implementation Notes

1. Device Discovery
   - Scan for devices advertising Nordic UART Service UUID
   - Filter for device names starting with "NSD-"

2. Connection
   - Connect to device
   - Discover UART service and characteristics
   - Enable notifications on TX characteristic

3. Command Transmission
   - Write commands to RX characteristic
   - Listen for responses on TX characteristic
   - Implement reasonable timeout handling

## Reference Implementation

The reference implementation is available at:
https://github.com/lnbits/nostr-signing-device

## Authors
cr0bar
