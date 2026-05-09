NIP-XX
======

Escrow Services
---------------

`draft` `optional`

This NIP defines a protocol for decentralized escrow services on Nostr, enabling trust-minimized commerce between buyers and sellers. Escrow operators advertise their services, buyers and sellers declare their trusted escrow providers, accepted contract bytecode hashes, and accepted payment forms, and the protocol coordinates on-chain settlement with arbitration capabilities.

## Terms

- **Buyer** — Nostr user making a payment for a good or service.
- **Seller** — Nostr user providing a good or service.
- **Escrow** — Nostr user operating an escrow service that holds funds and can arbitrate disputes.
- **Trade** — A single escrow-backed transaction between a buyer and seller, mediated by an escrow.

## Event Kinds

| Kind    | Name                    | Type                      | Description                                                |
| ------- | ----------------------- | ------------------------- | ---------------------------------------------------------- |
| `17388` | Escrow Method           | Replaceable               | User's accepted payment forms and trusted escrow providers |
| `30302` | Escrow Service Selected | Parameterized replaceable | Buyer's selected escrow and seller method for a trade      |
| `30303` | Escrow Service          | Parameterized replaceable | Escrow operator's service advertisement                    |

## Escrow Service (`kind:30303`)

Published by escrow operators to advertise their service. The `d` tag MUST be set to the smart contract address.

### Content

JSON object:

```jsonc
{
  "pubkey": "<escrow-operator-nostr-pubkey>",
  "evmAddress": "<eip55-checksummed-address>",
  "contractAddress": "<deployed-escrow-contract-address>",
  "contractBytecodeHash": "<sha256-of-runtime-bytecode>",
  "chainId": 30,
  "maxDuration": 31536000,
  "type": "EVM",
  "feePercent": 1.0,
  "tokenFeeHints": {
    "native": { "baseFee": 0, "maxFee": 0, "minFee": 0 },
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": {
      "baseFee": 50000,
      "maxFee": 1000000,
      "minFee": 10000,
    },
  },
}
```

