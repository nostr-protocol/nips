# NIP-XX

## Static Payment Addresses

`draft` `optional`

## Abstract

This NIP defines a standardized method for publishing static payment addresses using a dedicated event kind, allowing users to advertise their preferred payment methods across multiple cryptocurrencies and networks.

## Motivation

Users want to publish their payment addresses in a standardized way that is interoperable across Nostr clients. This creates a dedicated event type that clients can fetch only when needed, such as when viewing a user's profile or donation page.

## Specification

### Event Kind

This NIP introduces **kind 10780** for static payment addresses.

### Event Structure

```json
{
  "kind": 10780,
  "content": "",
  "tags": [
    ["BTC", "bitcoin", "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"],
    ["BTC", "lightning", "alice@example.com"],
    ["ETH", "ethereum", "0x742d35Cc6634C0532925a3b2F0E5f4C96C60BcEe"],
    ["XMR", "monero", "4A5BNZmM5VXyU2P7J8Q3hY8wXD2E8L9G3qZ2vF1H7sR4cN8xY6fL2mK9qW3eT5r"],
    ["LBTC", "liquid", "lq1qqf7ns3aawy8k3gv6v6zhqjcw99e8v0fyxrc0ewz3vkclfslp7y9c24k8xm6l3j"]
  ],
  // other fields...
}
```

### Tag Structure

Each tag MUST have exactly 3 elements:
1. `<asset>`: The asset ticker (case-sensitive, uppercase recommended)
2. `<network>`: The network identifier (case-sensitive, lowercase recommended)  
3. `<address>`: The receiving address for the specified asset on the specified network

### Supported Assets and Networks

Clients SHOULD support the following common combinations:

#### Bitcoin (BTC)
- `bitcoin`: Bitcoin mainnet (addresses: bc1..., 1..., 3...)
- `lightning`: Lightning Network (lightning addresses: user@domain.tld only)

#### Liquid Bitcoin (LBTC)
- `liquid`: Liquid Network sidechain (addresses: lq1...)

#### Ethereum (ETH)  
- `ethereum`: Ethereum mainnet (addresses: 0x...)

#### Monero (XMR)
- `monero`: Monero mainnet (standard Monero addresses)

#### Tether USD (USDT)
- `ethereum`: USDT on Ethereum
- `liquid`: USDT on Liquid Network  
- `tron`: USDT on Tron (addresses: TRX...)

Clients MAY support additional assets and networks beyond this list.

## Implementation Guidelines

### Client Behavior

1. **Fetching**: Clients SHOULD fetch payment address events only when needed (e.g., when viewing a profile or donation interface)

2. **Display**: Clients SHOULD display both the asset name and network for clarity (e.g., "BTC (Lightning)", "USDT (Ethereum)")

3. **User Interface**: Clients SHOULD provide mechanisms for users to easily copy addresses or display QR codes

4. **Ordering**: Multiple `payment` tags MAY be interpreted as the user's preferred payment methods in order of appearance

5. **Validation**: Clients MAY implement basic format validation for addresses on supported networks

6. **Unknown Assets/Networks**: Clients SHOULD gracefully handle unknown asset or network identifiers by displaying them as-is

## Address Format Examples

- **Bitcoin mainnet**: `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`
- **Bitcoin Lightning**: `alice@example.com` (lightning addresses only)
- **Liquid Network**: `lq1qqf7ns3aawy8k3gv6v6zhqjcw99e8v0fyxrc0ewz3vkclfslp7y9c24k8xm6l3j`
- **Ethereum**: `0x742d35Cc6634C0532925a3b2F0E5f4C96C60BcEe`
- **Tron**: `TRX9QqJo6UbgJ1CXr5wQv9vJ2N8KdGhH9L`
- **Monero**: `4A5BNZmM5VXyU2P7J8Q3hY8wXD2E8L9G3qZ2vF1H7sR4cN8xY6fL2mK9qW3eT5r`

## Security Considerations

- Users SHOULD verify their addresses are correct before publishing
- Clients SHOULD warn users when addresses don't match expected formats
- Lightning addresses SHOULD be tested to verify that invoices can be fetched from them
- Users SHOULD be aware that payment addresses are public and permanently associated with their Nostr identity
- Consider the privacy implications of publishing payment addresses

## Future Extensions

This specification may be extended in the future to include:
- Additional standardized assets and networks
- Optional metadata fields for payment preferences
- Integration with other payment protocols
- Support for dynamic payment requests
