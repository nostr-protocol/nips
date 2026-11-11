NIP-FB
======

Scheduled Tasks
---------------

`draft` `optional`

A user's recurring jobs (a daily front page, a weekly digest), shared by every client they
sign into. Any of their devices may run a task; the first to claim an occurrence runs it.

## Event

Kind `34817`, addressable, with `d` as the task's id. Like [NIP-51](51.md) lists, its tags
can be public, in `tags`, or private, in `content` as a [NIP-44](44.md) ciphertext,
encrypted by the author to themselves, of a JSON array of tags. Readers use both. Clients
SHOULD keep every tag but `d` private, since `cron` reveals the user's time zone and
habits, and `claim` their device names.

```json
[
  ["task", "observer"],
  ["cron", "0 6 * * 1-5", "America/New_York"],
  ["claim", "1794398400", "3f1c9a0e5b7d4c21", "Desktop (Linux)"],
  ["ran", "1794398520"]
]
```

| tag      | values |
|----------|--------|
| `task`   | the job, as named by whoever defines it |
| `cron`   | when it runs (see below), and the IANA time zone it is read in |
| `paused` | none; while present, nobody runs the task |
| `claim`  | the latest claimed occurrence: when it was due (unix seconds), the claiming installation's random id, and a name the user recognizes |
| `ran`    | unix seconds when the claimed occurrence finished |

Other tags are the task's own options. A task meant to exist once per user has a fixed
`d` set by its definition; others SHOULD use a random `d`.

### `cron`

Five POSIX fields: minute, hour, day of month, month, day of week (`0`–`7`, Sunday is `0`
and `7`). Each is `*`, a number, `a-b`, a step (`*/n`, `a-b/n`) or a comma list of those.
No names, seconds or extensions (`?`, `L`, `W`, `#`, `@daily`). When day of month and day
of week are both restricted, either matches. A local time skipped by daylight saving runs
at the next instant; a repeated one runs once.

## Running

A device runs tasks only where the user turned that on, on that device. When an occurrence
is due and the task isn't `paused`:

1. Wait a random 0 to 60 seconds.
2. Read the newest event from the user's [NIP-65](65.md) write relays. Stop if `claim`
   holds this occurrence. If the task's result already exists (when the task says how to
   tell), claim it and set `ran` without running.
3. Subscribe to the event on every write relay, then publish it with `claim` set to this
   occurrence and this installation, to every write relay.
4. After 20 seconds, run only if the newest event seen (by `created_at`, then lowest `id`)
   holds this installation's claim.
5. Keep the subscription open while running. If a newer event claims this occurrence for
   another installation, stop, at the latest before publishing any result.
6. When done, set `ran`.

More than half of the write relays must answer each read, or the device doesn't run. A
missed occurrence MAY be claimed until the next one is due. A claim with no `ran` an hour
after it was made MAY be claimed again.

Clients SHOULD show who last ran the task and when, and warn when `ran` is older than the
newest occurrence that was due more than 3 hours ago. A task or `cron` a client doesn't
understand is listed and editable, never run; a client whose editor can't show a `cron`
leaves it unchanged.

Credentials come from elsewhere: an AI task uses the user's [NIP-FA](FA.md) key, and the
device signs with its own signer.

## Editing

Fetch the newest event, decrypt, change the tags you mean to, keep every other tag where
it was (public or private), encrypt and publish with `created_at` = max(now, previous + 1).
Don't write if the relays couldn't be read. Delete with [NIP-09](09.md).
