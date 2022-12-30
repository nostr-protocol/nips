
NIP-XX (FIXME)
======

Private Key Transfer
--------------------

`draft` `optional` `author:mikedilger`

This NIP defines a method by which clients can export and/or import a password-encrypted private key for the purposes of moving it between clients.

Generating the encryption/decryption key
----------------------------------------

The key used to encrypt/decrypt the private key is generated from a password.
This same process is used for both encryption and decryption, and is not reversable.

Perform PBKDF2 using HMAC-SHA-256 on the password as bytes, salted with the string "nostr", and run for 4096 cycles.

Encrypting/Decrypting a private key
-----------------------------------

In short, the encryption/export process goes:

 - Concatenate the input:
     - Start with the 32 raw bytes (not the hex encoded string) of the private key
     - Append these bytes: [15, 91, 241, 148, 90, 143, 101, 12, 172, 255, 103]
     - Append a `0` if the key has been carelessly handled (printed, cut-n-paste, saved to disk, etc, while not encrypted) or a `1` if it is not known to have been carelessly handled.
 - Generate a random 16-byte initialization vector for AES-256, called IV
 - Pad the input as required by AES
 - Encrypt the padded input with AES-256-CBC using the randomly generated IV and the key generated from the previous section.
 - Concatenate the output:
     - Start with the 16-byte IV
     - Append the ciphertext output of AES (the total should now be 80 bytes)
 - Encode using base64 using the standard alphabet from RFC 3548

The decryption process is the reverse of the encryption process

 - Decode the input using base64 using the standard alphabet from RFC 3548
 - Split the input considering the first 16 bytes as the IV and the rest as ciphertext
 - Decrypt the ciphertext with AES-256-CBC using the IV and the key generated from the previous section.
 - Split the output into three pieces
     - The first 32 bytes, which are the private key
     - The next 11 bytes, which must equal [15, 91, 241, 148, 90, 143, 101, 12, 172, 255, 103] or else there was an error.
     - The final byte which must be either `0` or `1` indicating key security

Keeping key material secure
---------------------------

It is strongly recommended that software that engages in this process zeroes the memory used by private keys and passwords before freeing it to the operating system.

Posting the encrypted private key to a relay
--------------------------------------------

To share the key with yourself at another client, the encrypted private key can be posted as the content of a nostr event using the event kind of NN (FIXME).

Test Data
---------

For the following hex encoded private key:

`prv a28129ab0b70c8d5e75aaf510ec00bff47fde7ca4ab9e3d9315c77edc86f037f`

when encrypted with the password "nostr" yields the following encrypted private key:

`F+VYIvTCtIZn4c6owPMZyu4Zn5DH9T5XcgZWmFG/3ma4C3PazTTQxQcIF+G+daeFlkqsZiNIh9bcmZ5pfdRPyg==`

Motivation
----------

There will always be a wide selection of clients. Users should be able to move/share their identity between them without risking exposing their private key. Short of the use of hardware security token support, this NIP provides the next best solution.
