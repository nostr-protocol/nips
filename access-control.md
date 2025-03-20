## Access Control

## View Key.

View key is the new key used to encrypt the content key of any nostr event.

## Sharing Keys

Keys in context of any nostr event can be shared as a kind 18 rumor, to a gift wrapped event

```json
{
  "kind": 21,
  "tags": [
    ["key", "<key-name>", "key as hexadecmial string"], 
    ["e", "event-id"], 
    ["a", "id of parameterized replacebable event"]
  ],
  "contnent": "",
  "id": "",
  "created_at": "",
  "pubkey": "Sender Pubkey"
}
```