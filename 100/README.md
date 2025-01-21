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

## Implementation

```javascript
import { getEventHash, signEvent, validateEvent, verifySignature } from 'nostr-tools';

class NostrReAction {
  constructor(privateKey, relay) {
    this.privateKey = privateKey;
    this.relay = relay;
  }

  createNostrRAEvent(actionType, originalEventId, originalAuthorInfo, content, replyToEventId = null, ipfsCid = null) {
    const event = {
      kind: 10037,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['original_event_id', originalEventId],
        ['original_author_info', ...originalAuthorInfo],
        ['action_type', actionType],
      ],
      content: content,
      pubkey: getPublicKey(this.privateKey),
    };

    if (replyToEventId) {
      event.tags.push(['reply_to_event_id', replyToEventId]);
    }

    if (ipfsCid) {
      event.tags.push(['ipfs_cid', ipfsCid]);
    }

    event.id = getEventHash(event);
    event.sig = signEvent(event, this.privateKey);

    return event;
  }

  createNotificationEvent(originalEventId, originalAuthorInfo, repostEventId, modifyEventId = null) {
    const event = {
      kind: 10038,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['original_event_id', originalEventId],
        ['original_author_info', ...originalAuthorInfo],
        ['repost_event_id', repostEventId],
      ],
      content: '',
      pubkey: getPublicKey(this.privateKey),
    };

    if (modifyEventId) {
      event.tags.push(['modify_event_id', modifyEventId]);
    }

    event.id = getEventHash(event);
    event.sig = signEvent(event, this.privateKey);

    return event;
  }

  async publishEvent(event) {
    if (validateEvent(event) && verifySignature(event)) {
      await this.relay.publish(event);
      return true;
    }
    return false;
  }

  async like(originalEventId, originalAuthorInfo) {
    const event = this.createNostrRAEvent('like', originalEventId, originalAuthorInfo, '');
    const notification = this.createNotificationEvent(originalEventId, originalAuthorInfo, event.id);

    await this.publishEvent(event);
    await this.publishEvent(notification);
  }

  async reply(originalEventId, originalAuthorInfo, content, replyToEventId) {
    const event = this.createNostrRAEvent('reply', originalEventId, originalAuthorInfo, content, replyToEventId);
    const notification = this.createNotificationEvent(originalEventId, originalAuthorInfo, event.id);

    await this.publishEvent(event);
    await this.publishEvent(notification);
  }

  async modify(originalEventId, originalAuthorInfo, newContent, originalContentHash) {
    const event = this.createNostrRAEvent('modify', originalEventId, originalAuthorInfo, newContent);
    event.tags.push(['original_content_hash', originalContentHash]);
    const notification = this.createNotificationEvent(originalEventId, originalAuthorInfo, event.id, event.id);

    await this.publishEvent(event);
    await this.publishEvent(notification);
  }

  async validate(originalEventId, originalAuthorInfo, eventIdToValidate) {
    const event = this.createNostrRAEvent('validate', originalEventId, originalAuthorInfo, '');
    event.tags.push(['validate', eventIdToValidate]);

    await this.publishEvent(event);
  }
}

```

## How To make

### NostrReAction Client

[nostr-re-action-client/](nostr-re-action-client/)

1. Enter your private key (for testing only) or use a Nostr extension
2. Add and select a Nostr relay
3. Click "Connect" to join the relay
4. View and interact with events using the NostrReAction protocol

### Nostr Relay Monitor

[nostr-relay-monitor/](nostr-relay-monitor/)

1. Enter the URL of the relay to monitor
2. Click "Connect" to start monitoring
3. Use filters to refine displayed events

## Dependencies

- nostr-tools
- TailwindCSS (for NostrReAction client)
- Font Awesome (for NostrReAction client)

## Contributing

Contributions are welcome.

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
This license requires that any modified versions of this software must be made available under the same license terms,
including when the software is provided as a service over a network.

Commercial use is allowed, but any modifications must be open-sourced and attributed to the original authors.

For the full license text, see [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html).
