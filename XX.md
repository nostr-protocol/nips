NIP-XX
======

Ark Zaps
--------

`draft` `optional`

This NIP defines Ark zaps: tips on Nostr paid with an off-chain [Ark](https://ark-protocol.org) payment, next to
[NIP-57](57.md) Lightning zaps and [NIP-61](61.md) nutzaps.

It defines three event kinds:

| kind    | name              | published by                            |
| ------- | ----------------- | --------------------------------------- |
| `10740` | Ark zap info      | the recipient                           |
| `9740`  | Ark zap           | the sender, after paying                |
| `9741`  | Ark zap receipt   | the recipient, or their receipt key     |

The kind numbers are placeholders.

## Motivation

Two users of the same Ark server can pay each other in seconds. The server cosigns the payment and holds it until
the recipient's wallet collects it, so the recipient does not have to be online. No round, on-chain transaction or
Lightning route is needed. This is a good fit for tips, which are small and frequent. In one 24-hour sample of
Japanese Nostr, the median zap was 18 sats.

Ark wallets (Bark, Arkade, Wavelength) can already send and receive NIP-57 zaps over Lightning through their Ark
server's gateway. But a Lightning zap between two users of the same Ark server still pays a Lightning fee, makes a
liquidity round trip through the server, and needs an LNURL server that is always online for the recipient. An Ark
zap pays the recipient directly.

An Ark payment cannot be verified by third parties. There is no public ledger, no preimage, and no token that a
mint could check. Only the sender, the recipient and the Ark server see it. So this NIP follows NIP-57's trust
model: the recipient's side confirms the payment by signing a receipt. The difference is that the recipient signs
the receipt with a key they chose, not one held by a separate LNURL provider.

## Terms

- **Ark server**: the operator that cosigns a wallet's off-chain transactions. It is identified by its 33-byte
  compressed secp256k1 public key, in lowercase hex.
- **Ark address**: a [BOAT-0001](https://github.com/ark-protocol/boats/blob/master/boat-0001.md) address: bech32m
  with human-readable part `ark` (mainnet) or `tark` (test networks). It commits to one Ark server. For a version 0
  address, the address `server_key` is the x-only form of the server key. For a version 1 address, the address
  `ark_id` is the first 4 bytes of SHA-256 of the server key. An Ark address has no amount and no expiry, and it
  can be paid more than once.
- **VTXO outpoint**: the `<txid>:<vout>` identifier of a VTXO, with the txid as 64 lowercase hex characters and the
  vout in decimal.
- **Settled**: the Ark server has cosigned the payment, and the recipient's wallet holds the received VTXOs and can
  spend them. This is the meaning used in the
  [NWC Ark Payments](https://github.com/nostr-wallet-connect/nwc/pull/11) extension.

An off-chain Ark payment can only be made between two users of the same Ark server. Between different Ark servers,
users zap each other over Lightning with NIP-57 (see [Fallback](#fallback)).

## Ark zap info (`kind:10740`)

A user who wants to receive Ark zaps publishes a replaceable event of kind `10740`.

```json
{
  "kind": 10740,
  "pubkey": "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",
  "created_at": 1792744000,
  "content": "",
  "tags": [
    ["ark", "ark1pwh9vsmezqqpharv69q4z8m6x364d5m5prnmcalcalq9pdmzw0y7mpveck4pcfhezqypczkrrj3lkx5ue4qrf4jc7ztpt9htdttmh2judhqnu7aue8p0y9mqkr4cf5", "02037188bdd7579a0cd0b22a51110986df1ea08e30192658fe0e219590e4a723d3", "https://ark.example.com"],
    ["ark", "ark1qzpq904am6clw3pgqwyh4p02708fy4xs0hcpwt7rwfdttuxsjameetl3ujgrw8089sl27rtp79aqcl0xspkahwnm4teg5lmhe47pxulw9m6rn8", "038202bebddeb1f7442803897a85eaf3ce9254d07df0172fc3725ab5f0d097779c"],
    ["receipt-key", "15103c9a63adc4671d8af5ef070c382c17671c085e1715a811baf61f3eac360e"],
    ["alt", "Ark zap info"]
  ],
  "id": "81c5b3c373df18087534368a381d6050d5fc72c7e2bf0290e8d0555d28e70318",
  "sig": "fe9f42010f4300d86c82bb6dde11ba02855f7bd94235f73122484fb3b450641a2f50899b03abe0248e659c764e4e48ae91c3b3045e13cc986f28f48edfa74e45"
}
```

- `ark` (one or more): `["ark", "<ark address>", "<ark server pubkey>", "<ark server url>"]`.
  - The address MUST commit to the server key, as described under [Terms](#terms).
  - The server key is REQUIRED. It is the value an [NWC](47.md) wallet reports as `get_info.ark.server_pubkey`.
  - The server URL is OPTIONAL. Clients MAY show it, for example to tell a sender which Ark server to join.
  - A user with wallets on several Ark servers lists one `ark` tag per server. A user SHOULD NOT list more than one
    `ark` tag for the same server.
- `receipt-key` (zero or one): the x-only public key, in hex, that signs this user's receipts and that senders
  encrypt payment references to. It lets a wallet service confirm zaps without holding the user's Nostr key. If it
  is absent, the user's own Nostr key does both jobs. It SHOULD NOT be changed often, because receipts signed by an
  old key can no longer be verified against the current event (see [Security](#security-and-privacy-considerations)).

By publishing this event, the user agrees to receive Ark zaps on the listed servers and to confirm them with
receipts. Senders MUST NOT send Ark zaps to a server that the recipient does not list.

The listed address is static, so every Ark zap to it pays the same VTXO key. Users MAY rotate it at any time by
publishing a new `kind:10740` event. Their wallet MUST keep accepting payments to old addresses (see
[Security](#security-and-privacy-considerations)).

Senders publish Ark zaps to the recipient's [NIP-65](65.md) read relays. Recipients and their receipt-key holders
read from those relays.

## Ark zap (`kind:9740`)

The sender publishes an Ark zap after the payment has settled.

```json
{
  "kind": 9740,
  "pubkey": "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
  "created_at": 1792744321,
  "content": "Great post!",
  "tags": [
    ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
    ["e", "9ae37aa68f48645127299e9453eb5d908a0cbb6058ff340d528ed4d37c8994fb", "wss://relay.example.com"],
    ["k", "1"],
    ["amount", "21000"],
    ["ark-server", "02037188bdd7579a0cd0b22a51110986df1ea08e30192658fe0e219590e4a723d3"],
    ["ark-payment", "Am5SAdWK6ym5dsuaRZ2i7FPjuU+npJR6PK0wT+5w8FpBrbEDlIBIk32ZuzW49QpijvwL1Kiul97oRNLsAB/L+iQRPc7QI0MkWPH2m4MsjpZIL/x0nI6iQLrxJIR6RHGzCPhRit8/3KPy/gOalE2QC5rxJucufioGTaWqgMIBdbTs8W62I3sT9Peh9CYLqqIivG7k0BNm4joXu3i4ulOSzy9ZAA=="],
    ["relays", "wss://relay.example.com", "wss://yabu.me"],
    ["alt", "Ark zap: 21 sats"]
  ],
  "id": "764cda3690e097fda47ace01a3852eace890aac15884529ecd4d634d97dac4d8",
  "sig": "2471268affa04caa75df601ff045fc0083b3a91e9dab26e9a9cddc2a3c1638d005a144baa5c5b5c38ee771014d51491e61c2a44615cf2aa9e2f00fd80d8d682e"
}
```

- `content`: an optional comment.
- `p` (exactly one): the recipient.
- `e` (zero or one) and `a` (zero or one): the event being zapped, as in NIP-57. An Ark zap MUST NOT have both. If
  neither is present, the zap is for the recipient's profile.
- `k` (optional): the kind of the event being zapped.
- `amount` (exactly one): the amount the recipient receives, in millisatoshis. Ark payments move whole satoshis, so
  it MUST be a positive multiple of 1000. Fees are not included.
- `ark-server` (exactly one): the Ark server the payment was made on. It MUST be the server key of one of the `ark`
  tags in the recipient's `kind:10740`.
- `ark-payment` (exactly one): the payment reference, [NIP-44](44.md) encrypted (see below).
- `relays` (optional): relays the recipient SHOULD also publish the receipt to, as in NIP-57.
- `alt`: a [NIP-31](31.md) description.

### Payment reference

The `ark-payment` tag lets the recipient find the payment in their wallet. Its plaintext is a JSON object:

```json
{
  "address": "ark1pwh9vsmezqqpharv69q4z8m6x364d5m5prnmcalcalq9pdmzw0y7mpveck4pcfhezqypczkrrj3lkx5ue4qrf4jc7ztpt9htdttmh2judhqnu7aue8p0y9mqkr4cf5",
  "vtxos": ["d9b1d0e6ea53ab1400edc210615cb1b8b1fa67edfa0fd3db876209bfe28e6066:0"]
}
```

- `vtxos` (REQUIRED): the outpoints of every VTXO that the payment created for the recipient. A single payment can
  create more than one VTXO, for example when the sender's wallet chains several of its own VTXOs to cover the
  amount. Change VTXOs that went back to the sender MUST NOT be listed.
- `address` (REQUIRED): the Ark address that was paid.

The sender encrypts the JSON with NIP-44, from the zap event's `pubkey` to the recipient's `receipt-key`, or to the
recipient's own pubkey if there is no `receipt-key`.

The reference is encrypted for two reasons. First, it binds the payment to the sender's key: anyone who copied the
ciphertext into their own event would fail to decrypt it, and without the ciphertext nobody else learns the VTXO
outpoints, so nobody can claim someone else's payment as their zap. Second, VTXO outpoints stay private between the
sender, the recipient and the Ark server.

## Ark zap receipt (`kind:9741`)

When the payment is settled, the recipient, or whoever holds the `receipt-key`, publishes a receipt.

```json
{
  "kind": 9741,
  "pubkey": "15103c9a63adc4671d8af5ef070c382c17671c085e1715a811baf61f3eac360e",
  "created_at": 1792744330,
  "content": "",
  "tags": [
    ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
    ["P", "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322"],
    ["e", "9ae37aa68f48645127299e9453eb5d908a0cbb6058ff340d528ed4d37c8994fb", "wss://relay.example.com"],
    ["k", "1"],
    ["amount", "21000"],
    ["ark-server", "02037188bdd7579a0cd0b22a51110986df1ea08e30192658fe0e219590e4a723d3"],
    ["ark-zap", "764cda3690e097fda47ace01a3852eace890aac15884529ecd4d634d97dac4d8", "wss://relay.example.com"],
    ["alt", "Ark zap receipt: 21 sats"]
  ],
  "id": "dbe4dbde010f5d49dd5ded8d46e1e889f03b5f3de49147d9f53941b219363608",
  "sig": "39bdbff0a7a363128fa49513ecf9a35317909fa9f74f5058687e17608822bced8a52562dc179e26eb89ef77a8eb2f0bef8b6eb2303f6c3aadd3787ed8dadef7b"
}
```

- `pubkey`: the recipient, or the `receipt-key` from the recipient's `kind:10740`.
- `p`, `e`, `a`, `k` and `ark-server`: copied from the Ark zap.
- `P`: the Ark zap's `pubkey` (the sender).
- `amount`: the settled amount the recipient received from the referenced VTXOs, in millisatoshis. It MUST NOT be
  greater than the Ark zap's `amount`.
- `ark-zap` (exactly one): the id of the Ark zap, with an optional relay hint.
- `content`: empty.

Copying the target tags makes a receipt countable on its own. A client can total the zaps on a note with a single
filter, as with NIP-57.

### Confirming an Ark zap

The recipient's wallet, or a service that holds the `receipt-key` and can see the wallet's incoming payments,
watches for `{"kinds": [9740], "#p": ["<recipient>"]}` on the recipient's read relays. For each Ark zap it:

1. checks that `ark-server` is one of its listed servers and that `amount` is a positive multiple of 1000;
2. decrypts `ark-payment`. If decryption fails, it ignores the zap;
3. checks that every listed VTXO is an incoming VTXO in its wallet that was received on `address`, and is settled;
4. checks that none of the listed VTXOs has already been used to confirm another Ark zap;
5. records the VTXOs as used and publishes a `kind:9741` receipt, in that order, as one atomic step. The receipt
   `amount` is the sum of the listed VTXOs, capped at the Ark zap's `amount`.

A VTXO confirms at most one Ark zap. If two Ark zaps list the same VTXO, only the first one processed is confirmed.

If a VTXO has not arrived yet, the wallet SHOULD sync with its Ark server before deciding. It MAY retry later. Ark
zaps to an offline recipient stay unconfirmed until the recipient's wallet or service comes back online.

The receipt SHOULD be published to the recipient's [NIP-65](65.md) write relays, to the relays in the zap's
`relays` tag, and to the relay where the Ark zap was seen.

The recipient MUST NOT publish a receipt for a payment that is not settled, or with an amount of zero. If the
settled total is below the zap's `amount`, the receipt shows the lower amount.

## Sending an Ark zap

1. Fetch the recipient's `kind:10740`. If there is none, or none of its `ark` tags is for the sender's Ark server,
   use the [fallback](#fallback).
2. Pick the `ark` tag whose server key is the sender wallet's Ark server. Check that the address is valid for the
   wallet's network and commits to that key. If it does not, do not pay it.
3. Pay the address with an off-chain Ark payment, for the amount the recipient should receive.
4. Wait until the payment is settled, and get the outpoints of the VTXOs it created for the recipient.
5. Build and encrypt the payment reference, then sign and publish the `kind:9740` to the recipient's NIP-65 read
   relays. The sender MAY also publish it to its own write relays.

If the sender's wallet cannot return the recipient VTXO outpoints, it cannot make a confirmable Ark zap and SHOULD
use the fallback instead.

For an anonymous Ark zap, the sender signs the `kind:9740` with a new, random key and encrypts the reference from
that key. The receipt then shows that key in `P`.

When the zapped event has NIP-57 `zap` split tags, the sender MAY split the amount the same way. It sends a separate
payment and a separate `kind:9740` to each recipient that it can reach over Ark, and uses the fallback for the rest.

### With Nostr Wallet Connect

With the [NWC Ark Payments](https://github.com/nostr-wallet-connect/nwc/pull/11) extension:

1. `get_info`: `methods` includes `pay_ark_address` and `lookup_payment`, and `ark.server_pubkey` is the wallet's
   Ark server. Compare it with the server keys in the recipient's `kind:10740`.
2. `pay_ark_address` with the `address`, `amount` in millisatoshis, and a random `idempotency_key`. A retry with the
   same key never pays twice.
3. If the state is `pending`, poll `lookup_payment` with `{"payment_type": "ark", "lookup": {"idempotency_key": ...}}`
   until it is `settled`.
4. Read `details.vtxos` from the settled `lookup_payment` record. These are the outpoints for the payment
   reference.

On the recipient's side, a client or service with an NWC connection receives `payment_received` notifications with
`payment_type: "ark"`, and uses `details.vtxos` and `details.address` to match Ark zaps.

## Fallback

When the sender and recipient are not on the same Ark server, the sender zaps with NIP-57 (or NIP-61, if both
support it). An Ark wallet pays the NIP-57 invoice over Lightning through its Ark server's gateway. With NWC, that
is `pay_invoice`. The recipient receives it like any other Lightning payment.

A client that supports several rails SHOULD prefer, in order:

1. an Ark zap, when the sender's Ark server is listed in the recipient's `kind:10740`;
2. a NIP-57 zap, when the recipient has a Lightning address;
3. any other zap method both sides support.

The user does not need to pick a rail: a zap button sends one zap, over the first rail on this list that works.

## Counting and displaying Ark zaps

To count the Ark zaps on an event, a client queries `{"kinds": [9741], "#e": ["<event id>"]}` (`#a` for
addressable events, and `#p` for profile zaps, ignoring receipts that also have `e` or `a`). For each receipt it:

1. checks the signature, and that the receipt has exactly one `p`, one `amount` and one `ark-zap` tag;
2. checks that the receipt `pubkey` is the `p` recipient, or the `receipt-key` in the recipient's current
   `kind:10740`;
3. counts each `ark-zap` id at most once.

The receipt's `amount` is the verified amount. Clients SHOULD add it to the event's zap total together with NIP-57
and NIP-61 zaps, in sats. They MAY mark Ark zaps with their own icon.

To show the comment and check who sent it, a client fetches the Ark zap by its `ark-zap` id. It SHOULD check that
the Ark zap's `pubkey` equals the receipt's `P`, and that the `p`, `e`/`a` and `ark-server` tags match. If they do
not match, it MUST NOT show the comment as the sender's.

A `kind:9740` without a valid receipt is unconfirmed. It is only the sender's claim. Clients MUST NOT add it to zap
totals. They MAY show it separately as pending, for example to the sender while they wait for the receipt.

## Security and privacy considerations

- **Trust.** A receipt means the recipient's side says it received the payment. Like a NIP-57 zap receipt, it is
  not a proof of payment, and a recipient can publish false receipts to make their own totals look bigger. The
  difference from NIP-57 is that the signer is the recipient or a key the recipient chose, not a separate LNURL
  provider. A sender cannot inflate anyone's totals, because an unconfirmed `kind:9740` is never counted.
- **Ark server trust.** A settled Ark payment is off-chain. The received VTXOs depend on the Ark server until the
  recipient's wallet refreshes them, and tiny VTXOs may not be worth exiting on-chain. Expiry and refresh are wallet
  maintenance and are out of scope.
- **Abandoned addresses.** An Ark address cannot refuse payment. If a user stops using an Ark server, they MUST
  remove its `ark` tag from their `kind:10740` (or delete the event). Otherwise zaps keep arriving on a server their
  wallet no longer collects from, where they may expire. This is like NIP-61, where tokens on an unlisted mint may be
  lost.
- **Address reuse.** The static address links all Ark zaps to one VTXO key on the Ark server. Ark zaps are public
  anyway, but the server can also link the user's Nostr identity to the VTXOs they later spend. Users who care can
  rotate the address. Nothing in an Ark zap touches the chain, so this does not link a Nostr identity to on-chain
  UTXOs.
- **Payment references.** VTXO outpoints are never public. They are encrypted to the recipient, and the receipt
  does not repeat them.
- **Receipt-key rotation.** Clients check receipts against the recipient's current `receipt-key`. If the key
  changes, older receipts no longer verify. Users SHOULD keep the same `receipt-key` while they use the same wallet.
- **Double counting.** A wallet confirms each VTXO at most once, and clients count each `ark-zap` id at most once.

## Relationship to other specifications

- [NIP-57](57.md): same zap targets (`p`, `e`, `a`, `k`, `zap` splits), `amount` in millisatoshis, and a
  recipient-side receipt. Ark zaps fall back to NIP-57 between different Ark servers.
- [NIP-61](61.md): the same recipient opt-in (a replaceable info event listing accepted servers, like `kind:10019`
  lists mints) and a sender-published event. NIP-61 tokens can be checked offline. Ark payments cannot, so this NIP
  adds a receipt.
- [NWC Ark Payments](https://github.com/nostr-wallet-connect/nwc/pull/11): `get_info.ark.server_pubkey`,
  `pay_ark_address` with `idempotency_key`, `lookup_payment` `details.vtxos`, and the same meaning of "settled".
- [Blossom BUD-07 `X-Ark`](https://github.com/hzrd149/blossom/pull/116): the same Ark server key and address checks.
  In BUD-07, the payee issues a fresh address for each request and verifies the payment in its own wallet. In an
  Ark zap, the recipient also verifies the payment in its own wallet, but finds it by VTXO outpoint, because an
  offline recipient cannot hand out a fresh address.
