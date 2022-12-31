NIP-0X
======

Simple Deterministic Aliases
----------------------------

`draft` `optional` `author:@RandyMcMillan`

### Generating new profiles deterministically from an existing secure privkey or entropy using sha256

There are many reasons nostr users may need to generate a new or temporary profile. Scenarios include many privacy issues or simply the users wants multiple profiles that are derived from the same _master private key_. Simular to a *bip-0085 HD child wallet* in Bitcoin, the use cases for _deterministic aliases_ are too numerous to list here.

The **Simple Deterministic Alias** generation scheme described here emphasizes simplicity, and the user can accomplish this with a command line utility independently of any client implementation. This simple scheme promotes user autonomy - reducing dependency on any specific implementation or exotic cryptographic method, but is easy to implement in code. For this example we use:

#### <center> `openssl dgst -sha256` </center>

###### This command line utility is widely available. For demonstration purposes we will use easily reproducible and known values.

----------------------------

### null_privkey:

##### Input:

$```null_privkey=$(echo -en "" | openssl dgst -sha256)```

##### Output:

$```e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855```

##### Test:

$```null_privkey=$(echo -en "" | openssl dgst -sha256) && echo $null_privkey```

----------------------------

### Using a bitcoin seed phrase

### abandon_art:

```
abandon abandon abandon abandon
abandon abandon abandon abandon
abandon abandon abandon abandon
abandon abandon abandon abandon
abandon abandon abandon abandon
abandon abandon abandon art
```

#### BIP39 seed:

```408b285c123836004f4b8842c89324c1f01382450c0d439af345ba7fc49acf705489c6fc77dbd4e3dc1dd8cc6bc9f043db8ada1e243c4a0eafb290d399480840```

##### Input: BIP39 seed

$```abandon_art=$(echo -en '408b285c123836004f4b8842c89324c1f01382450c0d439af345ba7fc49acf705489c6fc77dbd4e3dc1dd8cc6bc9f043db8ada1e243c4a0eafb290d399480840' | openssl dgst -sha256) && echo $abandon_art```

##### Output:

$```273be55792f7ca3f3bcb445ff07f39f64dd6a324ce6d8eb025951267f61b4d33```

##### Using the `shasum -a 256` command 

##### Input: BIP39 seed

$```printf '408b285c123836004f4b8842c89324c1f01382450c0d439af345ba7fc49acf705489c6fc77dbd4e3dc1dd8cc6bc9f043db8ada1e243c4a0eafb290d399480840' | shasum -a 256 | sed 's/-//g'```

Output:

$```273be55792f7ca3f3bcb445ff07f39f64dd6a324ce6d8eb025951267f61b4d33```

----------------------------

##### NOSTR PRIVATE KEY:

```nsec1yua724uj7l9r7w7tg30lqlee7exadgeyeekcavp9j5fx0asmf5esvagd2d```

##### NOSTR PUBLIC KEY:

```npub175fjerv9f2dcwgg2s9y4vrhxwgjnhymgh34q33x6un3glcd9wxhshxkl0r```


----------------------------

## <center>Deterministic Aliases</center>

### null_privkey: password-salting

##### Input: Upper case letters, Lower case letters, Numbers, Symbols

$```echo $(echo -en "" | openssl dgst -sha256)password-salting | openssl dgst -sha256```

##### Output:

$```fbf7b99720fb4afe7258ba37a1b64bc70fc54aa7f8d02aef54b6dfdbd7d0ff4f```


### abandon_art: password-salting

##### Input: privkey + Upper case letters, Lower case letters, Numbers, Symbols

$```abandon_art=$(echo -en "408b285c123836004f4b8842c89324c1f01382450c0d439af345ba7fc49acf705489c6fc77dbd4e3dc1dd8cc6bc9f043db8ada1e243c4a0eafb290d399480840"password-salting | openssl dgst -sha256) && echo $abandon_art```

##### Output:

$```ee035d82dfafcc08d06ee83e9b559c52dcae263ca553268f160feb2b7dda3992```

The `password-salting` is appended to the original private key and hashed to the new `deterministic alias`.

---
## <center>Alias Indexing</center>

### null_privkey: index example

#### Inputs: integer

###### index: 0

$```echo $(echo -en "" | openssl dgst -sha256)password-salting0 | openssl dgst -sha256```

###### index: 1

$```echo $(echo -en "" | openssl dgst -sha256)password-salting1 | openssl dgst -sha256```

###### index: 2

$```echo $(echo -en "" | openssl dgst -sha256)password-salting2 | openssl dgst -sha256```


##### Outputs:

$```4fbf720a0483f1d0fda8029bc47cc283efa7c8a2c735ec0392e41c934067f040```

$```798edf1dcf7d3464c1e8311a7a5e47258d84509622b18fe5043499bf4f94fb11```

$```1ef000ca946272cdec498e86cfb68d6459742e8c266a6746857f33a807fbec19```


### Summary:

We have demonstrated a simple scheme, using a common command line utility, that deterministically generates profiles based on a user's private key. 
