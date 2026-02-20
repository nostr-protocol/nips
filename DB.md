# NIP-DB: Browser Nostr Event Database Interface

## Abstract

This NIP defines a standard interface for browser extensions that provide local Nostr event storage capabilities to web applications. The interface allows web applications to interact with Nostr events stored locally in the browser through a standardized `window.nostrdb` API.

## Motivation

Browser extensions can provide valuable local storage and caching capabilities for Nostr events, improving performance and enabling offline functionality.

This NIP establishes a common interface that browser extensions can implement to provide Nostr event storage services to web applications.

## Specification

### Interface Definition

Browser extensions implementing this NIP MUST inject a `window.nostrdb` object that implements the following interface:

```typescript
interface IWindowNostrDB {
  /** Add an event to the database */
  add(event: NostrEvent): Promise<boolean>;

  /** Get a single event by ID */
  event(id: string): Promise<NostrEvent | undefined>;

  /** Get the latest version of a replaceable event */
  replaceable(
    kind: number,
    author: string,
    identifier?: string,
  ): Promise<NostrEvent | undefined>;

  /** Count the number of events matching filters */
  count(filters: Filter[]): Promise<number>;

  /** Check if the database backend supports features */
  supports(): Promise<string[]>;

  /** Get events by filters */
  filters(filters: Filter[]): Promise<NostrEvent[]>;

  /** Subscribe to events in the database based on filters */
  subscribe(filters: Filter[], handlers: StreamHandlers): Subscription;
}
```

### Supporting Types

```typescript
/** Generic type for a subscription */
type Subscription = {
  close: () => void;
};

type StreamHandlers = {
  event?: (event: NostrEvent) => void;
  error?: (error: Error) => void;
  complete?: () => void;
};
```

### Feature Detection

The `supports()` method allows web applications to check for optional features:

- `"search"` - NIP-50 full-text search capabilities
- `"subscribe"` - Real-time subscription support

### Implementation Requirements

1. **Injection**: The interface MUST be injected into every web page via content scripts
2. **Availability**: The interface MUST be available as `window.nostrdb` after DOM content is loaded
3. **Error Handling**: All methods MUST handle errors gracefully and return appropriate error states
4. **Thread Safety**: The interface MUST be safe to use from multiple contexts

### Usage Examples

#### Basic Event Operations

```javascript
// Add an event
const success = await window.nostrdb.add(nostrEvent);

// Get a specific event
const event = await window.nostrdb.event(eventId);

// Get latest replaceable event
const profile = await window.nostrdb.replaceable(0, pubkey);

// Count events
const count = await window.nostrdb.count([{ kinds: [1] }]);
```

#### Getting Events

```javascript
// Get events matching filters
const events = await window.nostrdb.filters([{ kinds: [1] }]);
console.log("Found events:", events);
```

#### Subscribing to Events

```javascript
// Subscribe to events with handlers
const subscription = window.nostrdb.subscribe([{ kinds: [1] }], {
  event: (event) => console.log("New event:", event),
  error: (error) => console.error("Stream error:", error),
  complete: () => console.log("Stream complete"),
});

// Clean up subscription
subscription.close();
```

#### Feature Detection

```javascript
// Get all supported features
const supportedFeatures = await window.nostrdb.supports();

// Check for search support
if (supportedFeatures.includes("search")) {
  // Use search functionality
}

// Check for subscription support
if (supportedFeatures.includes("subscribe")) {
  // Use real-time subscriptions
}
```

## Reference Implementation

A reference implementation is available at: [nostr-bucket](https://github.com/hzrd149/nostr-bucket)
