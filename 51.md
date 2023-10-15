NIP-51
======

Lists
-----

`draft` `optional` `author:fiatjaf` `author:arcbtc` `author:monlovesmango` `author:eskema` `author:gzuuus`

A "list" event is defined as having a list of public and/or private tags. Public tags will be listed in the event `tags`. Private tags will be encrypted in the event `content`. Encryption for private tags will use [NIP-04 - Encrypted Direct Message](04.md) encryption, using the list author's private and public key for the shared secret. A distinct event kind should be used for each list type created.

If a list should only be defined once per user (like the "mute" list) the list is declared as a _replaceable event_. These lists may be referred to as "replaceable lists". Otherwise, the list is a _parameterized replaceable event_ and the list name will be used as the `d` tag. These lists may be referred to as "parameterized replaceable lists".

## Replaceable List Event Example

Lets say a user wants to create a 'Mute' list and has keys:
```
priv: fb505c65d4df950f5d28c9e4d285ee12ffaf315deef1fc24e3c7cd1e7e35f2b1
pub: b1a5c93edcc8d586566fde53a20bdb50049a97b15483cb763854e57016e0fa3d
```
The user wants to publicly include these users:

```json
["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"],
["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"]
```
and privately include these users (below is the JSON that would be encrypted and placed in the event content):

```json
[
    ["p", "9ec7a778167afb1d30c4833de9322da0c08ba71a69e1911d5578d3144bb56437"],
    ["p", "8c0da4862130283ff9e67d889df264177a508974e2feb96de139804ea66d6168"]
]
```

Then the user would create a 'Mute' list event like below:

```json
{
  "kind": 10000,
  "tags": [
    ["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"],
    ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
  ],
  "content": "VezuSvWak++ASjFMRqBPWS3mK5pZ0vRLL325iuIL4S+r8n9z+DuMau5vMElz1tGC/UqCDmbzE2kwplafaFo/FnIZMdEj4pdxgptyBV1ifZpH3TEF6OMjEtqbYRRqnxgIXsuOSXaerWgpi0pm+raHQPseoELQI/SZ1cvtFqEUCXdXpa5AYaSd+quEuthAEw7V1jP+5TDRCEC8jiLosBVhCtaPpLcrm8HydMYJ2XB6Ixs=?iv=/rtV49RFm0XyFEwG62Eo9A==",
  ...other fields
}
```


## Parameterized Replaceable List Event Example

Lets say a user wants to create a 'Categorized People' list of `nostr` people and has keys:
```
priv: fb505c65d4df950f5d28c9e4d285ee12ffaf315deef1fc24e3c7cd1e7e35f2b1
pub: b1a5c93edcc8d586566fde53a20bdb50049a97b15483cb763854e57016e0fa3d
```
The user wants to publicly include these users:

```json
["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"],
["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"]
```
and privately include these users (below is the JSON that would be encrypted and placed in the event content):

```json
[
    ["p", "9ec7a778167afb1d30c4833de9322da0c08ba71a69e1911d5578d3144bb56437"],
    ["p", "8c0da4862130283ff9e67d889df264177a508974e2feb96de139804ea66d6168"]
]
```

Then the user would create a 'Categorized People' list event like below:

```json
{
  "kind": 30000,
  "tags": [
    ["d", "nostr"],
    ["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"],
    ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
  ],
  "content": "VezuSvWak++ASjFMRqBPWS3mK5pZ0vRLL325iuIL4S+r8n9z+DuMau5vMElz1tGC/UqCDmbzE2kwplafaFo/FnIZMdEj4pdxgptyBV1ifZpH3TEF6OMjEtqbYRRqnxgIXsuOSXaerWgpi0pm+raHQPseoELQI/SZ1cvtFqEUCXdXpa5AYaSd+quEuthAEw7V1jP+5TDRCEC8jiLosBVhCtaPpLcrm8HydMYJ2XB6Ixs=?iv=/rtV49RFm0XyFEwG62Eo9A==",
  ...other fields
}
```

Lets say a user wants to create a 'Categorized Bookmarks' list of `bookmarks` and has keys:
```
priv: fb505c65d4df950f5d28c9e4d285ee12ffaf315deef1fc24e3c7cd1e7e35f2b1
pub: b1a5c93edcc8d586566fde53a20bdb50049a97b15483cb763854e57016e0fa3d
```
The user wants to publicly include these bookmarks:

```json
["e", "5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36", "wss://nostr.example.com"],
["a", "30023:f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca:abcd", "wss://nostr.example.com"],
["r", "https://github.com/nostr-protocol/nostr", "Nostr repository"],
```
and privately include these bookmarks (below is the JSON that would be encrypted and placed in the event content):

```json
[
    ["r", "https://my-private.bookmark", "My private bookmark"],
    ["a", "30001:f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca:abcd", "wss://nostr.example.com"],
]
```

Then the user would create a 'Categorized Bookmarks' list event like below:

```json
{
  "kind": 30001,
  "tags": [
    ["d", "bookmarks"],
    ["e", "5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36", "wss://nostr.example.com"],
    ["a", "30023:f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca:abcd", "wss://nostr.example.com"],
    ["r", "https://github.com/nostr-protocol/nostr", "Nostr repository"],
  ],
  "content": "y3AyaLJfnmYr9x9Od9o4aYrmL9+Ynmsim5y2ONrU0urOTq+V81CyAthQ2mUOWE9xwGgrizhY7ILdQwWhy6FK0sA33GHtC0egUJw1zIdknPe7BZjznD570yk/8RXYgGyDKdexME+RMYykrnYFxq1+y/h00kmJg4u+Gpn+ZjmVhNYxl9b+TiBOAXG9UxnK/H0AmUqDpcldn6+j1/AiStwYZhD1UZ3jzDIk2qcCDy7MlGnYhSP+kNmG+2b0T/D1L0Z7?iv=PGJJfPE84gacAh7T0e6duQ==",
  ...other fields
}
```

## List Event Kinds

| kind   | list type               |
| ------ | ----------------------- |
| 10000  | Mute                    |
| 10001  | Pin                     |
| 30000  | Categorized People      |
| 30001  | Categorized Bookmarks   |


### Mute List

An event with kind `10000` is defined as a replaceable list event for listing content a user wants to mute. Any standardized tag can be included in a Mute List.

### Pin List

An event with kind `10001` is defined as a replaceable list event for listing content a user wants to pin. Any standardized tag can be included in a Pin List.

### Categorized People List

An event with kind `30000` is defined as a parameterized replaceable list event for categorizing people. The 'd' parameter for this event holds the category name of the list. The tags included in these lists MUST follow the format of kind 3 events as defined in [NIP-02 - Contact List and Petnames](02.md).

### Categorized Bookmarks List

An event of kind `30001` is defined as a parameterized replaceable list event for categorizing bookmarks. The 'd' parameter for this event holds the category name of the list. The bookmark lists may contain metadata tags such as 'title', 'image', 'summary' as defined in [NIP-23 - Long-form Content](23.md). Any standardized tag can be included in a Categorized Bookmark List.