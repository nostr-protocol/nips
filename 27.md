NIP-27
======

Text Note References
--------------------

`draft` `optional` `author:arthurfranca` `author:hodlbod` `author:fiatjaf`

This document standardizes the treatment given by clients of inline references of other events and profiles inside the `.content` of any event that has readable text in its `.content` (such as kinds 1 and 30023).

When creating an event, clients should include mentions to other profiles and to other events in the middle of the `.content` using [NIP-21](21.md) codes, such as `nostr:nprofile1qqsw3dy8cpu...6x2argwghx6egsqstvg`.

Including [NIP-10](10.md)-style tags (`["e", <hex-id>, <relay-url>, <marker>]`) for each reference is optional, clients should do it whenever they want the profile being mentioned to be notified of the mention, or when they want the referenced event to recognize their mention as a reply.

A reader client that receives an event with such `nostr:...` mentions in its `.content` can do any desired context augmentation (for example, linking to the profile or showing a preview of the mentioned event contents) it wants in the process. If turning such mentions into links, they could become internal links, [NIP-21](21.md) links or direct links to web clients that will handle these references.

---

## Example of a profile mention process

Suppose Bob is writing a note in a client that has search-and-autocomplete functionality for users that is triggered when they write the character `@`.

As Bob types `"hello @mat"` the client will prompt him to autocomplete with [mattn's profile](https://gateway.nostr.com/p/2c7cc62a697ea3a7826521f3fd34f0cb273693cbe5e9310f35449f43622a5cdc), showing a picture and name.

Bob presses "enter" and now he sees his typed note as `"hello @mattn"`, `@mattn` is highlighted, indicating that it is a mention. Internally, however, the event looks like this:

```json
{
  "content": "hello nostr:nprofile1qqszclxx9f5haga8sfjjrulaxncvkfekj097t6f3pu65f86rvg49ehqj6f9dh",
  "created_at": 1679790774,
  "id": "f39e9b451a73d62abc5016cffdd294b1a904e2f34536a208874fe5e22bbd47cf",
  "kind": 1,
  "pubkey": "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
  "sig": "f8c8bab1b90cc3d2ae1ad999e6af8af449ad8bb4edf64807386493163e29162b5852a796a8f474d6b1001cddbaac0de4392838574f5366f03cc94cf5dfb43f4d",
  "tags": [
    [
      "p",
      "2c7cc62a697ea3a7826521f3fd34f0cb273693cbe5e9310f35449f43622a5cdc"
    ]
  ]
}
```

(Alternatively, the mention could have been a `nostr:npub1...` URL.)

After Bob publishes this event and Carol sees it, her client will initially display the `.content` as it is, but later it will parse the `.content` and see that there is a `nostr:` URL in there, decode it, extract the public key from it (and possibly relay hints), fetch that profile from its internal database or relays, then replace the full URL with the name `@mattn`, with a link to the internal page view for that profile.

## Verbose and probably unnecessary considerations

- The example above was very concrete, but it doesn't mean all clients have to implement the same flow. There could be clients that do not support autocomplete at all, so they just allow users to paste raw [NIP-19](19.md) codes into the body of text, then prefix these with `nostr:` before publishing the event.
- The flow for referencing other events is similar: a user could paste a `note1...` or `nevent1...` code and the client will turn that into a `nostr:note1...` or `nostr:nevent1...` URL. Then upon reading such references the client may show the referenced note in a preview box or something like that -- or nothing at all.
- Other display procedures can be employed: for example, if a client that is designed for dealing with only `kind:1` text notes sees, for example, a [`kind:30023`](23.md) `nostr:naddr1...` URL reference in the `.content`, it can, for example, decide to turn that into a link to some hardcoded webapp capable of displaying such events.
- Clients may give the user the option to include or not include tags for mentioned events or profiles. If someone wants to mention `mattn` without notifying them, but still have a nice augmentable/clickable link to their profile inside their note, they can instruct their client to _not_ create a `["p", ...]` tag for that specific mention.
- In the same way, if someone wants to reference another note but their reference is not meant to show up along other replies to that same note, their client can choose to not include a corresponding `["e", ...]` tag for any given `nostr:nevent1...` URL inside `.content`. Clients may decide to expose these advanced functionalities to users or be more opinionated about things.