| Field                  | Type    | Description                                                                                                                       |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pubkey`               | string  | The escrow operator's Nostr hex public key.                                                                                       |
| `evmAddress`           | string  | The operator's EVM address (EIP-55 checksum).                                                                                     |
| `contractAddress`      | string  | Deployed escrow smart contract address.                                                                                           |
| `contractBytecodeHash` | string  | SHA-256 hash of the contract's runtime bytecode. Clients use this to verify the contract matches a known, audited implementation. |
| `chainId`              | integer | EVM chain ID (e.g. `30` for Rootstock mainnet).                                                                                   |
| `maxDuration`          | integer | Maximum escrow lock duration in seconds.                                                                                          |
| `type`                 | string  | Contract type. Currently `"EVM"`.                                                                                                 |
| `feePercent`           | number  | Proportional fee as a percentage (e.g. `1.0` = 1%).                                                                               |
| `tokenFeeHints`        | object  | Per-token fee parameters, keyed by token address or `"native"` for the chain's native asset.                                      |

#### Token Fee Hints

Each entry in `tokenFeeHints` contains:

| Field     | Type    | Description                                 |
| --------- | ------- | ------------------------------------------- |
| `baseFee` | integer | Flat base fee in the token's smallest unit. |
| `maxFee`  | integer | Maximum fee cap. `0` = no maximum.          |
| `minFee`  | integer | Minimum fee floor.                          |

**Fee calculation:** `fee = clamp(floor(amount × feePercent / 100) + baseFee, minFee, maxFee)`

### Tags

```json
["d", "<contractAddress>"]
```

## Escrow Method (`kind:17388`)

Published by both buyers and sellers to declare which escrow services they trust and which payment forms they accept.

This event is replaceable per pubkey. Implementations SHOULD publish one current escrow method event per user. The event content is empty.

### Tags

| Tag | Format                                      | Description                                                        |
| --- | ------------------------------------------- | ------------------------------------------------------------------ |
| `p` | `["p", "<escrow-pubkey>"]`                  | Trusted escrow operator pubkey. Repeat for multiple.               |
| `c` | `["c", "<bytecode-hash>"]`                  | Accepted contract bytecode hash. Repeat for multiple.              |
| `o` | `["o", "<denomination>", "<token-tag-id>", "<app-id?>"]` | Accepted payment form mapping a denomination to a concrete token location. The optional fourth element scopes forms to an application. |

#### Payment Form Tags

The `o` tag maps a denomination code (e.g. `"BTC"`, `"USD"`) to an on-chain token identifier:

```json
["o", "BTC", "30:0x0000000000000000000000000000000000000000", "<app-id>"]
```

The token tag ID format is `<chainId>:<tokenAddress>`. The zero address (`0x000...`) denotes the chain's native asset. Non-EVM payment rails MAY use their own token tag IDs, such as `"BTC"` for Lightning-denominated BTC.

When present, `<app-id>` scopes the payment form to an application.

### Example

```jsonc
{
  "kind": 17388,
  "pubkey": "<seller-pubkey>",
  "tags": [
    ["p", "abc123..."],
    ["p", "def456..."],
    ["c", "a1b2c3d4e5..."],
    ["o", "BTC", "30:0x0000000000000000000000000000000000000000", "example"],
    ["o", "USD", "30:0xdAC17F958D2ee523a2206206994597C13D831ec7", "example"],
  ],
  "content": "",
  // ...
}
```

## Escrow Service Selected (`kind:30302`)

Created by the buyer to record the chosen escrow service and the seller's escrow method for a trade.

In private negotiation flows this event is usually sent as a signed child event inside a private `kind:1327` structured-message rumor tagged `["conversation", "<trade-id>"]` and delivered with NIP-59 gift wraps, rather than being broadcast as a standalone public event. Implementations MAY publish it as a standalone event when the trade context is intended to be public.

### Tags

| Tag | Format | Description |
| --- | ------ | ----------- |
| `d` | `["d", "<trade-id>"]` | Reservation trade id. The selected escrow event is parameterized by trade. |
| `a` | `["a", "<listing-anchor>"]` | Listing anchor for the trade. SHOULD be included when known. |
| `p` | `["p", "<seller-pubkey>"]` | Seller pubkey. SHOULD be included when known. |

The `d` tag is the only trade identifier carried by this child event. Private message grouping is performed by the enclosing `kind:1327` rumor's `conversation` tag.

### Content

JSON object containing the full serialized Nostr events:

```jsonc
{
  "service": "<JSON string of the EscrowService kind:30303 event>",
  "sellerMethods": "<JSON string of the seller's EscrowMethod kind:17388 event>"
}
```

## Mutual Escrow Resolution

When a buyer and seller wish to transact, their clients SHOULD automatically resolve a mutually trusted escrow:

1. Query both parties' `kind:17388` (Escrow Method) events.
2. Find the intersection of trusted escrow pubkeys (`p` tags).
3. Find the intersection of supported contract bytecode hashes (`c` tags).
4. Query `kind:30303` (Escrow Service) events from mutually trusted pubkeys whose `contractBytecodeHash` matches a mutually supported bytecode.
5. If no mutual match exists, fall back to the seller's trusted escrows.

## On-Chain Escrow Contract

The on-chain escrow contract manages funds with the following lifecycle:

### Trade Lifecycle

```
                ┌──── releaseToCounterparty ────┐
                │                                ▼
(empty) ── createTrade ──► funded ──► released / arbitrated / claimed
                │                        ▲
                │       ┌── arbitrate ───┘
                │       │
                └───────┼── claim (after unlockAt) ──► claimed
