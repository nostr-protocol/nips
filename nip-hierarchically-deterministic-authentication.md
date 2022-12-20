# NIP-Hierarchically-Deterministic-Authentication

`draft` `mandatory` `author:kngako`

## Summary

Hierarchically Deterministic Authentication (hd-auth) is a technique of using bip32 to scale authentication in a decentralized fashion. 
An entity using the scheme publishes it's extended public key (which is now effectively it's public identifier) and effectively 
needs to 1) sign each message it sends, 2) share the derivation path of the public key which can be used to verify the signature of the sent message. 
By doing this others can verify messages produced by or on behalf of the entity through the derivation path.  

For this to work **signature would now need to paired with the associated derivation path** (for the key used to sign) when an entity sends a message.

### Entity (service level entities)

An entity using hd-auth is identified by a extended public keys. This effectively allows the entity to derive multiple extended private keys 
and distribute them to multiple client which can then serve traffic on behalf of the entity (without needing to make calls to a central client).

The setup process for a hd-auth entity is as follows:

- create a wallet using a random mnemonic seed
- generate a hardened xpub to use as entity 'identity'.
- generate client (servers) xprivs derived from entity idendity xpub derivation path
- keep mnemonic seed secure

Keeping mnemonic seed secure can be acheived through airgapps if need be. But as long as the entity trust that their machines 
are not compromised they can just use them like normal.

#### Client

A entity can then have multiple client (servers) working under it.

The setup process for a client is as follows:

- gets a xpriv derived from the entity "identity" xpub.
- signs all messages it produces on behalf of the entity using it's assigned xpriv
- verifies that all signed requests sent to the client were signed with a key derived the entity identity xpub
- keep xpriv secure

The client/servers are online to serve requests and might get compromised. They will probably one day get compromised, this 
ultimately means that the keys need to be revoked when the client gets compromised (touched on later).

### User

Normal users (which are effectively entities themselves) who make use of another entities clients/servers can then share an extended private key which that client/server can use to produce messages on the users behalf.

- creates a wallet using mnemonic seed
- generates an identity xpub using a random derivation path
- registers with a service and provide an xpriv derived from the "identity" xpub (no service can sign messages on "behalf" of user)
- keep wallet secure

## Temporal Keys (Derivation Path Metadata)

All the above is useless if an extended private key is valid forever. So an entity having the ability to derive private keys that have an expiry is crucial (first step to having revocation mechanism).

Xpubs as they are can't contain any metadata not useful in deriving new keys from them. For xpubs to support other use cases metadata was implicity stored through the reservation of certain derivation paths.

This is done in bip44 where the derivation path stores "metadata" of what type of coins the keys it produces are used for.

With this scheme we can then **define a derivation path structure that we can deduce time related data from. This derivation path can the leave the rest of the metadata in the payload but we could define a derivation path scheme to have enough information to know when a key/derivation path expires**

One can also go further and use the derivation path to define ACL features? But nah, that might be pushing it.

### Possible Date Metadata Format

Since derivation paths can be 2147483648 (to support normal + hardened). We could have something like

`MMddYYYYHH` - So 1231999923 (December 31, 9999 23:00) would be the highest supported time value. With this scheme then we can expire keys/xpubs with an hourly precision.

For millisecond precision we might split the time precision into two indexes of a derivation path. `MMddYYYY`/`HHmmSSzz`. This scheme would make the time human readable to a certain extent.


Possible for temporal keys to optional be used to reissue new extended private keys (with a new expiry) as long as the derivation path that is being reissued is not revoked. 

### Revocation

Extended Private Keys having an expiry allow us to now have a possible revocation mechanism. Each entity can share a **REVOKED extended private key derivation path list** (possibly through nostr). 
Due to the xprivs being temporary the revokation list may only need to store revoked xprivs for probably 2 times longer their expiry date (to avoid temporary xprivs that were reissued using the revoked xpriv derivation path).

Temporary xprivs (deducactable from derivation path from the entity identity xpub) will not have the revocation ability. This is because the clients/servers that make use of the xprivs can be compromised (with them being online and all).
