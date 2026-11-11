NIP-FB
======

Scheduled Tasks
---------------

`draft` `optional`

A user's recurring jobs (a daily front page, a weekly digest), shared by every client they
sign into and run by exactly one of their devices.

## Event

Kind `34817`, addressable. `d` is the task's id and the only public tag. `content` is a
[NIP-44](44.md) ciphertext, encrypted by the author to themselves, of:

```json
{
  "task": "observer",
  "enabled": true,
  "cron": "0 6 * * 1-5",
  "tz": "America/New_York",
  "runner": "3f1c9a0e5b7d4c21",
  "ran": 1794398520,
  "runners": [
    { "id": "3f1c9a0e5b7d4c21", "name": "Desktop (Linux)", "app": "amethyst-desktop", "unattended": true, "seen": 1794355200 }
  ]
}
```

| field     | value |
|-----------|-------|
| `task`    | the job, as named by whoever defines it |
| `enabled` | `false` pauses it |
| `cron`    | when it runs, read in `tz` |
| `tz`      | an IANA time zone |
| `runner`  | the `id` of the one device that runs it; absent or unlisted means none |
| `runners` | the devices able to run it |
| `ran`     | unix seconds when the runner last completed an occurrence |
| `params`  | optional task options |

A task meant to exist once per user has a fixed `d` set by its definition; others SHOULD
use a random `d`, since it is public.

### `cron`

Five POSIX fields: minute, hour, day of month, month, day of week (`0`–`7`, Sunday is `0`
and `7`). Each is `*`, a number, `a-b`, a step (`*/n`, `a-b/n`) or a comma list of those.
No names, seconds or extensions (`?`, `L`, `W`, `#`, `@daily`). When day of month and day
of week are both restricted, either matches. A local time skipped by daylight saving runs
at the next instant; a repeated one runs once.

## Runners

Each entry is one installation for one user: `id` (random, made by that installation),
`name`, `app`, `unattended` (can run with nobody at the device), `seen` (unix seconds).
An installation that can run the task adds or refreshes its entry at most once a day;
one that can't, such as a web page, never lists itself. The `runner` refreshes its own
`seen` at least daily while it is running. Entries unseen for 90 days MAY be
dropped, unless they are the `runner`.

## Running

- Only the installation whose own `id` is `runner` runs the task, and only while `enabled`.
- Other clients show who runs it, and MAY set `runner` to any `unattended` entry.
- Clients SHOULD warn when the runner's `seen` is more than 2 days old, or when `ran` is
  older than the newest occurrence that was due more than 3 hours ago.
- A missed occurrence MAY run until the next one is due; no occurrence runs twice.
- The runner skips an occurrence whose result already exists, when the task says how to
  tell.
- After each occurrence, run or skipped, the runner sets `ran` (and its own `seen`) with a
  fresh read of the event, changing nothing else.
- A task or `cron` a client doesn't understand is listed and editable, never run. A client
  whose editor can't show a `cron` leaves it unchanged.

Credentials come from elsewhere: an AI task uses the user's [NIP-FA](FA.md) key, and the
runner signs with its own signer.

## Editing

Fetch the newest event, decrypt, change your fields, keep every other field (also inside
`runners`), encrypt and publish with `created_at` = max(now, previous + 1). Don't write
if the relays couldn't be read. Delete with [NIP-09](09.md).