```

### Trade Structure

Each trade is identified by a `tradeId` (bytes32) and stores:

| Field       | Type    | Description                                                   |
| ----------- | ------- | ------------------------------------------------------------- |
| `buyer`     | address | The funding party.                                            |
| `seller`    | address | The counterparty receiving goods/services.                    |
| `arbiter`   | address | The escrow operator's EVM address.                            |
| `token`     | address | ERC-20 token address, or `address(0)` for native asset.       |
| `amount`    | uint256 | Total escrowed amount.                                        |
| `unlockAt`  | uint256 | Unix timestamp after which the seller can claim unilaterally. |
| `escrowFee` | uint256 | Flat fee in token units, deducted at settlement.              |

### Operations

| Operation               | Authorized Signer         | Description                                                                                            |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `createTrade`           | Buyer (msg.sender)        | Deposits funds. Native asset via `msg.value`; ERC-20 via `transferFrom`.                               |
| `releaseToCounterparty` | Buyer OR Seller (EIP-712) | Voluntarily sends funds to the other party. If the buyer signs, funds go to the seller and vice versa. |
| `claim`                 | Seller (EIP-712)          | Claims funds after `unlockAt` has passed.                                                              |
| `arbitrate`             | Arbiter (EIP-712)         | Splits funds: `factor/1000` to seller, remainder to buyer. `factor` is `0`–`1000` (0.1% precision).    |
| `withdraw`              | Beneficiary (EIP-712)     | Pulls settled funds from the contract's balance mapping.                                               |

All operations use EIP-712 typed-data signatures, enabling gas-sponsored relay (anyone can broadcast the transaction).

### Settlement

All settlements credit a `balances[recipient][token]` mapping (pull pattern) rather than performing direct transfers. This prevents reentrancy and enables batched withdrawals.

### Arbitration

When a dispute arises:

1. Either party messages the escrow operator via Nostr DMs.
2. The escrow operator reviews the trade context (reservation, listing, payment proof, on-chain state).
3. The operator submits an `arbitrate` transaction with a `factor` value:
   - `0` = full refund to buyer
   - `1000` = all funds to seller
   - `500` = 50/50 split
4. `amountAfterFee = amount - escrowFee`
5. `forwardAmount = (amountAfterFee × factor) / 1000` → credited to seller
6. `amountAfterFee - forwardAmount` → credited to buyer
7. `escrowFee` → credited to arbiter

## Escrow Proof

When a reservation is backed by escrow, the commitment includes an `EscrowProof` in the reservation's `PaymentProof`:

```jsonc
{
  "txHash": "<evm-transaction-hash>",
  "escrowService": "<JSON string of the EscrowService kind:30303 event>",
  "hostsEscrowMethods": "<JSON string of the host's EscrowMethod kind:17388 event>"
}
```

### Verification

Clients and escrow operators MUST verify escrow proofs:

1. Validate the `EscrowService` event signature and pubkey.
2. Verify the host's `EscrowMethod` event lists the escrow pubkey in a `p` tag.
3. Verify the host's `EscrowMethod` event lists the contract bytecode hash in a `c` tag.
4. Query on-chain for the `TradeCreated` event matching `txHash`.
5. Verify the on-chain funded amount covers the reservation cost (accounting for token denomination and decimals).
6. Verify the host's `EscrowMethod` accepts the on-chain token for the reservation's denomination.

## Payment Integration

### Funding (Lightning → On-Chain)

Buyers MAY fund escrow via Lightning using submarine swaps (e.g. Boltz):

1. Build a swap-in request with post-claim calls: `ERC20.approve` (if token) + `createTrade`.
2. Buyer pays the Lightning invoice.
3. Swap provider claims the HTLC and atomically executes the on-chain escrow funding.

### Withdrawal (On-Chain → Lightning)

Settled funds MAY be withdrawn to Lightning via reverse submarine swaps:

1. Build a `withdraw` call as a pre-lock call in a swap-out operation.
2. Atomically execute: `withdraw()` from escrow → `lock()` into swap contract.
3. Swap provider pays a Lightning invoice to the beneficiary.

## Related NIPs

- [NIP-01](01.md) — Event structure and parameterized replaceable events.
- [NIP-17](17.md) — Private message rumor kind `14`.
- [NIP-44](44.md) — Encryption scheme.
- [NIP-59](59.md) — Gift wrap.
