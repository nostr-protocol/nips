NIP-FB
======

Scheduled Tasks
---------------

`draft` `optional`

A user's recurring jobs (a daily front page, a weekly digest), shared by every client they
sign into. Any of their devices may run a task; the first to claim an occurrence runs it.
Or a runner they name, such as a hosted assistant, runs it for them.

## Event

Kind `34817`, addressable, with `d` as the task's id. Like [NIP-51](51.md) lists, its tags
can be public, in `tags`, or private, in `content` as a [NIP-44](44.md) ciphertext,
encrypted by the author to themselves (or to the runner, see below), of a JSON array of tags
(empty when there are none). Readers use both; each tag below but `param` appears once, and
where there are two, the private one wins, then the first. Clients SHOULD keep every tag but
`d` and `p` private, since `cron` reveals the user's time zone and habits, and `claim` their
device names.

```json
[
  ["task", "observer"],
  ["cron", "0 6 * * 1-5", "America/New_York", "1794300000"],
  ["param", "model", "anthropic/claude-sonnet-4.5"],
  ["claim", "1794398400", "3f1c9a0e5b7d4c21", "Desktop (Linux)", "1794398431"],
  ["ran", "1794398520"]
]
```

| tag      | values |
|----------|--------|
| `task`   | the job, as named by whoever defines it |
| `cron`   | when it runs (see below), the IANA time zone it is read in, and when it was last set |
| `paused` | none; while present, nobody runs the task |
| `claim`  | the latest claimed occurrence: when it was due, the claiming installation's random id, a name the user recognizes, and when it was claimed |
| `ran`    | when the latest claimed occurrence finished |
| `param`  | an option of the task: its name, then its values |

Times are unix seconds. An occurrence's due time is the instant it runs by the rules
below, so every device computes the same value. A claim is finished when `ran` is at or
after its due time. A task without a readable
`task` and `cron` is never run. A task meant to exist once per user has a fixed
`d` set by its definition; others SHOULD use a random `d`.

### `param`

The task defines its params' names and meaning; this NIP gives them none. A name may
repeat, in order. Clients keep every `param` as read, including ones they don't understand,
and don't run a task whose params they don't understand. A task with params and no `cron`
holds its options for runs started by hand, and never runs on its own.

### `cron`

Five POSIX fields separated by whitespace: minute (`0`–`59`), hour (`0`–`23`), day of month
(`1`–`31`), month (`1`–`12`), day of week (`0`–`7`, Sunday is `0` and `7`). Each is `*`, a
number, `a-b`, a step (`*/n`, `a-b/n`) or a comma list of those. A value out of range,
`a` > `b`, a step of `0`, names, seconds and extensions (`?`, `L`, `W`, `#`, `@daily`) make
the expression unreadable, as does a time zone that is missing or isn't a name in the IANA tz database (an offset
such as `+05:00` is not one). When day of month and day of week are both other than `*`,
either matches. A local time skipped by daylight saving runs
at the next instant; a repeated one runs once.

## Running

A device runs tasks only where the user turned that on, on that device. When an occurrence
is due and the task isn't `paused`:

1. Wait a random 0 to 60 seconds.
2. Read the newest event from the user's [NIP-65](65.md) write relays. Stop if `claim`
   holds this occurrence, unless that claim is unfinished and was made more than an hour
   ago (a claim without its fifth value, when it was claimed, counts as made more than an
   hour ago). If the task's result already exists (when the task says how to tell), go through
   steps 3 and 4, and on winning set `ran` without running.
3. Subscribe to the event on every write relay, then publish it with `claim` set to this
   occurrence and this installation, to every write relay.
4. After 20 seconds, run only if the newest event seen (by `created_at`, then lowest event
   `id`) holds this installation's claim. If it holds no claim for this occurrence (an
   edit made without seeing it), go back to step 2.
5. Keep the subscription open while running. If a newer event claims this occurrence for
   another installation, stop, at the latest before publishing any result.
6. When done, set `ran`.

More than half of the write relays must answer each read and accept each claim, or the
device doesn't run; with no write relays, nothing runs. A device whose `content` doesn't
decrypt doesn't run. A missed occurrence MAY be claimed until the next one is due. Occurrences due before
`cron` was last set, or while the task was `paused`, are never claimed or reported missed.

Clients SHOULD show who last ran the task and when (or that it never ran), and, unless it
is `paused`, warn when `ran` is older than the newest occurrence that was due more than 3
hours ago. A task or `cron` a client doesn't
understand is listed and editable, never run; a client whose editor can't show a `cron`
leaves it unchanged.

Credentials come from elsewhere: an AI task uses the user's [NIP-FA](FA.md) key, and the
device signs with its own signer.

## Runner

A public `["p", <pubkey>]` names a runner: another key that runs the task for the author,
such as a hosted assistant. Only a public `p` counts; a private one is just a kept tag. A `p`
is a `p` tag with a value: a blank `["p", ""]` counts (the devices stop and nobody runs the
task), a `["p"]` with no value doesn't. The
private tags are then encrypted by the author to the runner, so both can read them, and
only the runner runs the task: the author's devices don't. The runner can't sign the
author's event, so it doesn't claim and never sets `claim` or `ran`. It runs with its own
credentials (its own NIP-FA keys) and publishes the result as its own, with a `p` tag naming
the author. Clients judge whether the task runs from that result (as the task says) instead
of `ran`, and warn the same way when it is missing, which also covers a runner that doesn't
run.

A runner runs only tasks whose author it serves by its own records; being named in `p` is
not enough, or anyone could spend its credentials. With more than one `p`, or one that isn't
the lowercase hex key of someone other than the author, the author's devices still don't run
the task, and nobody else does either. Private tags are then encrypted to the author, as
when there is no `p`. The author decrypts trying first the one valid `p` as peer (else
itself), then each other `p` value (an older writer may have encrypted to one of them), then
itself. While a runner is named, every write keeps the private tags encrypted to it, including
a device's `claim` or `ran` for a run started by hand.

A runner:

- reads the author's newest event as devices do (more than half of the author's NIP-65 write
  relays must answer), by author and `d`, not by `#p`, so a newer version that dropped `p`
  wins; and reads it again right before spending, and doesn't run if that read lacks a
  majority or shows a different version (its `p`, `cron`, `paused` or params changed);
- runs only the latest due occurrence, until the next one is due, never one due before `cron`
  was last set, and never while `paused`;
- doesn't run an occurrence a device claimed and finished, nor one a device claimed less than
  an hour ago and hasn't finished; a claim without its fifth value (when it was claimed)
  counts as older than an hour;
- keeps its own record of the occurrences it started and never starts one again on its own;
  a run that started and never ended counts as done, but a start it gave up before spending
  anything (its inputs weren't ready, say) isn't a start;
- doesn't run a task naming it whose `content` it can't decrypt.

## Editing

Fetch the newest event from the user's write relays (their NIP-65 list, nothing else),
decrypt, change the tags you mean to,
keep every other tag where it was (public or private), encrypt and publish to the same
relays with `created_at` = max(now, previous + 1). Changing `cron` or removing
`paused` sets `cron`'s last value to now; changing the time keeps the time zone. Any
change to the set of public `p` values (adding, changing or removing one, fixing a value's
case included) sets `cron`'s last value to now, as resuming does, so neither the devices nor
the runner run an occurrence that was the other's. Setting `claim` or `ran` is an edit like any
other. More than half of the write relays must answer the read and accept the write; don't
write if they didn't answer or the content doesn't decrypt to a tag array. Delete with [NIP-09](09.md).
