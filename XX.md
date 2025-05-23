# NIP-XX

## Donation Addresses in User Metadata

`draft` `optional`

## Abstract

This NIP defines a standardized method for including donation addresses in user metadata events using `w` tags to specify supported assets, networks, and receiving addresses.

## Motivation

Users want to publish their donation addresses in their profiles in a standardized way that is interoperable across Nostr clients. Currently, there is no consistent method for including payment information in user metadata, leading to fragmented implementations and poor user experience.

## Specification

### The `w` tag

A new optional `w` tag is introduced for `kind 0` metadata events defined in [NIP-01](01.md):

```json
{
  "kind": 0,
  "tags": [
    ["w", "BTC", "bitcoin", "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"],
    ["w", "BTC", "lightning", "alice@zbd.gg"],
    ["w", "ETH", "ethereum", "0x742d35Cc6634C0532925a3b2F0E5f4C96C60BcEe"],
    ["w", "XMR", "monero", "4A5BNZmM5VXyU2P7J8Q3hY8wXD2E8L9G3qZ2vF1H7sR4cN8xY6fL2mK9qW3eT5r"],
    ["w", "USDT", "liquid", "lq1qqf7ns3aawy8k3gv6v6zhqjcw99e8v0fyxrc0ewz3vkclfslp7y9c24k8xm6l3j"]
  ],
  "content": "{\"name\": \"Alice\", \"about\": \"Nostr enthusiast\"}",
  // other fields...
}
```

A `w` tag MUST have exactly 4 elements:
1. The string `"w"` (tag name)
2. `<asset>`: The asset ticker (case-sensitive, uppercase recommended)
3. `<network>`: The network identifier (case-sensitive, lowercase recommended)  
4. `<address>`: The receiving address for the specified asset on the specified network

### Supported Assets and Networks

Clients SHOULD support the following common combinations:

#### Bitcoin (BTC)
- `bitcoin`: Bitcoin mainnet (addresses: bc1..., 1..., 3...)
- `lightning`: Lightning Network (lightning addresses: user@domain.tld)

#### Liquid Bitcoin (LBTC)
- `liquid`: Liquid Network sidechain (addresses: lq1...)

#### Ethereum (ETH)  
- `ethereum`: Ethereum mainnet (addresses: 0x...)

#### Monero (XMR)
- `monero`: Monero mainnet (standard Monero addresses)

#### Tether USD (USDT)
- `ethereum`: USDT on Ethereum
- `liquid`: USDT on Liquid Network  
- `tron`: USDT on Tron (addresses: T...)

Clients MAY support additional assets and networks beyond this list.

## Implementation Guidelines

### Client Behavior

1. **Display**: Clients SHOULD display both the asset name and network for clarity (e.g., "BTC (Lightning)", "USDT (Ethereum)")

2. **User Interface**: Clients SHOULD provide mechanisms for users to easily copy addresses or display QR codes for donation addresses

3. **Ordering**: Multiple `w` tags MAY be interpreted as the user's preferred donation methods in order of appearance

4. **Validation**: Clients MAY implement basic format validation for addresses on supported networks

5. **Unknown Assets/Networks**: Clients SHOULD gracefully handle unknown asset or network identifiers by displaying them as-is rather than throwing errors

### Address Format Examples

- **Bitcoin mainnet**: `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`
- **Bitcoin Lightning**: `alice@zbd.gg` or `lnbc1...` (bolt11 invoices)
- **Liquid Network**: `lq1qqf7ns3aawy8k3gv6v6zhqjcw99e8v0fyxrc0ewz3vkclfslp7y9c24k8xm6l3j`
- **Ethereum**: `0x742d35Cc6634C0532925a3b2F0E5f4C96C60BcEe`
- **Tron**: `TRX9QqJo6UbgJ1CXr5wQv9vJ2N8KdGhH9L`
- **Monero**: `4A5BNZmM5VXyU2P7J8Q3hY8wXD2E8L9G3qZ2vF1H7sR4cN8xY6fL2mK9qW3eT5r`

## Rationale

The `w` tag was chosen to represent "wallet" for donations or "wants" for forms of payment. This provides:

- **Simplicity**: A straightforward 4-element tag structure
- **Flexibility**: Support for any asset/network combination
- **Extensibility**: Easy to add new assets and networks over time
- **Clarity**: Explicit network specification prevents confusion (e.g., USDT on different chains)

The asset and network are separated to allow precise specification of the blockchain or payment network, which is crucial for cryptocurrencies that exist on multiple networks.

## Security Considerations

- Users SHOULD verify their addresses are correct before publishing, as incorrect addresses may result in permanent loss of funds
- Clients SHOULD warn users when addresses don't match expected formats for known networks
- Lightning addresses SHOULD be tested for functionality before publishing
- Users SHOULD be aware that published donation addresses are public and permanently associated with their Nostr identity

## Examples

### Basic Bitcoin donation
```json
["w", "BTC", "bitcoin", "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"]
```

### Multiple donation options
```json
{
  "tags": [
    ["w", "BTC", "lightning", "donations@alice.com"],
    ["w", "BTC", "bitcoin", "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"],
    ["w", "ETH", "ethereum", "0x742d35Cc6634C0532925a3b2F0E5f4C96C60BcEe"],
    ["w", "USDT", "liquid", "lq1qqf7ns3aawy8k3gv6v6zhqjcw99e8v0fyxrc0ewz3vkclfslp7y9c24k8xm6l3j"]
  ]
}
```

## Backwards Compatibility

Clients that do not support the `w` tag SHOULD ignore it without error. This NIP does not affect existing functionality or other metadata fields.

## Future Extensions

This specification may be extended in the future to include:
- Additional standardized assets and networks
- Optional metadata fields (e.g., memo requirements, minimum amounts)
- Integration with other payment protocols
