# NostrReAction Client and Relay Monitor

This project implements the NIP-100 NostrReAction protocol, providing a client interface and a relay monitor for the Nostr network.

## Features

- NostrReAction Client
  - Connect to Nostr relays
  - Send unified interactions (likes, shares, replies)
  - Support for content modifications
  - IPFS integration for larger content
  - Real-time event display

- Nostr Relay Monitor
  - Monitor specific Nostr relays
  - Display real-time statistics (events per second, total events)
  - Filter events by public key and action type

## Installation

1. Clone this repository
2. Open `index.html` in your web browser for each application

## Usage

### NostrReAction Client

1. Enter your private key (for testing only) or use a Nostr extension
2. Add and select a Nostr relay
3. Click "Connect" to join the relay
4. View and interact with events using the NostrReAction protocol

### Nostr Relay Monitor

1. Enter the URL of the relay to monitor
2. Click "Connect" to start monitoring
3. Use filters to refine displayed events

## Security

**Warning**: Never enter your real private key into the application. Use a secure Nostr extension for real-world usage.

## Dependencies

- nostr-tools
- TailwindCSS (for NostrReAction client)
- Font Awesome (for NostrReAction client)

## Contributing

Contributions are welcome. Please open an issue to discuss major changes before submitting a pull request.

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). This license requires that any modified versions of this software must be made available under the same license terms, including when the software is provided as a service over a network. Commercial use is allowed, but any modifications must be open-sourced and attributed to the original authors.

For the full license text, see [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html).

Citations:
[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/22988433/47b0ef21-59cb-4878-9077-08286e3fc6c1/paste.txt
