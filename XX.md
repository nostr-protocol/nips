NIP-XX
======

Zaps over BIP-321 rails
-----------------------

`draft` `optional`

This NIP defines zaps that can be paid over any rail a recipient offers in a [BIP-321](https://github.com/bitcoin/bips/blob/master/bip-0321.mediawiki) URI: an off-chain [Ark](https://ark-protocol.org) payment, Lightning, or on-chain. It sits next to [NIP-57](57.md) Lightning zaps and [NIP-61](61.md) nutzaps.

It defines two event kinds:

| kind   | name                    | published by                          |
| ------ | ----------------------- | ------------------------------------- |
| `9740` | BIP-321 zap             | the sender, after paying              |
| `9741` | BIP-321 zap receipt     | the recipient, or their receipt key   |

The recipient advertises where to pay in their [NIP-A3](A3.md) `kind:10133` payment targets, with a `bip321` entry and a `receipt-key` tag. The kind numbers are placeholders.

## Motivation

A Nostr user already has one place to say how they want to be paid: a `bip321` entry in `kind:10133`, holding a static BIP-321 URI such as `bitcoin:?ark=<ark address>&lno=<bolt12 offer>`. A client already has one way to pay such a URI: [NWC-321](https://github.com/nostr-wallet-connect/nwc/blob/main/321.md) `pay`, where the wallet picks the instruction it can pay. A zap should not need a third mechanism per rail. This NIP adds only what a zap needs on top: a public, targeted event from the sender, and a countable receipt from the recipient.

Ark is the motivating case. Two users of the same Ark server can pay each other in seconds; the server cosigns the payment and holds it until the recipient's wallet collects it, so the recipient does not have to be online. A NIP-57 zap between the same two users still pays a Lightning fee, makes a liquidity round trip through the server, and needs an LNURL server that is always online for the recipient. Zaps are small (in one 24-hour sample of Japanese Nostr, the median zap was 18 sats), so that overhead matters. Users on different Ark servers, and users of plain Lightning or on-chain wallets, pay the other instructions in the same URI through the same flow.

None of these payments can be checked by third parties from public data: an Ark payment has no public ledger, a Lightning payment hash is not public, and an on-chain output does not say who paid it or for what. So this NIP keeps NIP-57's trust model: the recipient's side confirms the payment by signing a receipt. The receipt is signed by a key the recipient chose, not by a separate LNURL provider.

## Terms

- **BIP-321 URI**: a `bitcoin:` URI as defined in BIP-321. It can carry several payment instructions, and the payer pays exactly one of them.
- **Rail**: the kind of payment that settled a zap: `ark`, `lightning` or `onchain`.
- **Ark address**: a [BOAT-0001](https://github.com/ark-protocol/boats/blob/master/boat-0001.md) address (`ark1…` or `tark1…`). It commits to one Ark server, has no amount and no expiry, and can be paid more than once. In a BIP-321 URI it is an `ark=` instruction.
- **VTXO outpoint**: the `<txid>:<vout>` identifier of a VTXO, with the txid as 64 lowercase hex characters and the vout in decimal.
- **Settled**:
  - `ark`: the Ark server has cosigned the payment, and the recipient's wallet holds the received VTXOs and can spend them, as in the [NWC Ark Payments](https://github.com/nostr-wallet-connect/nwc/pull/11) extension.
  - `lightning`: the recipient's wallet has received the payment and released the preimage.
  - `onchain`: the transaction has at least one confirmation, or more under the recipient's own policy.

## Recipient: `kind:10133`

A user who wants to receive zaps under this NIP publishes a [NIP-A3](A3.md) `kind:10133` event with:

- one `payto` entry of type `bip321`, whose value is a static BIP-321 URI, and
- exactly one `receipt-key` tag.

```json
{
  "kind": 10133,
  "pubkey": "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",
  "created_at": 1792744000,
  "content": "",
  "tags": [
    ["payto", "bip321", "bitcoin:?ark=ark1pwh9vsmezqqpjy9akejayl2vvcse6he97rn40g84xrlvrlnhayuuyefrp9nse2yspqqjl5wpy&lno=lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2q3skgumxzcssyeyreggqmet8r4k6krvd3knppsx6c8v5g7tj8hcuq8w6ddl7xu"],
    ["payto", "bip353", "alice@example.com"],
    ["payto", "lightning", "alice@example.com"],
    ["receipt-key", "15103c9a63adc4671d8af5ef070c382c17671c085e1715a811baf61f3eac360e"]
  ],
  "id": "81c5b3c373df18087534368a381d6050d5fc72c7e2bf0290e8d0555d28e70318",
  "sig": "fe9f42010f4300d86c82bb6dde11ba02855f7bd94235f73122484fb3b450641a2f50899b03abe0248e659c764e4e48ae91c3b3045e13cc986f28f48edfa74e45"
}
```

- `payto` `bip321`: a BIP-321 URI with static, reusable instructions only, as NIP-A3 requires: for example `ark=` (one per Ark server the user accepts), `lno=` (a BOLT12 offer), `sp=` (silent payments) or an on-chain address. It has no `lightning=` BOLT11 invoice and no `amount`. If the event has more than one `bip321` entry, senders use the first.
- `receipt-key`: the x-only public key, in hex, that signs this user's receipts and that senders encrypt payment references to. It MAY be the user's own pubkey. A different key lets a wallet service confirm zaps without holding the user's Nostr key, for example when that key lives in a remote signer.

The `receipt-key` tag is the opt-in. By publishing it next to a `bip321` entry, the user agrees to receive zaps on the rails in that URI and to confirm them with receipts. A `kind:10133` without a `receipt-key` is a payment target, not a zap target: clients can still pay it, but they MUST NOT publish a `kind:9740` for it.

Other `payto` entries keep their NIP-A3 meaning. A `bip353` name resolves to the same kind of BIP-321 URI. A `lightning` entry (Lightning address) is used for NIP-57 (see [Choosing a zap method](#choosing-a-zap-method)).

The recipient's wallet MUST keep accepting payments on every instruction it has published, for as long as it can still collect them. A user who stops using an Ark server, offer or address MUST remove it from the URI.

Senders publish zaps to the recipient's [NIP-65](65.md) read relays. Recipients and receipt-key holders read from those relays.

## BIP-321 zap (`kind:9740`)

The sender publishes a zap after paying. For `ark` and `lightning` this is after the payment has settled. For `onchain` it is after the transaction has been broadcast.

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
    ["rail", "ark"],
    ["payment", "Am5SAdWK6ym5dsuaRZ2i7FPjuU+npJR6PK0wT+5w8FpBrbEDlIBIk32ZuzW49QpijvwL1Kiul97oRNLsAB/L+iQRPc7QI0MkWPH2m4MsjpZIL/x0nI6iQLrxJIR6RHGzCPhRit8/3KPy/gOalE2QC5rxJucufioGTaWqgMIBdbTs8W62I3sT9Peh9CYLqqIivG7k0BNm4joXu3i4ulOSzy9ZAA=="],
    ["relays", "wss://relay.example.com", "wss://yabu.me"],
    ["alt", "Zap: 21 sats"]
  ],
  "id": "764cda3690e097fda47ace01a3852eace890aac15884529ecd4d634d97dac4d8",
  "sig": "2471268affa04caa75df601ff045fc0083b3a91e9dab26e9a9cddc2a3c1638d005a144baa5c5b5c38ee771014d51491e61c2a44615cf2aa9e2f00fd80d8d682e"
}
```

- `content`: an optional comment.
- `p` (exactly one): the recipient.
- `e` (zero or one) and `a` (zero or one): the event being zapped, as in NIP-57. A zap MUST NOT have both. If neither is present, the zap is for the recipient's profile.
- `k` (optional): the kind of the event being zapped.
- `amount` (exactly one): the amount the recipient receives, in millisatoshis, not counting fees. For `ark` and `onchain` it MUST be a positive multiple of 1000.
- `rail` (exactly one): `ark`, `lightning` or `onchain`.
- `payment` (exactly one): the payment reference, [NIP-44](44.md) encrypted (see below).
- `relays` (optional): relays the recipient SHOULD also publish the receipt to, as in NIP-57.
- `alt`: a [NIP-31](31.md) description.

### Payment reference

The `payment` tag lets the recipient find the payment in their wallet. Its plaintext is a JSON object that depends on the rail:

```jsonc
// ark: the address paid and the VTXOs the payment created for the recipient
{"address": "ark1pwh9vsmez...", "vtxos": ["d9b1d0e6ea53ab1400edc210615cb1b8b1fa67edfa0fd3db876209bfe28e6066:0"]}

// lightning: the payment hash of the invoice that was paid
{"payment_hash": "a4e1b7c2..."}

// onchain: the transaction that pays the recipient
{"txid": "6f0c1e2a..."}
```

- `ark`: `vtxos` lists every VTXO the payment created for the recipient (several if the sender's wallet chained VTXOs), never the sender's change. `address` is the Ark address that was paid.
- `lightning`: `payment_hash` is the hash of the invoice the sender's wallet paid. For a BOLT12 offer this is the invoice fetched from the offer.
- `onchain`: `txid` is the transaction that pays the recipient. The recipient finds its own outputs in it.

The sender encrypts the JSON with NIP-44, from the zap event's `pubkey` to the recipient's `receipt-key`.

The reference is encrypted for two reasons. It binds the payment to the sender's key: anyone who copies the ciphertext into their own event fails to decrypt it, and nobody else learns the reference, so nobody can claim someone else's payment as their zap. It also keeps VTXO outpoints, payment hashes and txids private between the sender, the recipient (and, for Ark, the Ark server).

## BIP-321 zap receipt (`kind:9741`)

When the payment is settled, the holder of the `receipt-key` publishes a receipt.

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
    ["rail", "ark"],
    ["zap-event", "764cda3690e097fda47ace01a3852eace890aac15884529ecd4d634d97dac4d8", "wss://relay.example.com"],
    ["alt", "Zap receipt: 21 sats"]
  ],
  "id": "dbe4dbde010f5d49dd5ded8d46e1e889f03b5f3de49147d9f53941b219363608",
  "sig": "39bdbff0a7a363128fa49513ecf9a35317909fa9f74f5058687e17608822bced8a52562dc179e26eb89ef77a8eb2f0bef8b6eb2303f6c3aadd3787ed8dadef7b"
}
```

- `pubkey`: the `receipt-key` from the recipient's `kind:10133`.
- `p`, `e`, `a`, `k` and `rail`: copied from the zap.
- `P`: the zap's `pubkey` (the sender).
- `amount`: the settled amount the recipient received from the referenced payment, in millisatoshis. It MUST NOT be greater than the zap's `amount`.
- `zap-event` (exactly one): the id of the zap, with an optional relay hint. It is a separate tag so that `#e` on a receipt always means the zapped event.
- `content`: empty.

Copying the target tags makes a receipt countable on its own: a client totals the zaps on a note with a single filter, as with NIP-57. The receipt kind is the same for every rail.

### Confirming a zap

The receipt-key holder is the recipient's wallet, or a service that holds the `receipt-key` and can see the wallet's incoming payments (for example over an NWC connection with `lookup_payment` and notifications). It watches for `{"kinds": [9740], "#p": ["<recipient>"]}` on the recipient's read relays. For each zap it:

1. checks that `rail` is a rail its URI offers and that `amount` is valid for that rail;
2. decrypts `payment`. If decryption fails, it ignores the zap;
3. finds the payment in its wallet and checks that it is incoming and settled:
   - `ark`: every listed VTXO was received on `address`, an address in its published URI;
   - `lightning`: an incoming payment with this `payment_hash` (with NWC, `lookup_payment` by payment hash);
   - `onchain`: the transaction pays outputs it owns, through the URI's address or silent-payment key;
4. checks that the payment has not already confirmed another zap;
5. records the payment as used and publishes a `kind:9741` receipt, in that order, as one atomic step. The receipt `amount` is what the payment delivered, capped at the zap's `amount`.

A payment (a set of VTXOs, a payment hash, or a txid) confirms at most one zap. If two zaps reference the same payment, only the first one processed is confirmed.

If the payment has not arrived yet, the holder SHOULD sync its wallet (for Ark, with its Ark server) before deciding, and MAY retry later. An on-chain zap stays unconfirmed until its transaction confirms. Zaps to an offline recipient stay unconfirmed until the receipt-key holder is back online.

The receipt SHOULD be published to the recipient's NIP-65 write relays, to the relays in the zap's `relays` tag, and to the relay where the zap was seen.

The holder MUST NOT publish a receipt for a payment that is not settled, or with an amount of zero.

## Sending a zap

1. Fetch the recipient's `kind:10133`. If it has no `bip321` entry or no `receipt-key`, use another zap method (see [Choosing a zap method](#choosing-a-zap-method)).
2. Ask the user for the amount. Pay the URI for that amount. With Nostr Wallet Connect, call NWC-321 `pay` with the URI as `payment`, `amount` in millisatoshis, and no `payer_note` (the comment goes in the zap's `content`, and an Ark instruction cannot carry a note). The wallet chooses the instruction:
   1. an `ark=` address on the wallet's own Ark server: paid off-chain, directly;
   2. otherwise a Lightning instruction (`lno=`), through the wallet's Lightning node or its Ark server's Lightning gateway;
   3. otherwise an on-chain instruction (`sp=` or the address);
   4. if none can be paid, `UNSUPPORTED_PAYMENT_INSTRUCTION`, before any money moves.
3. Wait for the result. If the state is `pending`, poll `lookup_payment` with the returned `transaction_id`.
4. Build the payment reference from the wallet's record:
   - `instruction_type` `ark`: `address` and `vtxos` from the `details` of the settled `lookup_payment` record, as in NWC Ark Payments;
   - `bolt12` (or `bolt11`): `payment_hash` from the result;
   - an on-chain instruction: `txid` from the result.
5. Encrypt the reference to the `receipt-key`, then sign and publish the `kind:9740` to the recipient's NIP-65 read relays. The sender MAY also publish it to its own write relays.

If the sender's wallet cannot return the reference (VTXO outpoints, payment hash or txid), the payment still reaches the recipient as a plain payment, but it cannot be confirmed as a zap. A client that knows this in advance SHOULD use another zap method.

The client never chooses the rail. It does not need to know which Ark server its wallet uses, or whether the wallet supports BOLT12 or on-chain payments.

An Ark payment, and an on-chain payment to a reusable target, cannot be deduplicated by the recipient. Before retrying a `pay` request whose response was lost, the client SHOULD check `lookup_payment` or `list_transactions`.

For an anonymous zap, the sender signs the `kind:9740` with a new, random key and encrypts the reference from that key. The receipt then shows that key in `P`.

When the zapped event has NIP-57 `zap` split tags, the sender MAY split the amount the same way, with a separate payment and a separate `kind:9740` per recipient. Each recipient is zapped with the best method that recipient supports.

## Choosing a zap method

A client that supports several zap methods SHOULD prefer, for each recipient:

1. a zap under this NIP, when the recipient's `kind:10133` has a `bip321` entry and a `receipt-key`, and the sender's wallet supports NWC-321 `pay`;
2. a NIP-57 zap, when the recipient has a Lightning address with NIP-57 support (`lud16` in the profile, or a `lightning` payto entry);
3. any other zap method both sides support, such as NIP-61.

The user does not pick a rail: a zap button sends one zap, with the first method on this list that works. An Ark wallet can pay a NIP-57 invoice through its Ark server's Lightning gateway, so a recipient without a `bip321` entry is still reachable.

## Counting and displaying zaps

To count zaps on an event, a client queries `{"kinds": [9741, 9735], "#e": ["<event id>"]}` (`#a` for addressable events; `#p` for profile zaps, ignoring receipts that also have `e` or `a`). `kind:9735` receipts are checked as NIP-57 describes. For each `kind:9741` receipt it:

1. checks the signature, and that the receipt has exactly one `p`, one `amount`, one `rail` and one `zap-event` tag;
2. checks that the receipt `pubkey` is the `receipt-key` in the recipient's current `kind:10133`;
3. counts each `zap-event` id at most once.

The receipt's `amount` is the counted amount. Clients SHOULD add it to the same zap total as NIP-57 and NIP-61 zaps. They MAY show the rail, for example with an icon.

To show the comment and check who sent it, a client fetches the zap by its `zap-event` id. It SHOULD check that the zap's `pubkey` equals the receipt's `P`, and that its `p`, `e`/`a` and `rail` tags match. If they do not, it MUST NOT show the comment as the sender's.

A `kind:9740` without a valid receipt is unconfirmed: it is only the sender's claim. Clients MUST NOT add it to zap totals. They MAY show it separately as pending, for example to the sender while they wait for the receipt.

## Security and privacy considerations

- **Trust.** A receipt means the recipient's side says it received the payment. Like a NIP-57 zap receipt, it is not a proof of payment, and a recipient can publish false receipts to inflate their own totals. Unlike NIP-57, the signer is a key the recipient chose, not a separate LNURL provider. A sender cannot inflate anyone's totals, because an unconfirmed `kind:9740` is never counted, and an encrypted reference cannot be copied into another sender's zap.
- **Ark server trust.** A settled Ark payment is off-chain. The received VTXOs depend on the Ark server until the recipient's wallet refreshes them, and tiny VTXOs may not be worth exiting on-chain. Expiry and refresh are wallet maintenance and are out of scope.
- **Abandoned instructions.** An Ark address, a BOLT12 offer and an on-chain address cannot refuse a payment. If a user stops using one, they MUST remove it from their URI. Otherwise zaps keep arriving where the wallet no longer collects them; Ark payments in particular may expire on a server the wallet has left.
- **Reuse.** A static Ark address links all zaps to one VTXO key on the Ark server, and a reused on-chain address links them on-chain. Users who care can rotate the URI, prefer `sp=` to a plain on-chain address, or leave on-chain instructions out.
- **On-chain linking.** The payment reference is encrypted, but a receipt publishes an amount and a time. For on-chain zaps, that can be enough to find the transaction and link it to the sender's and recipient's Nostr identities. Clients SHOULD tell users this before an on-chain zap, and recipients MAY leave on-chain instructions out of their URI.
- **Payment references.** VTXO outpoints, payment hashes and txids are never published in the clear. They are encrypted to the receipt key, and the receipt does not repeat them.
- **Receipt-key rotation.** Clients check receipts against the recipient's current `receipt-key`. If the key changes, older receipts no longer verify. Users SHOULD keep the same `receipt-key` while they use the same wallet service.
- **Double counting.** A receipt-key holder confirms each payment at most once, and clients count each `zap-event` id at most once.

## Relationship to other specifications

- [NIP-A3](A3.md): the recipient's `bip321` payto entry in `kind:10133`. This NIP adds the `receipt-key` tag to that event.
- [NIP-57](57.md): same zap targets (`p`, `e`, `a`, `k`, `zap` splits), `amount` in millisatoshis, and a recipient-side receipt. Clients count `kind:9735` and `kind:9741` together, and fall back to NIP-57 for recipients with only a Lightning address.
- [NIP-61](61.md): the recipient opt-in in a replaceable event and a sender-published event. NIP-61 tokens can be checked offline; the rails here cannot, so this NIP adds a receipt.
- [NWC-321](https://github.com/nostr-wallet-connect/nwc/blob/main/321.md): `pay` with a BIP-321 URI, where the wallet picks the instruction.
- [NWC Ark Payments](https://github.com/nostr-wallet-connect/nwc/pull/11): the `ark` instruction for NWC-321 `pay`, the `ark` payment `details` (`address`, `vtxos`), the `vtxo` lookup selector, and the meaning of "settled".
- [Blossom BUD-07 `X-Ark`](https://github.com/hzrd149/blossom/pull/116): the same BIP-321 request and wallet choice, for paid uploads and downloads. There, the payee issues a fresh request each time; here, the request is static and the payment is found by its reference.
