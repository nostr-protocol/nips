NIP-FB
======

Scheduled Tasks
---------------

`draft` `optional`

A user keeps the recurring jobs that clients run for them, such as a daily front page or a
weekly digest, as addressable events encrypted to themselves. Every client they sign into
shows and edits the same schedule, and exactly one of their devices runs each task, so a
phone and a laptop set to the same hour don't both do the work (or both spend the user's
money, see [NIP-FA](FA.md)).

## Event

Kind `34817`, addressable. The `d` tag is the task's id, and is the only public tag. The
`content` is a [NIP-44](44.md) ciphertext, encrypted by the author to their own public key,
of a JSON object:

```json
{
  "v": 1,
  "task": "observer",
  "enabled": true,
  "cron": "0 6 * * 1-5",
  "tz": "America/New_York",
  "runner": "3f1c9a0e5b7d4c21",
  "runners": [
    { "id": "3f1c9a0e5b7d4c21", "name": "Desktop (Linux)", "app": "amethyst-desktop", "unattended": true,  "seen": 1794355200 },
    { "id": "9ab2c4e6f8a0b1d3", "name": "Pixel 8",         "app": "amethyst-android", "unattended": false, "seen": 1794300000 }
  ]
}
```

```json
{
  "kind": 34817,
  "content": "<nip44 ciphertext of the object>",
  "tags": [["d", "observer"]]
}
```

| field     | required | value |
|-----------|----------|-------|
| `v`       | yes      | `1` |
| `task`    | yes      | what to run, named by the app or spec that defines the job (see Tasks) |
| `enabled` | yes      | `false` keeps the task and its settings but nobody runs it |
| `cron`    | yes      | when it runs: a five-field cron expression read in `tz` (see Schedule) |
| `tz`      | yes      | an IANA time zone, normally the zone of whoever last set the schedule |
| `runner`  | no       | the `id` of the one device that runs it. Absent or not in `runners`: nobody runs it |
| `runners` | no       | the devices that can run it (see Runners) |
| `params`  | no       | an object of options for the task, defined by the task |

Readers ignore fields they don't know, and writers keep them (see Editing).

### Schedule

`cron` is the five fields of a POSIX crontab line, separated by single spaces:

| field        | values |
|--------------|--------|
| minute       | `0`–`59` |
| hour         | `0`–`23` |
| day of month | `1`–`31` |
| month        | `1`–`12` |
| day of week  | `0`–`7`, where `0` and `7` are Sunday |

Each field is `*`, a number, a range `a-b`, a step `*/n` or `a-b/n`, or a comma-separated
list of these. Names (`MON`, `JAN`), seconds, `?`, `L`, `W`, `#` and macros such as
`@daily` are not part of this NIP: implementations disagree on them. When both day of month
and day of week are restricted (neither is `*`), the task runs on days matching either one,
as cron does.

| schedule              | `cron` |
|-----------------------|--------|
| every day at 6:00     | `0 6 * * *` |
| weekdays at 6:00      | `0 6 * * 1-5` |
| 6:00 and 18:00        | `0 6,18 * * *` |
| every 6 hours         | `0 */6 * * *` |
| the 1st of each month | `0 6 1 * *` |

The expression is read in `tz`, so every device agrees on the instant whatever its own
zone, and each one displays it in its own. When a daylight-saving change skips a matching
time, the task runs at the first instant after it; when a change repeats one, it runs at
the first occurrence only.

A client that offers a simple editor (a time, some weekdays) edits `cron` only when it has
a shape the editor can show again, and otherwise shows the expression as it is.

### The `d` tag

The `d` tag is visible to relays. For a task meant to exist once per user, the spec that
defines the task fixes its `d` (`observer` above), so two clients setting it up at once
edit one event instead of creating two; that reveals that the user has the task. Other
tasks SHOULD use a random `d`.

## Runners

A runner is one installation of a client, for one user. Its `id` is random, created and
kept by that installation, and never reused by another user signed into it.

| field        | value |
|--------------|-------|
| `id`         | the installation's id |
| `name`       | a label the user recognizes, such as the device's name |
| `app`        | the client, such as `amethyst-android` |
| `unattended` | `true` when it can run the task with nobody at the device: it holds what it needs to sign, and the platform lets it wake on time |
| `seen`       | unix seconds when it last wrote this entry |

A client that can run the task adds itself to `runners`, or refreshes its entry, when the
user opens the task's screen, at most once a day. A client that cannot run tasks, such as a
web page that stops when its tab closes, never lists itself. A writer MAY drop an entry
not `seen` for 90 days, unless it is the `runner`.

## Running

- Only the installation whose `id` equals `runner` runs the task, and only while `enabled`
  is `true`. Every other client leaves it alone and SHOULD say who runs it, for example
  "Printed each weekday by Desktop (Linux) at 6:00".
- A client MAY offer "run on this device": it sets `runner` to its own `id`, and only when
  its entry is `unattended`. Another client MAY set `runner` to any listed `unattended`
  entry.
- A runner that finds it is no longer the `runner` stops scheduling the task.
- A runner that was asleep at the time MAY run the missed occurrence on waking, as long as
  the next occurrence hasn't come. It runs each occurrence at most once.
- Before running, the runner SHOULD check whether the task's result for this occurrence
  already exists (made by hand earlier, or by another device), when the task defines how,
  and skip it if so.
- A client that doesn't know a `task`, or can't read its `cron`, still lists it, MAY change
  `enabled`, `cron`, `tz`, `runner` or delete it, and never runs it.

## Tasks

`task` names the job, and the spec or app that defines it says what running it means, what
`params` holds, how to tell that an occurrence already ran, and whether its `d` is fixed.
Names are short lowercase strings; an app's private task SHOULD be prefixed with the app's
name (`amethyst.cleanup`).

What a task needs beyond the schedule is not in this event. A task that calls an AI model
uses the user's [NIP-FA](FA.md) key; a task that publishes signs with the runner's own
signer.

## Editing

To change a task, a client fetches the newest event for its address from the user's
[NIP-65](65.md) write relays, decrypts it, changes the fields it means to change, keeps
every other field (including ones it doesn't know, at the top level and in each
`runners` entry), encrypts and publishes with `created_at` set to the larger of now and
the previous event's `created_at` plus one. If the relays could not be read and it has no
copy of its own, it does not write: starting from nothing would drop the other runners.

To delete a task, a client publishes a [NIP-09](09.md) deletion of its address. Setting
`enabled` to `false` keeps it for later instead.

Clients MAY add a [NIP-70](70.md) `["-"]` tag so relays refuse copies published by anyone
else.

## Security

- The event holds no credentials. Anyone who can decrypt it learns the user's tasks, their
  times and device names, not how to run them.
- Relays see the `d` tag, the event's size and when it changes. A task that runs daily
  changes it only when the user edits it or a runner refreshes its entry, at most once a
  day.
- A client MUST NOT run a task because the event names it as `runner` unless the `id` is
  one it created itself: an `id` copied to another device would make both run.
