NIP-56
======

Reporting
---------

`optional`

A report is a `kind 1984` event that signals to users and relays that 
some referenced content is objectionable. The definition of objectionable is
obviously subjective and all agents on the network (users, apps, relays, etc.) 
may consume and take action on them as they see fit.

The `content` MAY contain additional information submitted by the entity
reporting the content.

Tags
----

The report event MUST include a `p` tag referencing the pubkey of the user you
are reporting.

If reporting a note, an `e` tag MUST also be included referencing the note id.

A `report type` string MUST be included as the 3rd entry to the `e`, `p` or `x` tag
being reported, which consists of the following report types:

- `nudity` - depictions of nudity, porn, etc.
- `malware` - virus, trojan horse, worm, robot, spyware, adware, back door, ransomware, rootkit, kidnapper, etc.
- `profanity` - profanity, hateful speech, etc.
- `illegal` - something which may be illegal in some jurisdiction
- `spam` - spam
- `impersonation` - someone pretending to be someone else
- `other` - for reports that don't fit in the above categories

Some report tags only make sense for profile reports, such as `impersonation`.

- `x` tags SHOULD be info hash of a blob which is intended to be report. when the `x` tag is represented client MUST include an `e` tag which is the id of the event that contains the mentioned blob. also, additionally these events can contain a `server` tag to point to media servers which may contain the mentioned media.

`l` and `L` tags MAY be also be used as defined in [NIP-32](32.md) to support
further qualification and querying.

Example events
--------------

```jsonc
{
  "kind": 1984,
  "tags": [
    ["p", "<pubkey>", "nudity"],
    ["L", "social.nos.ontology"],
    ["l", "NS-nud", "social.nos.ontology"]
  ],
  "content": "",
  // other fields...
}
```

```jsonc
{
  "kind": 1984,
  "tags": [
    ["e", "<eventId>", "illegal"],
    ["p", "<pubkey>"]
  ],
  "content": "He's insulting the king!",
  // other fields...
}
```

```jsonc
{
  "kind": 1984,
  "tags": [
    ["p", "<impersonator pubkey>", "impersonation"]
  ],
  "content": "Profile is impersonating nostr:<victim bech32 pubkey>",
  // other fields...
}
```

```jsonc
{
  "kind": 1984,
  "tags": [
    ["x", "<blob hash>", "malware"],
    ["e", "<event id which contains the blob on x tag>", "malware"],
    ["server", "https://you-may-find-the-blob-here.com/path-to-url.ext"]
  ],
  "content": "This file contains malware software in it.",
  // other fields...
}
```

Client behavior
---------------

Clients can use reports from friends to make moderation decisions if they
choose to. For instance, if 3+ of your friends report a profile for `nudity`,
clients can have an option to automatically blur photos from said account.


Relay behavior
--------------

It is not recommended that relays perform automatic moderation using reports,
as they can be easily gamed. Admins could use reports from trusted moderators to
takedown illegal or explicit content if the relay does not allow such things.
