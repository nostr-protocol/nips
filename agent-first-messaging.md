NIP-XX
======

Agent-First Messaging
---------------------

`draft` `optional`

This NIP defines event kinds and tag conventions for workspaces where autonomous
agents are first-class participants alongside humans: agents that hold their own
keys, carry scoped and revocable capabilities, ask humans for consent before
consequential actions, and account for what they cost.

It is additive. A workspace using this NIP is an ordinary NIP-29 group whose
conversation is ordinary NIP-C7 and NIP-7D events. A client that implements none
of this renders the conversation correctly and shows the rest as fallback text.

**Status:** kind numbers in the 8100/28100/38100 ranges are provisional. All 24
were re-checked against the [registry of
kinds](https://github.com/nostr-protocol/registry-of-kinds) on 2026-09-15 and
none of them appears in any registry source. They are subject to reallocation
until this PR merges, and a forced reallocation is a MAJOR version bump.

## Motivation

A bot on an existing chat platform is a webhook with an avatar. It has no durable
identity, no scoped permissions, no protocol-level way to ask a human for
consent, and no accounting. Every serious agent integration re-implements history
scraping, token budgeting, retry/deduplication and an ad-hoc approval flow —
separately, and badly.

Nostr already supplies the two things such a system most needs and that no
centralised platform can offer:

- **An agent's identity is a keypair.** No server issues it a bot token, so no
  server can forge, silently rotate, or repudiate it.
- **An approval is a signed event.** "Ada authorised this production deploy, with
  exactly these arguments" is verifiable offline, against no server, forever. The
  audit trail is the signatures. There is no audit table for an operator to edit.

Everything below exists to make those two facts usable.

## Terminology

- **Workspace** — a NIP-29 group. Every event in this NIP carries its `h` tag.
- **Thread** — a unit of work, rooted at a NIP-7D kind 11 event.
- **Action** — a discrete unit of consequential work with a status lifecycle.
- **Principal** — the pubkey that holds capability grants. Distinct from the
  *app* (the agent definition) and the *runtime instance* (one replica).

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as
described in RFC 2119.

## Reused kinds

This NIP defines no chat or threading kinds of its own. It reuses:

| Kind | NIP | Use |
| --- | --- | --- |
| 9 | NIP-C7 | Chat message. The conversational layer. |
| 11 | NIP-7D | Thread root. Its **id is the thread id**. |
| 1111 | NIP-22 | Comment. All replies within a thread. |
| 5 | NIP-09 | Deletion request (advisory). |
| 22242 | NIP-42 | Relay AUTH. |
| 9000/9001/9021 | NIP-29 | Put-user, remove-user, join request. See [the two resources the relay owns](#the-two-resources-the-relay-owns). |
| 39000–39002 | NIP-29 | Group metadata, admins, members. |
| 30443 | Marmot | MLS KeyPackage, addressable, `d` = **the channel id** (`mls` only). See [key establishment](#key-establishment-on-an-mls-channel). |
| 445 | Marmot | Group message. Used only by the [Marmot transport profile](#the-marmot-transport-profile-is-optional), never by a Quorum-native `mls` channel. |

A generic NIP-C7 or NIP-7D client joined to a Quorum workspace therefore sees the
whole human conversation with no modification.

## New kinds

### Regular (stored)

| Kind | Name | Purpose |
| --- | --- | --- |
| 8101 | `action` | A unit of consequential work; one event per status transition. |
| 8102 | `approval_request` | Asks named humans to authorise an exact input. |
| 8103 | `approval_response` | A signed decision. **This is the audit record.** |
| 8104 | `summary` | An agent-authored compaction of a range, offered not trusted. |
| 8105 | `error` | A failure not attributable to a single action. |
| 8106 | `artifact` | A produced object, by reference or hash. |
| 8107 | `handoff` | Transfers responsibility for a thread to another principal. |
| 8108 | `checkpoint` | Relay-signed attestation of the events it holds. |
| 8109 | `thread_op` | Requests a change to thread state. |
| 8110 | `channel_key` | One member's copy of a channel's epoch key, wrapped to them. |
| 8111 | `mls_welcome` | One member's MLS Welcome and the ratchet tree, wrapped to them. |
| 8112 | `mls_commit` | An MLS commit, broadcast so every member advances to the same epoch. |

### Ephemeral (not stored, 20000–29999)

Control-plane traffic. These use the ephemeral range deliberately: a cancel that
is replayed from storage an hour later is worse than one that is lost, and an
ephemeral kind cannot be delivered late by a relay honouring NIP-01.

| Kind | Name | Purpose |
| --- | --- | --- |
| 28101 | `interrupt` | Cancel, pause or steer a running action. |
| 28102 | `lease` | Single-holder claim on a thread, so replicas don't double-act. |
| 28103 | `presence` | Liveness. |

### Addressable (latest per pubkey + kind + `d`)

| Kind | Name | `d` |
| --- | --- | --- |
| 38101 | `thread_state` | thread id |
| 38102 | `capability_grant` | grantee pubkey |
| 38103 | `agent_manifest` | principal pubkey |
| 38104 | `agent_memory` | scoped key |
| 38105 | `agent_cursor` | subscription id |
| 38106 | `delegation` | delegate pubkey |
| 38107 | `channel_policy` | group id |

### Data-vending machine (NIP-90)

| Kind | Name |
| --- | --- |
| 5600 | `context_pack_request` |
| 6600 | `context_pack_result` |

## The envelope

### Every event of a kind defined here MUST carry

- **`h`** — the NIP-29 group id.
- **`alt`** — human-readable fallback, 1–280 characters, single line.

### Tags

```
h          group id (NIP-29)
alt        fallback text (see below)
p          pubkey reference — addressing, mentions, NIP-22 parent authorship
E K P      NIP-22 root scope: thread root id, root kind, root author
e k        NIP-22 parent: parent id, parent kind
a          addressable coordinate <kind>:<pubkey>:<d>
d          addressable identifier
enc        content mode: plaintext | nip44 | mls (absent means plaintext)
counter    per-author monotonic counter (stored kinds only — see Ordering)
action     the action id this event belongs to
quorum     protocol version
```

Only single-letter tags are relay-indexed under NIP-01. `enc`, `counter`,
`action` and `quorum` are deliberately multi-character: they are read locally and
must not consume index space on generic relays.

### `content`

For kinds defined in this NIP, `content` is the **canonical JSON** (RFC 8785,
restricted to finite numbers) of the body schema for that kind, or the NIP-44 /
MLS ciphertext of the same when `enc` is not `plaintext`.

Canonical JSON is required rather than merely recommended. Because a Nostr event
id is a hash over `content`, two implementations that serialise the same body
differently produce different ids for the same fact, and every content-addressed
reference in this NIP — the action id, the approval id — silently stops matching
across implementations.

Metadata lives in tags; the body lives in `content`. That split is what makes
encryption a policy switch rather than a redesign: turning on `nip44` encrypts
`content` and leaves routing intact.

## Addressing: the `to` marker

An event is **addressed** to a pubkey when it carries a `p` tag with `to` in
position 4:

```json
["p", "<pubkey>", "<relay-hint>", "to"]
```

Agents SHOULD default to acting only on events addressed to them.

The marker exists because `p` is overloaded. NIP-22 requires a `p` tag naming the
parent's author, and this NIP wants `p` for addressing so agents can use the
indexed `{"#p": [...]}` filter. Both are legal and they mean different things.
Without a marker, an agent that replies to whoever asked — the common case —
cannot distinguish "you are being asked to act" from "you happen to be upstream
in this thread", and agent-to-agent runaway loops follow directly.

Therefore:

- `{"#p": [...]}` at the relay is a **coarse superset prefilter**. It is correct
  to over-deliver; the marker is not indexable.
- Exact matching MUST happen locally on the marker.
- A writer MUST NOT emit both a marked and an unmarked `p` tag for the same
  pubkey. The marked tag subsumes the unmarked one. Emitting both leaves a reader
  holding two tags for one pubkey where only one carries the marker, and a reader
  that checks the wrong one gets the wrong answer.

To a generic client, a marked `p` tag is an ordinary mention. Nothing breaks.

## `alt` is required

NIP-31 is marked `unrecommended`, on the grounds that it is bloated and that
NIP-89 handler discovery is the better answer for unknown kinds. This NIP
requires `alt` anyway, and the reason is specific to agents rather than a
disagreement with NIP-31 in general:

> The primary consumer of an unknown Quorum event is not a client with a UI. It
> is a **context packer feeding a language model**. NIP-89 cannot help there.
> There is no handler to resolve, no iframe to open and no user to click through
> — there is a token budget and a model that must be told what happened.

Rules:

1. Every event of a kind defined here MUST carry exactly one `alt` tag.
2. 1–280 characters, single line, plain text.
3. It MUST describe what happened, not what the event is. "Deployed api v1.4.2 to
   production" — not "a Quorum action event".
4. It MUST NOT be the only place a fact appears. It is a fallback, never the
   source of truth, and a reader that understands the kind MUST prefer the body.
5. **On encrypted channels `alt` is not encrypted.** Writers MUST keep it generic
   when `enc` is not `plaintext` — "an action completed", not the customer's name.
   A specific `alt` silently defeats the encryption it sits beside.

## Threads

A thread is a NIP-7D kind 11 event. Its id is the thread id, and every event
inside it carries NIP-22 root-scope tags `E`/`K`/`P` pointing at it.

Mutable task state lives in a **separate** addressable kind 38101 whose `d` is the
thread id, carrying `status` (`open`/`working`/`blocked`/`paused`/`done`),
`assignee`, `title`, `budget` and `spent`.

The split is deliberate. Making the thread itself addressable would make the
thread id a mutable coordinate that every `E` tag in the thread points at, so
editing the title would change what "this thread" means. An immutable root and a
separate state projection keeps references stable, and keeps the task layer
additive: strip every 38101 and a valid NIP-7D thread remains.

Kind 8109 `thread_op` events *request* state changes. In a workspace with a
Quorum-aware relay the relay folds them into 38101 and signs it; 38101 then
carries `folded_from` listing the ops it incorporated, which makes the relay's
projection auditable rather than merely asserted. Without such a relay, clients
fold locally and reach the same state.

Most ops are ordinary workspace traffic — claiming a task, marking it done — and
any member may publish them. `set_budget` is not: a thread's spending ceiling is
what stops a runaway agent, so raising it is an authority decision rather than a
coordination one. A relay implementing this NIP SHOULD require a `thread:budget`
capability for `set_budget` and leave the other ops open to members. See
[the two resources the relay owns](#the-two-resources-the-relay-owns).

### Budgets and spend

A thread's `spent` is the sum of its `add_spend` ops and **nothing else**. An
action body MAY also carry a `cost`, and that field is audit detail — what one
turn cost — which MUST NOT be folded into `spent`. An implementation that counts
both doubles every number in the workspace.

Spend is therefore **stated by the party that spent it**, never estimated by a
reader. That is what lets the mechanism survive encryption unchanged: on a
`nip44` or `mls` channel the relay cannot read a token count out of a message,
but an agent can still publish what it spent.

Costs and budgets are stated in different units and the conversion is part of
the rule. A `Cost` has `tokens_in`, `tokens_out`, `usd` and `msat`; a `Budget`
has `tokens`, `usd` and `msat`. **Both token halves count against `tokens`.**
Comparing either column on its own is how an overspend hides: a thread capped at
30,000 tokens that has spent 29,000 in and 28,000 out is nearly twice over and
looks fine from either side.

An absent dimension MUST stay absent when costs are summed. `{}` and `{usd: 0}`
are different claims — "nobody said" and "it was free" — and a thread reporting
spend in tokens must not grow a `usd: 0` that reads as a priced total.

A budget is **exhausted** when any stated ceiling is reached:

- a budget with no dimensions set is not a budget. `{}` means nobody has capped
  this thread and MUST NOT be read as a ceiling of zero.
- any one dimension is enough. Whoever set two ceilings meant both.
- **at the ceiling is exhausted, not under it** — `>=`. This is deliberate, and
  it is what makes `set_budget {usd: 0}` an immediate freeze on a thread somebody
  wants stopped now, using a capability that already exists rather than a verb
  nobody has implemented.

### Pausing an exhausted thread

Whoever folds the ops — relay or client — MUST set `status` to `paused` when the
folded state is exhausted, subject to three rules that are each load-bearing:

1. **Only while folding `add_spend` or `set_budget`.** Never while folding
   `set_status`, or a human resuming an exhausted thread would have their
   `working` rewritten to `paused` by the same fold that stored it, and the
   thread could never be reopened.
2. **Never on a thread whose status is `done`.** A spend report arriving late
   must not un-finish delivered work.
3. **It only ever sets `paused`.** Folding a *higher* ceiling over an exhausted
   thread does not resume it.

The consequence of rule 3 is the one to state plainly: **resuming and raising are
two decisions and take two ops.** `set_status` clears the pause; `set_budget`
clears the reason for it. They are separated because "this task may continue" and
"this task may spend more" are different questions with different answers, and
only the second is an authority decision.

A relay implementing this NIP SHOULD refuse a kind 8101 whose status is
`proposed` or `running` in a paused thread, and MUST NOT refuse anything else
there. Chat, comments, thread ops and the **terminal** transitions of an action
already running (`succeeded`/`failed`/`denied`/`cancelled`) all have to get
through: a paused thread that cannot close its running action loses the record of
work that happened, and a relay that silenced the thread it had just paused would
turn a budget alert into an outage in the one thread people need to talk in.

Agents SHOULD check the budget *before* publishing a `proposed`, and report the
refusal to the humans on the thread rather than to the relay. A rejected publish
raises inside a handler, a raise inside a handler is replayed, and a replay
against a relay that will refuse it every time turns a budget stop into a retry
loop against the thing trying to stop it.

Finally, an implementation MUST expect the total to exceed the ceiling. Spend is
reported after the fact, so **a budget is a stop sign at the next junction, not a
brake**: the action already running finishes and reports. An implementation that
discarded the overrun would be paying agents to be stopped.

## Actions

There is deliberately no `tool_call`/`tool_result` pair. A relay does not run
tools, so those would be log lines; they would re-specify MCP's tool shape inside
a chat protocol, leaving two schemas to keep in sync forever; and they would
hardcode one agent architecture. A workflow agent or a CI bot has no tool calls
and still does consequential work.

Instead: one kind, a stable `action_id`, and a status lifecycle. Each transition
is a new event carrying an `action` tag with that id.

```
proposed ─┬─→ awaiting_approval ─┬─→ running ─┬─→ succeeded
          │                      │            ├─→ failed
          └─────────────────────→┘            └─→ cancelled
                                 └─→ denied
```

**The action id is the event id of the `proposed` event.** Content-addressed, so
no allocator is needed and two implementations agree without coordinating.

A `proposed` action MUST carry `input_digest`: the digest of its canonical-JSON
`input`. An approval that cannot name its arguments authorises the action *name*
forever, which is not consent to anything in particular.

Note for implementers: because `created_at` is part of the event id, an agent
replaying its work MUST memoise the **signed event**, not the body. Rebuilding
the same body a second later yields a different id, and therefore a different
action.

### A chain is ordered by its parent links, not by `created_at`

Every transition after `proposed` MUST carry an `e` tag naming the event it
follows. A verifier evaluating the status lifecycle MUST order the chain by
those links — depth from the proposal — and MUST NOT order it by `created_at`.
Time MAY break ties between events that are genuinely unordered.

Two independent reasons, either sufficient:

- **It does not work.** A loop that needs no human, and often one that does on
  either side of the wait, publishes `proposed`, `awaiting_approval`, `running`
  and `succeeded` inside the same second. `created_at` has one-second
  resolution, so NIP-01's `(created_at, id)` order falls through to an id
  tiebreak — a hash — and the lifecycle check rejects honest chains about half
  the time.
- **It would not be safe if it did.** `created_at` is a client-supplied wall
  clock: the author picks it, so an attacker picks theirs. The ordering that
  decides whether an execution was legal MUST NOT be a field the executing party
  chooses. An event id is a hash of content that already includes the parent id,
  so causal order is the one ordering here nobody can rewrite after the fact.

### Only the proposer advances the chain

An 8101 or 8102 in a chain, signed by anyone other than the author of the
`proposed` event, MUST NOT affect the chain's status, its digests, or its
validity. A verifier SHOULD report it. A verifier MUST NOT treat it as making
the chain invalid.

Both halves are load-bearing, and the second is the one implementations get
wrong. Counting a stranger's transition would let any workspace member publish a
`succeeded` for someone else's deploy and have the log read as though the work
happened. But *erroring* on it hands every member a veto: one junk event, which
the proposer cannot retract, permanently invalidates an honest chain — and since
every event defined here is valid on a generic relay, no relay policy can be
relied on to stop them publishing it.

The rule that resolves both: **a chain is invalid only when the party doing the
work did something illegitimate.** A stranger's event says nothing about the
proposer's conduct, and is treated the way an approval from someone nobody asked
is already treated — recorded, disregarded, reported.

For the same reason, the `proposed` event is identified by *being* the event
whose id is the action id, never by "the event in this chain whose status says
proposed". Anyone may publish one of the latter.

## Approvals

1. The agent publishes 8102 `approval_request`, `p`-tagged with the `to` marker to
   each approver, carrying `title`, `risk`, `input_digest` and optionally
   `requested_grant`, `expires_at`, and `required` (for n-of-m; default 1).
2. A human publishes 8103 `approval_response`, whose NIP-22 `e`/`k` tags MUST
   point at the request — `k` MUST be `8102`.
3. Before acting, the agent MUST verify the response's signature, that the signer
   is among the addressed approvers, and that `input_digest` matches what it
   proposed.

If the human edited the parameters first, the response carries `modified_input`
and `modified_input_digest`, and the agent MUST re-verify against the modified
digest and MUST NOT execute the original input.

Requiring `k` rather than merely "some `e` tag" is load-bearing. Every threaded
event already carries an `e` tag, because a top-level NIP-22 comment sets its
parent to the thread root — so "has a parent" is trivially true and says nothing.
A response whose parent is the thread rather than a request is an approval of
nothing, and an agent that matches on action id alone would accept it.

**The request MUST come from the proposer**, and a verifier MUST disregard any
8102 in the chain signed by anyone else. This is stricter than the rule for
transitions above — those are ignored, this one must be — because a request
*names its own approvers*. Honour a stranger's and they ask themselves, answer
themselves, and the chain tallies as approved by someone the agent never
consulted.

A relay MAY refuse to store an 8103 whose signer is not among the addressees of
the 8102 it answers, and an 8101/8102 whose `action` tag names a chain proposed
by someone else. A relay doing so MUST fail *open* when it does not hold the
referenced event: events legitimately travel between relays, and refusing every
approval whose request has not arrived breaks federation to catch nothing. A
verifier holding the whole chain makes no such allowance — it is the party being
asked to act on the answer.

## Capabilities and delegation

A 38102 `capability_grant` is a signed attestation: *this pubkey may invoke this
resource, in this scope, until T, N times, granted by me.* Resources are named
after actions (`action:deploy`).

Resource strings are matched **exactly**; there are no wildcards, and nothing
narrows them. Anything a delegation might need to narrow therefore belongs in
`scope`, not in the resource name: `action:deploy` with `{env: production}`, not
`action:deploy.production`. A delegation reading "only in staging" can intersect
a scope; against a name it can only whitelist a different string, which is a
statement about identity rather than about authority and silently does nothing
if the string is misspelt. A scope that does not match refuses; a whitelist entry
matching no resource anyone requested is invisible.

**Enforcement happens at the resource.** The tool verifies the signature chain
before acting. A Quorum-aware relay MAY also enforce on plaintext channels as
defence in depth, but MUST NOT be the only thing between an agent and production
— that would reintroduce exactly the trusted server this design removes.

### The two resources the relay owns

Two resources are the exception to that rule, because for them the relay *is* the
resource. Nothing else can hold them:

| Resource | What holding it permits |
| --- | --- |
| `group:join` | The relay admits the grantee to the group named in `scope.group`. |
| `thread:budget` | The holder may publish a `set_budget` `thread_op`. |
| `channel:encrypt` | The holder may publish a `channel_policy` for the group in `scope.group`. |

`group:join` is the coarsest capability in the system — being in the workspace at
all — and the one most easily left implicit. NIP-29 says a relay MAY admit a kind
9021 join request to an open group; a workspace holding approval records and
capability grants MUST NOT. A relay implementing this NIP SHOULD refuse a join
request unless the requester holds an unexpired, unrevoked `group:join` grant
whose `scope.group` is that group, issued by an owner or admin of it, or unless
an admin admits them directly with a kind 9000.

Three consequences follow from membership being a grant rather than a row. It can
be issued to a key that does not exist yet and handed over with the key, which is
the ordinary case for an agent somebody else will run. It can be revoked, and a
third party can check who issued it without taking the relay's word. And it is
subject to the same `expires_at` the rest of the system uses.

`channel:encrypt` is what decides whether a channel is encrypted and under which
epoch, so it is authority over confidentiality rather than over conversation.
Owners and admins hold it implicitly; anyone else needs a grant scoped to that
group. A relay MUST refuse a 38107 whose `d` names a group other than its `h`
tag, or the grant is scoped to one channel and the policy lands on another.

`max_uses` cannot be enforced on any of these and MUST be ignored rather than
half-honoured: counting uses requires a caller to ask "how many times so far",
and there is none — a relay counting for itself would be asserting a fact nobody
can check. An invitation that should not stand forever bounds itself with
`expires_at`.

**Revoking `group:join` does not evict an existing member.** The grant answers
"may this key come in", asked once at the door; membership is the relay's own
state thereafter. Cancelling a keycard does not un-enter the building. Removing
someone is a NIP-29 kind 9001, and an operator who means both MUST do both.

Because these two names are matched exactly and are not otherwise reachable from
code, a relay SHOULD verify at startup that the names it enforces are the names
the protocol publishes — `relay_enforced` in the reference implementation's
`schemas/index.json` exists for that. A one-character divergence is not a build error and not a rejected event.
It is an operator issuing `group:jion`, seeing a green tick, and finding the
grantee still cannot get in.

**Delegation never escalates.** An action MAY carry `on_behalf_of` referencing a
38106 `delegation` signed by a human. The effective permission is the
**intersection** of the agent's grant and that human's own permissions, never the
union. Without this rule, "give the agent admin so it can help" is the only
workable pattern.

## Interrupts

A budget stops an agent nobody is watching. An `interrupt` (28101) stops one
somebody is. Every other control in this NIP is a decision made *before* work
starts — a capability, an approval, a ceiling — and this is the one made while it
is running, by the person who has just realised one of the others was wrong.

The body carries `mode` (`cancel`/`pause`/`steer`), `scope`
(`action`/`thread`), an optional `reason` and, for `steer`, an `instruction`.
An action-scoped interrupt MUST carry an `action` tag naming the action it stops;
a thread-scoped one stops everything the receiving agent is running in that
thread. Implementations SHOULD infer `scope` from whether an action was named
rather than defaulting it, because the two mistakes are asymmetric: an
action-scoped interrupt with no action tag stops nothing, while a thread-scoped
one sent by someone who meant "this one action" stops more than they asked for.

**Any member of the group may publish one**, deliberately not only the agent's
operator or the thread's approvers. Stopping is the safe direction — the worst
outcome of an unnecessary cancel is that work has to be re-proposed, and any
member can already publish `set_status: paused` — and a control only two people
may use is a control nobody uses in the ten seconds that matter.

An agent receiving a `cancel` or `pause` for an action it is running MUST abort
the effect and close the chain with a terminal `cancelled` event, **not**
`failed`. A job that broke and a job a human stopped are different facts that
send different people to different screens, and nothing downstream can recover
the distinction once it is lost. `pause` aborts exactly as `cancel` does; the
difference lives in the thread's status, which a human sets and a human clears.
There is no state in which an agent holds a half-finished effect in memory
waiting to be resumed, because that state does not survive the restart coming
for it.

A `steer` MUST NOT abort anything and its `instruction` MUST NOT be applied
automatically. It is handed to the handler as untrusted text, exactly like a
message from a stranger, because an instruction that redirects a running action
is prompt injection with a kind number.

An interrupt naming an action the receiver is not running matches nothing, and
the receiver SHOULD be silent about it. In a channel with several agents that is
the normal case, and every agent logging every interrupt it ignored buries the
one line that matters.

### There is no receipt, and interfaces must say so

28101 is ephemeral, so nothing stores it and there is no event to query
afterwards. An interrupt published while the agent is down is simply missed —
correct, since the action it was cancelling is not running either, and the
handler will be replayed from the top where a fresh interrupt can catch it.

The consequence is a rule about interfaces rather than about events: **a relay's
OK for a 28101 never means an agent heard it.** It means the relay routed it to
whoever was subscribed. Any client offering a Stop button MUST say so on the
screen, because the alternative is a human who believes a production action was
cancelled watching it complete.

## Leases

Running an agent as two processes for availability is normal, and the ordinary
way to do it is to give both the same key — that is what makes them replicas of
one agent rather than two agents. A `lease` (28102) is how they avoid both
answering.

A claim carries `instance`, `epoch`, `ttl_seconds` and an optional `purpose`.
`instance` is required and is not decoration: the holder cannot be identified by
`pubkey`, because two claims from one pubkey are the expected case here rather
than a conflict, so without a discriminator the replicas cannot tell each other
apart, let alone agree.

Claimants publish, wait a settle interval, and take the whole set of claims they
can see for that thread and purpose. The winner is the minimum by:

```
(created_at asc, epoch desc, "<pubkey>:<instance>" asc)
```

where `created_at` is the **earliest** claim seen from that holder for that
thread, not the most recent. A lease is renewed by republishing, and taking the
latest would make every renewal an act of self-demotion: the holder's timestamp
would move forward past a sibling's older losing claim and hand it the thread it
had already lost.

Every term is a field of a signed event, which is the property that matters:
each replica computes the winner from the same shared data and reaches the same
answer. Deciding by *local* observation order instead — first claim I saw wins —
gives two replicas two different winners whenever the relay delivers to them in
different orders, which is most of the time.

Leases are advisory. A lease cannot be made authoritative without a consensus
mechanism nobody wants in a chat relay, and an ephemeral event may simply be
lost. It removes the common case of duplicate work; it is not what makes
double-execution safe. That comes from idempotent effects and content-addressed
ids, and an implementation that treats a held lease as permission to skip them
has misread this section.

## Presence

A `presence` (28103) event carries `status` (`online`/`busy`/`offline`), an
optional `activity` caption, and `ttl_seconds`. An agent republishes while it
runs and SHOULD publish `offline` on a clean shutdown.

**A beat expires at its own `created_at + ttl_seconds`** — the author's clock,
not the reader's. Every reader therefore agrees on the moment it lapses, and an
agent whose clock is skewed looks stale to everybody rather than fresh to some.
The alternative, measuring from arrival, makes liveness a different fact for
each reader and hides skew instead of bounding it.

**Absence means nothing.** These events are ephemeral, so relays store none of
them and a client that connected a moment ago knows only about agents that have
beaten since. An empty set means "nobody has said", never "nobody is running".
Implementations MUST NOT present it as the latter, and MUST NOT condition any
action on it: an agent missing from the list may be halfway through the work
somebody is about to start again.

Readers resolve two beats from one pubkey sharing a `created_at` by **arrival
order**, not by the `(created_at, id)` tiebreak used elsewhere in this document.
An agent that finishes a job inside one second publishes `busy` and then
`online` in the same second, and a hash tiebreak strands it on the wrong status
until the next beat. The rule differs here because a heartbeat is only ever read
as the live stream the reader is watching, where arrival order is available and
meaningful, while a projection or a chain is folded from stored history that no
two readers receive identically. Nothing is ever authorised on a heartbeat,
which is what makes a reader-local rule acceptable at all.

## Ordering

Nostr has no total order. `created_at` is a client-supplied wall clock, and a
relay may withhold events by design. Three layers recover what matters:

1. **`counter`** — per-author monotonic. Lets a reader detect "I missed something
   from this author", which combined with `to`-marked addressing covers the case
   that actually matters: *did I miss something addressed to me.* Works on any
   relay.

   Events of an **ephemeral kind MUST NOT carry a `counter`**, and this is a
   requirement rather than an optimisation. Relays do not store ephemeral events,
   so a number spent on one is a sequence position nobody can ever backfill:
   every reader replaying from history would see a permanent hole for each lease
   renewal and heartbeat the author ever sent, and gap detection — the entire
   point of the tag — would report a loss roughly twice a minute forever.
   Numbering only the durable record keeps the signal worth having.

   A writer MUST allocate a counter at most once per event. In particular, a
   retry that rebuilds an event in order to be deduplicated by id MUST reuse the
   counter of the attempt it is repeating; allocating a fresh one changes the
   bytes, changes the id, and produces the second copy the retry was trying to
   avoid.

   A repeated counter from one author therefore means the key is in two places,
   which is worth interrupting somebody over. On an `mls` channel that reading is
   no longer the only one — see
   [a ratchet cannot repeat itself](#a-ratchet-cannot-repeat-itself).
2. **NIP-22 `e` tags** — causal structure. A missing parent is detectable because
   you hold its id. Works on any relay.
3. **8108 `checkpoint`** — a relay-signed Merkle root over the event ids it holds
   for a group up to time T. If it later serves a set missing a covered event,
   that is *cryptographic proof of misbehaviour*, not a suspicion.

Layer 3 is what keeps the relay from becoming a trust anchor: a checkpoint is a
commitment it cannot retract. A generic relay publishes none and readers degrade
to layers 1–2.

### Checkpoints

A checkpoint is a kind 8108 signed by the **relay's own key**, carrying an `h`
tag for the group it covers and a body of:

```jsonc
{
  "from": 1757836800,        // start of the window, inclusive
  "to": 1757837100,          // end of the window, inclusive
  "count": 42,               // distinct event ids covered
  "merkle_root": "<64 hex>",
  "algorithm": "sha256-merkle-sorted-v1",
  "prev": "<64 hex>"         // event id of the previous checkpoint, if any
}
```

#### `sha256-merkle-sorted-v1`

Leaves are the covered event ids, **lowercased, sorted ascending as hex strings,
and deduplicated**. Sorting is what makes the root reproducible by someone who
holds the same set but received it in a different order, which every reader
does.

```
leaf(id)       = sha256(0x00 || id_bytes)
node(l, r)     = sha256(0x01 || l || r)
root([])       = sha256("")
               = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

Pair adjacent nodes at each level; **an odd node at the end of a level is
promoted unchanged to the next level and MUST NOT be duplicated.** Both rules
are security requirements rather than conventions:

- Without the `0x00`/`0x01` domain separation (RFC 6962's construction), an
  internal node can be presented as a leaf.
- With Bitcoin's padding rule, `[a,b,c]` and `[a,b,c,c]` share a root
  (CVE-2012-2459), so a relay could commit to one set and later claim it meant
  the other.

A promoted node contributes no step to an audit path, so paths can be shorter
than `ceil(log2(n))` and a verifier MUST NOT require a particular length.

The reference implementation's `merkle-v1.json` fixture is the conformance
vector: 21 roots and 31 audit paths, generated by one implementation and
consumed by the others.

#### What is committed to

A checkpoint commits to **regular events only**. Replaceable (0, 3,
10000–19999), ephemeral (20000–29999) and addressable (30000–39999) kinds are
excluded, and this is a protocol rule rather than an implementation choice: a
superseded event's id disappears from the store, so a relay committing to one
would guarantee that a later reader comes up short and concludes it withheld
something. The relay would be manufacturing evidence against itself on every
task-status change. A verifier applying a different filter is computing a
different tree.

Kind 8108 is itself regular, so a relay commits to its own earlier checkpoints.

#### Closing a window

A relay MUST NOT sign a window that is still open to honest arrivals. Concretely,
a window's `to` MUST be at least the relay's own clock-skew tolerance behind the
time of signing: relays reject `created_at` values more than the skew in the past
or the future, so a window closed that far back cannot receive another event the
relay would accept. A relay whose lag is shorter than its skew will eventually
sign a commitment and then legitimately store an event inside it, and the next
reader to recompute the root will conclude — correctly, by the rules — that it
withheld one. The reference relay refuses to boot in that configuration rather
than clamping the value, because a clamped relay goes on publishing checkpoints
that look right and fails only as a false accusation against itself.

Windows for a group MUST be contiguous and non-overlapping: each `from` is the
previous `to + 1`. A window with no events still gets a checkpoint — a signed
empty root says "I held nothing", where silence says only that the relay stopped
talking, and those are different claims.

#### Chaining

`prev` is the **previous checkpoint's event id**, not its root. A root commits
only to the set; an id commits to the window bounds and the count as well, so a
relay cannot re-cut the same events into different windows and present either
version as the one it signed. It also keeps quiet windows distinguishable:
consecutive empty windows have identical roots and would chain ambiguously.

Only the first checkpoint a relay issues for a group may omit `prev`.

#### The two ways to check one

**Completeness.** Refetch a closed window, recompute the root from what you were
served, compare. A mismatch says something is missing or substituted, and names
nothing. This is the check any client can run against any checkpoint, and it
cannot distinguish "the relay is withholding" from "I did not ask for
everything" — so an implementation SHOULD report it as a verdict rather than an
accusation.

**Inclusion proof.** An O(log n) audit path from a leaf to the root. Only a party
holding the whole leaf set can produce one, which means it is the *relay's*
instrument: what it offers to show cheaply that it is not withholding a
particular event. A client cannot produce one for an event it never received.

The client's decisive artifact is neither, and is worth naming separately: if a
reader independently holds an event the relay is not serving — from a mirror, or
from before the relay started lying — then

```
root(served ∪ held) == committed root
```

is positive proof that the relay committed to an event it is not serving. There
is no innocent reading. The three pieces (the signed checkpoint, the served ids,
the held events) verify offline, from the bytes alone, forever. A verifier MUST
check the signature on each withheld event as well as on the checkpoint;
otherwise a fabricated event produces a failure that reads as an accusation gone
wrong rather than as a fabrication.

#### Honest limits

- A relay that publishes no checkpoints is not caught by any of this. Its
  silence is at least visible, which silent withholding is not.
- A relay that honours a NIP-09 deletion after committing to the deleted event
  will fail its own checkpoint. That is arguably correct, but the accusation has
  a mundane explanation available and an operator should know it.
- A checkpoint says nothing about authenticity. Authorship is still the author's
  signature. The relay is not a trust anchor here; it is a party that has been
  made to commit.

## Context

Context packing is a NIP-90 DVM (5600/6600), not a privileged endpoint, so the
packer is addressed by pubkey and is swappable. Results carry per-segment
`provenance: {pubkey, kind, trust}` where trust is `self` | `operator` | `member`
| `untrusted`, so an SDK can delimit untrusted content before it reaches a model.
Agents reading other agents' output is the normal case here, which makes this a
protocol-level concern rather than an application one.

**There is deliberately no designated summarizer agent.** If one agent produced
the summaries fed to all the others, a single prompt injection against it would
rewrite the working memory of the entire workspace — one malicious message
becoming persistent, laundered instructions delivered to agents that never saw
the original. This is structural, not patchable. Any agent MAY publish an 8104
`summary`; it is returned tagged with its provenance and trust, and callers MAY
demand `verbatim_only` and pay the tokens instead.

`budget_tokens` is **advisory**. The mandatory-keep set can exceed it. The result
reports `used_tokens` so callers can react rather than receive a silently
truncated history.

### The packer runs in two places, so it is specified as a function

On a `plaintext` channel a relay can pack context and one round trip replaces a
backfill. On `nip44` or `mls` it cannot read a word, and the packer has to move
into the client. So the same algorithm exists twice, in different languages, and
the two MUST agree — otherwise "which packer answered" becomes a fact an agent's
behaviour depends on, and a workspace that turns on encryption quietly changes
what every agent knows.

On `mls` the packer also loses its source. `gather` is a set of relay filters,
and under forward secrecy the events they return are no longer openable; the
client must pack from
[its own archive](#forward-secrecy-makes-a-channel-unreadable-to-its-own-members)
instead. The function is unchanged — it is pure in its events — but what a client
can put into it is now bounded by what it kept.

Agreement is only checkable if packing is a pure function, so `extractive-v1` is
defined as one:

```
pack(request, requester, events) -> result
```

with no clock, no network, no relay state and no configuration. Two
implementations given the same three inputs MUST produce byte-identical
canonical JSON for the result body. Everything below exists to make that
achievable rather than aspirational; where a rule looks arbitrary, it is usually
the cheapest thing two languages can agree on exactly.

`events` is whatever set the packer holds. A relay holds the group; a client
holds its backfill window. Identical output is required *for the same input
set*, and a packer that has seen fewer events MUST NOT be treated as wrong — it
reports what it packed, and `dropped_events` is a count over its own input.

### `extractive-v1`

**1. Select.** An event belongs to thread `T` if its id is `T`, if its NIP-22
`E` tag is `T`, or if it is a 38101 whose `d` is `T`. The thread state is
included because "what am I supposed to be doing" is the question an agent asks
first, and its answer is a projection rather than a message.

**2. Apply the caller's filters**, in this order: `include_kinds` (if present,
keep only these), `exclude_kinds`, `since` (drop events older than it). These
win over the mandatory-keep rules below. Mandatory-keep protects history from
*the budget*, never from an explicit instruction; a caller who excludes kind 11
gets no thread root and has asked for that.

**3. Drop what is never context**, whatever the caller said:

- every ephemeral kind (20000–29999) — leases and heartbeats are liveness, not
  history, and none of them is stored anywhere to be packed twice the same way;
- NIP-29 moderation and membership kinds (9000–9022, 39000–39003), NIP-25
  reactions (7), and NIP-09 deletion requests (5);
- 5600 and 6600 themselves, or a pack would contain its own previous answers;
- 38104 `agent_memory` and 38105 `agent_cursor` — another agent's scratch space
  is not this agent's history.

With `verbatim_only`, also drop every 8104 `summary`. A summary is somebody's
account of events rather than the events, and a caller paying full price for
history is entitled to refuse all of them without having to reason about who
wrote which.

**4. Collapse action chains.** Of the 8101 events sharing an `action` tag, keep
the `proposed` transition and the one with the highest status rank; drop the
rest. Rank is `proposed` 0, `awaiting_approval` 1, `running` 2, and every
terminal status (`succeeded`, `failed`, `denied`, `cancelled`) 3; ties are broken
by `(created_at, id)` ascending, keeping the last. The input and the outcome are
what a later reader needs; "it started running" is inferable from both.

**5. Mark the mandatory set.** The thread root, the 38101 thread state, every
8102 and 8103, every 8101 that survived step 4, and the 10 most recent surviving
events. These are never dropped for budget and never truncated. Approvals are in
that list because an agent that has forgotten what it was allowed to do is
exactly the failure this protocol exists to prevent.

**6. Order** every surviving event ascending by `(created_at, id)`, the NIP-01
rule, **except that the thread root sorts first whatever its `created_at` says**.
Note that this is otherwise deliberately *not* the parent-link order that
[action chains](#a-chain-is-ordered-by-its-parent-links-not-by-created_at) use.
Nothing is authorised on a context pack, and a reader needs a stable transcript
rather than a proof.

The root is the one exception because every other event in the thread `E`-tags
it, so its causal position is the one thing an ordering cannot get wrong by
accident — and `(created_at, id)` gets it wrong routinely. A thread opened and
answered inside the same second falls through to the lowest-id tiebreak, which
is a hash, and the pack then opens with two replies to a task the model has not
been told yet. The rule costs nothing: `T` is already known to both packers,
because it is what they were asked for.

**7. Fill the budget.** Every mandatory segment is included, whatever it costs.
Then optional segments are considered newest first and admitted while they fit;
at the first one that does not fit, admission **stops** and every older optional
segment is dropped. Stopping rather than continuing keeps the kept window
contiguous: a model handed the last hour with one arbitrary paragraph from
Tuesday wedged into it reasons worse than one handed a shorter hour.

**8. Truncate.** An optional segment's text is cut to 400 Unicode **code points**
and `…` (U+2026) is appended, with `truncated: true`. Code points rather than
bytes, because a byte cut can split a character; and implementations MUST NOT
trim to a word boundary, because word boundaries are locale-dependent and two
packers would disagree on the first Japanese sentence they were given.

**9. Segment text** is the event's `content` for kinds 9, 11 and 1111; the
`text` field of the body for 8104; and **the `alt` tag** for every other kind
defined here. This is what [`alt` is required](#alt-is-required) for. The
primary consumer of an unknown event is a context packer feeding a model, and a
packer that understood every kind it emitted would break on the first kind added
after it shipped.

**10. Provenance** is derived from `events` alone, so that both packers label
identically:

- `kind` is `relay` for an author that signed a 38101 or 8108 in the input,
  `agent` for one with a 38103 `agent_manifest` in the input, `human` otherwise.
- `trust` is `self` for the requester; `operator` for the pubkey named as
  `operator` in the *requester's own* manifest; `untrusted` for any `agent`
  author and for every 8104 whoever wrote it; `member` otherwise.
- `display_name` is omitted. There is no name in this NIP that is not a claim,
  and a packer that resolved one would make its output depend on a lookup the
  other packer cannot repeat.

An agent SHOULD delimit `untrusted` segments before they reach a model, and MAY
delimit `member` segments too: the distinction is who is accountable for the
text, not whether it is safe.

**11. Count tokens** as `ceil(utf8_bytes(text) / 4) + 8` per segment, summed.
This is a proxy and not a tokenizer. A real BPE count is model-specific and
versioned, so requiring one would make this NIP depend on a vendor's vocabulary
file and make agreement between two packers contingent on both shipping the same
build of it. The constant 8 covers the framing a caller adds per segment, which
is real cost that a pure text count hides. `budget_tokens` is advisory precisely
because this number is approximate; a caller needing an exact count MUST measure
the rendered prompt itself.

`dropped_events` counts the events that survived steps 2 and 3 but produced no
segment, which includes the transitions collapsed in step 4.

### Asking a packer

A `context_pack_request` (5600) carries a `to`-marked `p` tag naming the packer.
A packer MUST ignore requests not addressed to it; answering everything it can
see would have every packer in a workspace answer every request, and the
requester would have no way to know which answer it got.

The reply is a 6600 signed by the packer, `e`-tagging the request and
`p`-tagging the requester, in the same group. On failure the packer publishes a
NIP-90 kind 7000 job feedback with `["status", "error"]` and a reason. Silence
is not an answer: an agent blocked on context it will never receive is
indistinguishable from one doing slow work.

This departs from NIP-90 in one place. NIP-90 carries job parameters in `i` and
`param` tags; Quorum carries the body in `content` as canonical JSON like every
other kind here. One rule for every kind in this NIP is worth more than partial
conformance to a tag convention, and what makes this a DVM rather than an
endpoint is that the provider is addressed by pubkey.

## Memory

38104 `agent_memory` is an addressable event with `d` = a scoped key, so the
newest write per `(pubkey, d)` wins and an agent's memory is namespaced by the
key that wrote it. No agent can overwrite another's, and none has to coordinate
over key names.

Memory is **published**, and that is the point rather than an oversight. A
workspace whose agents remember things nobody can read is a workspace where the
answer to "why did it do that" lives on a disk somewhere; here it is an event a
human can fetch, quote and argue with. The cost is that memory is subject to the
[privacy rules](#privacy) like anything else: on a `plaintext` channel the relay
and every member can read it, Nostr has no unpublish, and an agent MUST NOT
write a secret into one.

Memory is not a cursor. 38105 exists for resume state because the two have
different lifetimes: a cursor is meaningless to anyone but the process that
wrote it and is rewritten several times a minute, while a memory entry is
supposed to outlive the agent that learned it. Packers drop both.

## Encryption

`enc` is a per-channel policy, present from day one so that changing it is never
a protocol break.

| Mode | Relay reads | Relay-side services |
| --- | --- | --- |
| `plaintext` | bodies | context packing, indexing, state projection, rate limits |
| `nip44` | tags only | none |
| `mls` | tags, and the MLS group id and epoch | none |

The two encrypted modes differ in what they defend against, not in strength.
`nip44` protects a channel's contents from the relay and from anyone the relay
serves. `mls` additionally gives **forward secrecy** — a key compromised today
does not open what was said last month — and **post-compromise security**, where
the next commit heals a group whose member was compromised. Neither hides the
social graph; see [Privacy](#privacy).

What `mls` costs is history, and the cost is structural rather than an
implementation gap: see
[forward secrecy makes a channel unreadable to its own members](#forward-secrecy-makes-a-channel-unreadable-to-its-own-members).

### `nip44`: a shared channel key, in epochs

NIP-44 is pairwise by construction — its conversation key is an ECDH between
exactly two keys — so a channel of N members needs a group construction on top.
Quorum uses **one random 32-byte channel key per epoch**, delivered to each
member as a pairwise NIP-44 payload.

The alternative, per-recipient fan-out, costs a copy of every message per member
and leaves a late joiner unable to read anything said before they arrived. Its
one advantage is that removing a member needs no re-key — which is not an
advantage, because the removed member still holds the plaintext of everything
sent while they were there.

Neither shape has forward secrecy and neither may pretend to. That is what `mls`
is for.

**Only `content` is encrypted.** Every tag stays in the clear, including `h`,
`p`, `e`, `E`, `counter`, `alt` and `enc` itself. An observer therefore keeps the
social graph: who is in the channel, who answered whom, when, and how often.
Implementations MUST state this rather than describe `nip44` channels as private.
A Quorum `mls` channel leaks the same graph, for the same reason; only the
[Marmot transport profile](#the-marmot-transport-profile-is-optional) hides it.

Four kinds make the encrypted modes possible and all of them stay unsealed:

- **`channel_policy` (38107)**, addressable with `d` = the group id, published by
  an owner or an admin. Body: `enc`, `epoch` (REQUIRED when `enc` is `nip44`,
  and MUST NOT be present when `enc` is `mls` — see
  [below](#an-mls-policy-states-no-epoch)), optional `reason` and `changed_at`.
  It is the event that tells a
  writer to encrypt, so it MUST be readable by somebody who cannot yet decrypt
  anything. `reason` is in the clear on purpose: a rotation is usually a removal,
  and "who lost access when" is the fact an audit needs and an encrypted channel
  would otherwise destroy.
- **`channel_key` (8110)**, one member's copy of the epoch secret. Body: `epoch`,
  `key` (a NIP-44 payload from issuer to recipient whose plaintext is the 64-hex
  channel key), `recipient`, and optional `supersedes`. The recipient is also
  named by a `to`-marked `p` tag. A key wrapped under the channel key would be a
  locked box containing its own key.
- **`mls_welcome` (8111)**, the `mls` analogue of 8110. Body: `epoch`, `invite`
  (a NIP-44 payload from inviter to recipient), `recipient`, and `key_package`
  (the **event id** of the 30443 this Welcome answers). The recipient is also
  named by a `to`-marked `p` tag. See
  [key establishment](#key-establishment-on-an-mls-channel).
- **`mls_commit` (8112)**, the message that moves every member to the next epoch.
  Body: `epoch` (the epoch the commit applies to), `commit` (base64 of a framed
  `mls_private_message` MLSMessage), and `adds` (the pubkeys the committer claims
  it is adding, which a receiver MUST NOT trust). No `to` tag: it is a broadcast
  to the whole channel. See [the commit](#the-commit-must-be-broadcast).

**An 8110 and an 8111 each name exactly one recipient, and name them twice.** The
`to`-marked `p` tag MUST be present, there MUST NOT be a second one, and it MUST
equal the body's `recipient`. A relay SHOULD refuse an event that breaks any of
the three, and it can check all of them from the envelope, which is what keeps
the rule enforceable on a channel whose bodies nobody at the relay can read.

Each arm fails silently, which is why all three are MUSTs rather than advice. No
`to` tag and the event is invisible: `#p` is how every reader locates key
material, so an unaddressed Welcome is stored, valid, and never found by the one
member it was for. Two `to` tags and both readers fetch it, one opens it, and the
other is required by the rule below to conclude it was not theirs — so a member
who *was* owed one waits for a Welcome that was, from where they sit, never sent.
And a tag that disagrees with `recipient` routes the payload to somebody who
cannot open it, surfacing as a NIP-44 MAC failure, which is indistinguishable
from tampering. In all three the issuer believes the key was handed over.

`supersedes` is how a member notices they were skipped: holding epoch 2 and
being handed epoch 4 marked `supersedes: 3` says a rotation happened that nobody
wrapped for them, which on an encrypted channel is otherwise indistinguishable
from silence.

A reader MUST accept older epochs. History does not re-encrypt, and a message
sent a second before a rotation is not invalid; the policy's `epoch` says which
key to *write* with.

### The nonce MUST be derived, not random

```
nonce = hmac_sha256(key = channel key, data = id of the event in the clear)
```

where "the event in the clear" means tags final and `content` still plaintext.

NIP-44 specifies 32 random bytes. Quorum cannot use them, because exactly-once
delivery here is not a lock or a ledger lookup — it is that a retried effect
rebuilds a **byte-identical event** whose id the relay already holds and
discards. A random nonce gives the retry a different ciphertext, a different id
and a second message in the channel, so idempotency would silently become a
property of unencrypted channels only. It is the same rule that makes a retry
reuse its reserved `counter` and `created_at`.

It MUST be a MAC and not a plain hash. A bare `sha256` of the plaintext event
would be a public commitment to the plaintext published inside every payload, so
a relay wanting to know whether an approver said `approved` could hash the guess
and compare — a confirmation attack against every low-entropy message, which on
a task-tracking protocol is most of them. Keying the derivation means only a
member can build the nonce, and a member can already read the message.

This is the synthetic-IV construction from deterministic AEAD, and it carries
SIV's cost: identical plaintexts produce identical ciphertexts, so an observer
sees repetition.

### Which kinds stay in the clear

The list is written as **exceptions**, so a kind added later is sealed by
default. An allowlist of sealed kinds fails the other way, and its failure mode
is a new event type quietly published in plaintext into channels that believe
they are private.

| Kinds | Why |
| --- | --- |
| 8110, 8111, 38107, 30443 | key management — the bootstrap must be readable by someone with no key |
| 8112 | already an MLS `PrivateMessage` — sealing it to the group would be circular |
| 38102, 38106, 22242 | authorization — a capability nobody can audit is not a capability |
| 8108, 38101, 7000 | relay-authored — the relay cannot encrypt to a key it does not hold |
| 9000–9030, 39000–39999 | NIP-29 moderation and metadata, addressed to the relay |

The two `mls` bootstrap kinds are unsealed for the same reason 8110 and 38107
are: they are how a member with no key gets one. Their *bodies* are not public. A
30443 KeyPackage is signed public material by design, and an 8111's `invite` is a
NIP-44 payload from the inviter to the one recipient — a different key from the
group's, so the envelope being in the clear reveals only that somebody was
invited. Sealing either to the group would be sealing it to everybody except the
person it is for.

8112 is the exception to the exception: its readers *are* members holding a key.
It is unsealed because its content is already encrypted to the group, so sealing
it would make applying a commit require the state that applying the commit is
what produces. See [the commit](#the-commit-must-be-broadcast).

Everything else MUST be sealed on a channel whose policy says `nip44` or `mls`. A relay
MAY refuse an unsealed content-bearing event on such a channel, and MAY refuse an
`enc=nip44` tag on a channel with no encryption policy — the second arm matters
because `enc` being set is what skips body validation, so without it one tag is a
bypass of the whole schema.

`alt` is plaintext on a sealed event, so a sealed event MUST NOT describe its own
body in one. Implementations write a generic line instead; an `alt` summarising
the request would publish in the clear the sentence the body was hidden to
protect.

### Rotation publishes wraps first and the policy last

To rotate, an owner or admin mints a new key, publishes one 8110 per remaining
member, and publishes the 38107 naming the new epoch **last**. The policy is what
tells every writer to start sealing under the new epoch; publish it first and
every member encrypts to an epoch that has reached nobody. The other order costs
a few hundred milliseconds during which the removed member can still read, which
is the shorter outage and MUST be stated rather than designed around.

**Rotation mints; it does not revoke.** A removed member keeps every byte they
already hold, forever. Joining is the mirror: it hands over no history unless an
admin wraps past epochs one 8110 at a time, and whether to do so is a decision
for the admin rather than a default in a library.

Setting a channel's policy is gated on the `channel:encrypt` resource, scoped
`{group}`; owners and admins pass without a grant. See
[the two resources the relay owns](#the-two-resources-the-relay-owns).

### Auditing a sealed channel requires a key

A verifier MUST check the signature against the **sealed bytes as published**,
then open the body. The signature is over the ciphertext; a verifier that opens
first is verifying an event that was never published.

The consequence is unavoidable and MUST be reported rather than hidden. A reader
with no key can still find an action chain, because the tags are in the clear,
and can verify every signature in it — but it cannot read the `input_digest`,
which lives in the sealed body and not in a tag, so it cannot tell whether an
approval approved this input. It also cannot locate the chain's anchor, because a
`proposed` event carries no `action` tag: its own id *is* the action id.

So a keyless audit of a sealed chain reports that the chain is sealed, and that
it found no proposal. It MUST NOT report a signature failure, and MUST NOT report
a clean pass. On a `nip44` channel, "anyone can verify this consent offline"
becomes "anyone holding an epoch key can", which is a real subtraction from the
guarantee in [Approvals](#approvals) and belongs in any implementation's
documentation.

### `mls`: the same envelope, a different key schedule

An `mls` event is an ordinary Quorum event. The kind, the tags and the signature
are exactly what they are on a `plaintext` channel; only `content` differs, and
it holds the base64 of an RFC 9420 `MLSMessage` carrying an application message
whose plaintext is the body that would otherwise be there. `enc` is `mls` and the
`epoch` tag carries the **MLS epoch**, which is the same field doing the same job
it does under `nip44`.

The MLS `group_id` MUST be the UTF-8 bytes of the NIP-29 group id. One channel
has one identifier, so a reader never has to reconcile two, and a receiver
selects the group state by `h` rather than by trial decryption. A receiver MUST
also check the binding in the other direction — that the opened message's
`group_id` is the one its `h` tag named — because a member of two channels can
lift a message out of one and republish it into the other, where the relay routes
it by `h`, the ratchet opens it, and the body lands in a thread it was never sent
to.

> An earlier draft of this paragraph said "the 32 bytes of the NIP-29 group id",
> which assumed a group id is 32-byte hex. NIP-29 places no constraint on the
> string and real ones are human-chosen names. Hashing to a fixed 32 bytes was
> the alternative and buys nothing: MLS declares `opaque group_id<V>`, of
> variable length, and a digest would cost the property the rule exists for —
> that the same identifier is legible in both places.

The `epoch` tag carries the MLS epoch verbatim, is REQUIRED on an `mls` event
with a non-empty `content`, and MLS counts epochs from **0** at group creation. A
reader MUST accept `epoch 0`; this is the one place the field differs from
`nip44`, where a channel key generation is minted from 1. A reader that opens the
message MUST reject it if the tag and the ciphertext's own epoch disagree —
otherwise a mislabelled event turns "I am missing epoch 4" into a search for a
key that was never used, which is the sentence the tag exists to make possible.

The obligation is deliberately asymmetric: a sender MUST write the tag, and a
reader holding a message it has already opened MUST NOT discard it merely because
the tag is absent. The epoch is authenticated inside the `MLSMessage` header, so
an absent tag costs a reader nothing it has not already recovered; it only costs
the reader who *cannot* open the message the ability to say why.

A Quorum `mls` group MUST use ciphersuite **1**,
`MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519`, and a client MUST refuse to join a
group that names another. One suite rather than a negotiated set, because MLS
negotiates nothing at the message level: a group *has* a ciphersuite and every
member implements it or cannot participate. Making it a workspace setting would
move a compatibility failure from configuration time to join time, where it
presents as a member who silently reads nothing. Suite 1 is RFC 9420's
mandatory-to-implement suite, and its signature scheme is the one that resolves to
WebCrypto in both Node and a browser, so a reference client needs no additional
crypto dependency to read its own channel.

A relay therefore sees every tag, plus the three fields an MLS `PrivateMessage`
leaves public: the group id, the epoch, and whether the message is application
data or a commit. The sender's leaf index is inside `encrypted_sender_data` and
is not among them, but the event is signed, so the author is public anyway.

The previous draft of this section said `mls` breaks `p`-tag addressing and
per-principal rate limiting. **That is a property of Marmot's transport, not of
MLS.** Marmot publishes each message under a fresh ephemeral key with no tag but
`h`, which does delete addressing, counters, `alt` and every relay-side control
at once. Keeping the Quorum envelope keeps all of them, and costs the metadata
privacy that the ephemeral key buys — the same graph leak `nip44` already has and
already documents. The trade is stated, not resolved: see
[the Marmot transport profile](#the-marmot-transport-profile-is-optional).

The third tension, membership, does not dissolve. It is below.

#### An `mls` policy states no epoch

A 38107 with `enc: mls` **MUST NOT** carry `epoch`, and a reader MUST reject one
that does. This is the one field a channel policy has that `mls` cannot supply.

`epoch` exists to tell a writer which key to seal under *right now*. On `nip44`
an admin knows that, because the admin mints the key and wraps it; on `mls`
nobody does. The epoch is a property of the ratchet, advanced by every commit any
member makes, and a commit is a message the relay stores and nobody re-publishes
a policy for. So a number written here is stale the instant somebody is added,
and stale in the damaging direction: a client that believed it would seal at an
epoch the group has already left, producing messages every other member drops.
Absent is the only value that cannot be wrong.

This also removes an inconsistency that would otherwise be unresolvable. `epoch`
is a positive integer, because a `nip44` generation is minted from 1 to keep
"generation zero" distinguishable from a missing field — so an `mls` policy could
not have stated epoch 0, the epoch every MLS group begins at, even if the field
had been the right place for it.

The same asymmetry reaches the `epoch` *tag*, where the rule is the opposite one:
the tag is per message and authenticated inside the ciphertext, so it is REQUIRED
and may legitimately read `0`. A relay checking the tag's floor MUST therefore
take it from the channel's mode — 0 on `mls`, 1 on `nip44` — rather than applying
one minimum to both. Applied uniformly at 1, the floor refuses the opening
messages of every MLS channel it will ever host, and does so with an error about
a number RFC 9420 requires.

#### What a relay enforces on an `mls` channel

Everything a relay does here it does from the envelope and from `epoch`, the one
JSON field this spec deliberately leaves in the clear. A relay implementing this
spec MUST NOT parse `MLSMessage`s, and needs no MLS code to do the job RFC 9420
gives a delivery service: store, route, order.

- **Store.** The `enc=mls` tag is refused on a channel with no `mls` policy, and
  a kind that [must be sealed](#which-kinds-stay-in-the-clear) is refused in the
  clear on one that has it — the same two rules as `nip44`, unchanged. A relay
  MUST also refuse a 38107 that says `mls` and carries an `epoch`; see
  [An mls policy states no epoch](#an-mls-policy-states-no-epoch). That rule is
  cross-field, so it cannot be expressed in the JSON Schema a relay validates
  from, and a relay that leaves it to its clients stores a policy event every
  conforming client refuses to parse — which presents as a channel with no
  policy at all.
- **Route.** A 30443 whose `d` is not its `h`, and an 8111 addressed to more than
  one member, are both refused. Both are addressing failures that no other layer
  reports, because both produce a member in good standing who reads nothing.
- **Order.** At most one 8112 per group per epoch is stored, and the rest refused;
  see [the commit](#the-commit-must-be-broadcast). A relay MAY bound how far back
  it looks, because the rule is a SHOULD and correctness never rests on it: the
  same channel on a generic relay is serialised by nobody, so a receiver settles
  ties on the lowest event id regardless of who is carrying it.

What a relay MUST NOT attempt is any statement about whether a commit is valid,
whether the committer was in the tree, or whether a ciphertext opens. Those are
decidable only by members, and a relay that guessed would either refuse honest
traffic or certify a forgery, in a language nobody can appeal.

### Authorship is the Nostr signature, not the MLS credential

MLS authenticates a sender to the group. That is strictly weaker than what
[Approvals](#approvals) promises, on two counts: the attribution is only
checkable by someone holding the group's ratchet-tree state, and under forward
secrecy that state is deleted on a schedule. An approval nobody can attribute in
six months is not an audit record.

So on a Quorum `mls` channel the event is signed by the author's own key, as
everywhere else, and **the Nostr signature is the authorship claim**. The MLS
side is a second statement about the same fact, and an implementation MUST check
the two agree. Without that check a member can re-publish another member's
application message under their own signature — the ciphertext opens, because it
really is the other member's, and the body is then attributed by signature to
whoever republished it.

The check is made in two places, because the credential and the message are
legible at different moments:

- **At join time, against the credential.** A KeyPackage published as a kind
  30443 MUST carry a `basic` credential whose identity is the publishing pubkey as
  **32 raw bytes** — the same encoding as the `authenticated_data` below, not hex
  and not npub — and a member committing an Add MUST reject a KeyPackage whose
  credential identity is not the `pubkey` that signed the 30443 carrying it. This
  is where the identity in the tree and the identity on the relay are made one
  principal. One fact written one way in both halves of one binding: an
  implementation that encoded the credential as hex and the `authenticated_data`
  as raw bytes would pass both checks separately and have no single thing to
  compare them against.
- **Per message, against the `authenticated_data`.** An `mls` application message
  MUST carry the sender's pubkey — 32 raw bytes, not hex — as the MLS
  `authenticated_data` of its `PrivateMessage`, and a receiver MUST reject a
  message whose `authenticated_data` is not the event's own `pubkey`.

> An earlier draft of this section required the per-message check against the
> credential itself. It is not achievable at a receiver. RFC 9420 encrypts the
> sender index inside `encrypted_sender_data`, and an MLS library that follows the
> RFC verifies the sender's signature and then returns the plaintext with no
> sender in it — `ts-mls` does exactly this. A rule an implementation can only
> satisfy by reaching into a library's internals for a value the library has
> decided not to publish is not a rule; it is a suggestion that everyone
> implements differently.

The `authenticated_data` carries the same weight. It is covered by the AEAD *and*
by the sender's `FramedContent` signature, so a third party cannot alter it:
tampering does not produce a message attributed to somebody else, it produces one
that does not decrypt. Admitting a message therefore still requires the same
principal to control both the inner assertion and the Nostr key, which is what
the credential binding was for. It leaks nothing — the event's own `pubkey` field
publishes the author in the clear already — and, being outside the ciphertext's
plaintext, it is checkable *before* a generation is spent.

**A receiver that rejects a message on any of these bindings MUST discard the
ratchet state the check produced, and MUST retain the state it had before.** This
is the rule that keeps the binding from becoming a weapon. Detecting a republished
message costs a decryption, and a decryption consumes the generation; commit it
and Mallory silences the channel by republishing each message a moment before its
author does, one permanently unopenable event at a time. Discarding is sound
because an MLS state transition is a pure function of the state and the message:
the retained state still opens the honest copy when it arrives.

This gives up deniability, deliberately. Anyone who can open the message can
prove to a third party who wrote it, which is the opposite of what a private
messaging protocol usually offers and is the whole of pillar two. An
implementation MUST NOT describe a Quorum `mls` channel as deniable.

Verification is unchanged from `nip44`: check the signature against the sealed
bytes as published, then open. One rule, both modes.

### Membership on an `mls` channel is two lists

The NIP-29 member list and the MLS ratchet tree answer different questions, and
an implementation MUST NOT infer either from the other:

- the **relay** decides admission — who may connect, publish and read — from the
  NIP-29 list alone;
- a **client** decides who can actually read a message from the ratchet tree
  alone.

They disagree in both directions, and each disagreement is a real state a
workspace lands in. Someone in the group and not in the tree can publish and
reads nothing, which looks exactly like a quiet member; this is the `nip44`
locked-out case again and an implementation MUST provide a way to see it. Someone
in the tree and not in the group is worse, because **removing a member at the
relay is not removing them.** Every Quorum event is valid on any generic relay,
so a member holding current epoch secrets goes on reading the channel from
anywhere else it is carried. Only an MLS Remove commit ends that.

Removal is therefore two acts — a Remove commit and a NIP-29 kind 9001 — and an
implementation MUST NOT present either alone as removal. Order does not affect
correctness for the remaining members, since the commit reaches them either way.

### Key establishment on an `mls` channel

Three kinds, in five acts, and the order is fixed by the relay rather than by
preference:

1. the joiner publishes a **kind 30443** KeyPackage into the channel;
2. a member already in the tree reads it and checks it;
3. that member commits an Add and broadcasts it as a **kind 8112**;
4. the same member publishes one **kind 8111** per new member;
5. the new member opens their 8111 and joins the ratchet, and every existing
   member applies the 8112 — see [the commit](#the-commit-must-be-broadcast).

Act 1 cannot happen before NIP-29 admission, because the event carries an `h`
tag and a workspace relay refuses those from non-members. That is the design
working rather than a constraint to route around: admission is a capability
decision an owner makes, and the ratchet records the consequence. It does not
merge the two lists — see [above](#membership-on-an-mls-channel-is-two-lists).

**The KeyPackage (30443).** The kind number, the `content` and the tag names are
Marmot's: `content` is base64 of a framed `mls_key_package` MLSMessage, and the
tags are `mls_protocol_version` (`1.0`), `i` (the KeyPackageRef, 32 bytes of
lowercase hex), and the three capability lists `mls_ciphersuite`,
`mls_extensions` and `mls_proposals`. Each capability list is **one tag holding
every value**, `0x`-prefixed lowercase 4-digit hex — not the usual one-tag-per-
value convention, and a reader MUST refuse any other spelling rather than read
`0x1` as nothing.

Quorum diverges from Marmot in three places, each for a stated reason:

- **`d` is the channel id, and the event carries an `h` tag.** Marmot's `d` is 32
  random bytes and is explicitly never derived, because a derived `d` would leak
  which groups a member is trying to join. A Quorum 30443 publishes the channel
  in the clear anyway — it has to, so the relay can route and admit it — so a
  random `d` protects nothing, while a predictable one makes
  `30443:<pubkey>:<channel>` name exactly one member's current KeyPackage for
  exactly one channel. An inviter can then fetch a specific member instead of
  scanning the workspace, and addressable replacement does the single-use
  bookkeeping: publishing the next KeyPackage into the slot retires the spent one.
  A 30443 whose `d` is not its `h` MUST be rejected, by readers and by relays, and
  the reason is that single-use is *only* enforced by that replacement. A package
  in a foreign slot still answers the `#h` query an inviter makes, so it looks
  entirely usable, while the member's next package lands elsewhere and never
  supersedes it. The spent one stays live indefinitely; an inviter commits an Add
  against a private half the joiner discarded long ago; and the joiner ends up in
  the ratchet tree, counted as a member by everyone, able to read nothing.
- **No `app_components` and no account-identity-proof.** Marmot requires a
  `marmot.member.account-identity-proof.v2` entry in the leaf's app data, and the
  requirement is specific to its transport: under a per-message ephemeral key the
  Nostr layer says nothing about who authored anything, so the proof is how a
  credential is tied back to an account. A Quorum 30443 is signed by the account.
  The signature over the event whose content holds the credential **is** that
  proof, over the same bytes by the same key, with one fewer format to disagree.
- **No `encoding` tag.** This spec fixes base64 for every kind, so a tag
  restating it is a third place to keep in step.

An implementation MUST NOT claim Marmot KeyPackage compatibility on the strength
of the shared kind number. The payload is the same object; the validity rules
around it are not.

**Before committing an Add**, a member MUST reject a 30443 that fails any of:
the protocol version is `1.0`; the framed message is an `mls_key_package`; the
ciphersuite is the one
[this channel speaks](#mls-the-same-envelope-a-different-key-schedule); the
KeyPackage's own signature verifies; the `i` tag equals the ref recomputed from
the bytes actually sent; and the `basic` credential identity equals the event's
`pubkey`.
The last is the join-time half of
[the authorship binding](#authorship-is-the-nostr-signature-not-the-mls-credential)
and is the only moment it can be checked, because a receiver of an application
message never sees a credential. A member who rejects one SHOULD report it: an
invitee silently left out of a commit is waiting for a Welcome that is not coming.

**The Welcome (8111).** One commit produces one Welcome, and the committer
publishes it once per recipient as a kind 8111 `to`-marked to that member. The
`invite` field is a NIP-44 payload from inviter to recipient whose plaintext is
`{"welcome": <base64 framed mls_welcome MLSMessage>, "ratchet_tree": <base64
TLS-encoded RatchetTree>}`. The tree travels with the Welcome because a joiner
needs it to build the group state and MUST NOT be expected to obtain it from the
relay; it is inside the NIP-44 payload because it carries every member's leaf
node. `key_package` names the 30443 **by event id**, not by coordinate, because a
KeyPackage is single-use and the addressable slot may already hold its
replacement by the time the invitee reads it.

**The order is the 8112, then the ratchet, then the 8111s**, and each step is
before the next for a different reason. The commit is broadcast first because
whether it is the group's next epoch at all is decided by the delivery service
and not by the committer — see [the commit](#the-commit-must-be-broadcast). The
Welcomes go last because the group must have actually moved before anyone is
handed entry to it: publishing them first would hand out entry to an epoch that
may never exist, which is unrecoverable because the recipient's KeyPackage is
spent either way. A crash between the ratchet and the last Welcome costs the
missed invitee their invitation — they are in the tree, can read nothing, and
must be removed and re-added — which is the only one of the three failures that
is recoverable.

A recipient whose current KeyPackage is not named in a Welcome's secrets MUST
treat it as not theirs rather than as an error — a member added, removed and
re-added has more than one 8111 in the channel — and MUST make that check before
touching the ratchet. After a Welcome that failed to open, a member MUST NOT
republish their KeyPackage: the old package's private half is the only thing that
can open a Welcome already in flight, and replacing it turns a delivery problem
into a member who can never be added.

**Why this is not NIP-59.** Marmot delivers its Welcome as an unsigned kind 444
rumor inside a kind 13 seal inside a kind 1059 gift wrap signed by an ephemeral
key, announced through a kind 10050 inbox list. Quorum uses none of those four,
and the reason is a relay rule rather than a preference. A gift wrap must carry
an `h` tag to be routed and queried at all — a NIP-29 relay refuses a
tag-filtered query that does not name a group — and it must be signed by an
ephemeral key to be a gift wrap; but a NIP-29 relay refuses an `h`-tagged event
whose author is not a member of that group. Both cannot be true of one event.
With a real signing key the wrapping buys nothing anyway: the `h` tag publishes
the channel, the `to`-marked `p` publishes the recipient, and the signature
publishes the sender, which is the entire set of facts 1059 and 13 exist to hide.
The Welcome's confidentiality never rested on the Nostr layer — it is HPKE-
encrypted to the recipient's `init_key`. Kind 444 also falls outside every NIP-01
storage range, so a stored 444 has undefined semantics on a generic relay, which
the rule that every Quorum event is valid on any relay does not permit. And
10050 has no reader here, because a Quorum invitee is already a NIP-29 member of
the workspace relay by act 1.

### The commit must be broadcast

Every MLS commit changes the group's key schedule, and every member has to apply
the same one or the group splits. A committer that keeps the new state and drops
the commit message advances alone: from the next message onward, every other
member fails to decrypt, deep inside an MLS implementation, with no epoch and no
group and no member named in the error. This is invisible in a two-member group,
because the only other member is the one who committed.

So: **a member that commits MUST publish the commit message as a kind 8112
before advancing its own state, and a member that receives one MUST apply it.**

```json
{
  "epoch": 3,
  "commit": "<base64 framed mls_private_message MLSMessage>",
  "adds": ["<pubkey>", "…"]
}
```

**`epoch` is the epoch the commit was created at** — the one it applies to, not
the one it produces — and it is in the clear in the body rather than read out of
the MLSMessage. That is deliberate: it is what lets a relay serialise commits
without implementing any part of MLS, which is the property that keeps
`enc=mls` a client-only concern. A receiver MUST compare it with its own epoch
and MUST distinguish three cases. Equal means apply it. Lower means it has
already been applied — the ordinary result of a backfill, which MUST be silent
rather than an error, since a relay re-serves the whole history on every
reconnect. Higher means a commit was missed, and there is no catching a ratchet
up across a commit it never held; a receiver MUST report that the member is
stranded and must be removed and re-added, rather than leaving every subsequent
message to fail as a decryption error.

`adds` names the pubkeys the committer claims to be adding. A receiver **MUST
NOT** trust it: the tree is the truth and this is a claim, useful for a
notification and for the `alt` line and for nothing that decides access.

8112 is [unsealed](#which-kinds-stay-in-the-clear), and for a different reason from
every other kind on that list. The others are unsealed because their readers hold
no key; a commit's readers are members who do. It is unsealed because its content
is *already* an MLS `PrivateMessage`, so sealing it would encrypt to the group
something encrypted to the group — and a member who missed the previous commit
could not open the envelope carrying the commit they need, which is exactly the
deadlock this kind exists to break.

**Two members may commit from the same epoch, and only one commit can win.** The
committer therefore MUST publish before advancing, which is the reverse of the
[state-first rule](#a-ratchet-cannot-repeat-itself) for application messages, and
for a reason that does not apply there: a message's validity is decided by its
sender, a commit's by everyone else. Advance first and a committer whose commit
is refused has removed itself from its own channel, silently. A relay implementing
this spec SHOULD store at most one 8112 per group per epoch and refuse the rest —
which it can do from the body alone — and on any other relay carrying the channel
a receiver MUST settle a tie deterministically, lowest event id first, so that
every member picks the same winner. A committer that loses is stranded by the
rule above and must be re-added, which is the correct outcome and not a
degradation of it.

A receiver MUST apply commits in ascending `epoch`, which is not the order a
relay serves them in: NIP-01 returns newest first. Applying them as they arrive
fails on the first one with "a commit was missed", about a member who missed
nothing.

### A ratchet cannot repeat itself

`once()` rests on a retry rebuilding byte-identical bytes, so the relay's own
`id`-is-a-content-hash dedupe absorbs it. `nip44` preserves that with a derived
nonce. **MLS cannot**: the secret tree advances per message, so re-encrypting the
same body yields different ciphertext and consumes a generation. Naively retried,
one message becomes two.

A sender MUST therefore persist the sealed envelope before publishing it and
MUST republish the stored bytes on retry rather than re-sealing. With that, every
guarantee in [Ordering](#ordering) holds unchanged.

Two writes are involved — the advanced ratchet state and the sealed envelope —
and **the state MUST be persisted first.** The order is not a preference. Persist
the envelope first and a crash in the gap leaves the stored state one generation
behind what was published, so the sender's *next* message reuses a generation
every receiver has already spent; every receiver drops it, none of them reports
anything, and the sender believes it spoke. Persist the state first and a crash
in the gap leaves a consumed generation with no cached envelope, so the retry
seals again and the channel gets the same body twice under one `counter` — which
the rule below already covers. A duplicate somebody can see beats a message
nobody gets.

A crash between the ratchet step and that write is still possible, and it
produces two events from one author bearing the same `counter`. A receiver MUST
disambiguate by opening them: same counter and the same plaintext under the same
epoch is a retry whose cache was lost, and MUST be suppressed as a duplicate;
same counter and different plaintext is the one the counter rule exists for — a
key in two places — and MUST be reported. This refines the rule in
[Ordering](#ordering), which treats every repeated counter as the second case.

### Forward secrecy makes a channel unreadable to its own members

This is the cost of `mls`, it is structural, and an implementation MUST state it
rather than discover it.

MLS deletes the material that decrypts old messages; that is what forward secrecy
*is*. A member who has kept nothing locally therefore cannot re-read their own
channel — not because they were removed, but because the ciphertext the relay
still holds is now noise to everyone. Every mechanism in this document that
re-reads the log is affected: an agent replaying its thread on restart, a client
backfilling, a packer gathering a thread for [Context](#context), and an auditor
walking a chain in [Approvals](#approvals).

A Quorum `mls` client MUST therefore keep its own durable archive of the
plaintext it has opened, and the relay becomes the transport rather than the
system of record. An implementation MUST be explicit about where that archive
lives and how it is protected, because it is now the only copy and it is not
protected by MLS.

Three rules about that archive, each of which fixes a way of losing it quietly:

- **A re-recorded event MUST NOT overwrite a plaintext already held.** This is
  the ordinary way an archive is destroyed and it requires no bug: a client
  restarts, backfills the channel, meets every event it archived last month, can
  no longer open any of them, and writes each one back as unreadable. Nothing
  errors and the only readable copy is gone.
- **The archive MUST record events it could not open**, with no plaintext rather
  than not at all. "This thread has ten events and I hold seven bodies" is a
  sentence a reader must be able to say; an archive holding only what it could
  read presents a complete-looking history with three messages missing from it.
- **An implementation MUST keep the whole event, not only the body.** The
  signature is over the sealed bytes and it is the authorship claim, so an
  archive of plaintexts that relies on a relay still serving the envelopes is not
  a record of anything.

The archive is also the only thing that makes a re-seen event readable, so **a
receiver MUST consult it before the ratchet and MUST NOT process an application
message it has already opened.** Decryption deletes the generation it used, so a
second attempt at the same message does not return the same answer — it fails.
The ordinary way this happens is not an error path but a reconnect: restart,
backfill, meet the whole of last month again. Archive-first is therefore a
requirement rather than a cache policy, and an implementation that treats it as
an optimisation works in every test written by hand and breaks on the first real
reconnection.

Retention is the one place any of the forward secrecy can be recovered, and it is
a workspace's decision rather than a library's: keeping forever preserves the
audit trail and keeps yesterday's traffic beside today's key, keeping a window
gives some of the property back, keeping nothing means a restart loses the
thread. An implementation SHOULD offer a retention window and MUST NOT apply one
by default; deleting an audit trail on a timer nobody set is not a feature. A
window SHOULD be measured by the event's `created_at` rather than by when the
client saw it, or two members who joined a month apart hold different windows of
the same channel and the workspace's stated retention is true of neither.

Two consequences follow that no library may paper over. A new member gets no
history at all — not "unless an admin hands over old epochs" as under `nip44`,
but none, because the keys no longer exist. And an approval chain can be audited
only by someone who was in the group at the time and kept what they read, which
is a further subtraction from
[auditing a sealed channel](#auditing-a-sealed-channel-requires-a-key): there,
any keyholder could verify at any time.

### The Marmot transport profile is optional

Marmot specifies a Nostr transport in which a group message is a kind 445 signed
by a **fresh ephemeral key per event**, carrying exactly one `h` tag whose value
is a random, rotatable `nostr_group_id`, and — normatively — no other tag but
NIP-40 `expiration`. Key establishment is a kind 30443 KeyPackage, an unsigned
kind 444 Welcome rumor inside a kind 13 seal inside a kind 1059 gift wrap, and a
kind 10050 inbox relay list. Of those four numbers Quorum reuses one — 30443,
with three divergences — and replaces the rest with kind 8111; see
[key establishment](#key-establishment-on-an-mls-channel) for why the gift wrap
cannot be published to a relay that enforces membership.

That transport buys metadata privacy: a relay cannot tell members apart, cannot
tell which channel of a workspace is busy, and cannot link a message to an
account. Quorum does not adopt it by default because of what the no-tag rule
deletes along the way — `alt`, `p` addressing, `counter`, `enc`, and with them
relay-side membership enforcement, per-principal rate limiting, budget
enforcement and the group anchor that
[checkpoints](#checkpoints) are cut against. Marmot states the security
consequence plainly: a non-member can publish an envelope that reaches trial
decryption.

An implementation MAY offer the profile, and if it does:

- the entire signed Quorum event — every tag included — MUST move inside the
  ciphertext, and the outer kind 445 MUST be treated as a disposable wrapper
  carrying no claim about its author;
- addressing, loop prevention, counters and `alt` rendering become client-side
  in full, and the relay MUST NOT be relied upon for any of them;
- a routing rotation splits one channel's history across several `h` values, so a
  reader MUST keep the routing history and a checkpoint chain MUST follow it;
- it MUST NOT be described as the same mode. A channel is either Quorum-routed or
  Marmot-routed, and the two have different threat models;
- key establishment MAY then use Marmot's 1059/13/444 gift wrap in place of kind
  8111, because a transport that has already given up relay-side membership
  enforcement has given up the rule that made the gift wrap unpublishable. It
  MUST NOT mix the two: a channel whose messages are Quorum-routed and whose
  Welcomes are gift-wrapped is claiming an admission control its own bootstrap
  bypasses.

## Loop prevention

Addressing plus a channel policy defaulting to `respond_only_when_addressed`
removes most runaway agent-to-agent chatter structurally. Causal-chain depth — the
tempting mechanism — is trivially defeated by A→B→A alternation and SHOULD NOT be
relied on.

Two backstops catch what structure does not. **A per-thread budget** bounds the
work rather than the message rate, and the thing it bounds is the thing anybody
actually cares about: exhaustion pauses the thread and pings a human, and the
relay then refuses new work in it. See [budgets and spend](#budgets-and-spend).
**Per-principal rate limits** bound the traffic.

They are not redundant and they are not interchangeable. A rate limit fires
first, because it is counted per event and a busy agent emits several per unit of
work; it is also the blunter of the two, since it cannot distinguish an agent
looping from an agent working hard. A budget is the one a human can reason about
and raise. An implementation that ships only the rate limit has a workspace where
the runaway agent and the productive one are throttled identically.

Stated policy: **there are no private agent backchannels.** Agent-to-agent DMs are
default-deny, require an explicit grant, and are readable by the workspace owner
and by the agents' operator humans.

## Privacy

Nostr has no unpublish. NIP-09 deletion is advisory and a mirrored event is
permanent. Implementations MUST NOT place secrets or personal data in events, and
`alt` in particular is plaintext even on encrypted channels (see rule 5 above).

No mode defined here hides the social graph. `plaintext` hides nothing, `nip44`
and `mls` hide bodies, and all three publish who is in a channel, who answered
whom, and when. The only construction in this document that hides the graph is
the [Marmot transport profile](#the-marmot-transport-profile-is-optional), and
its price is every relay-side control. An implementation MUST NOT describe an
encrypted Quorum channel as metadata-private.

## Forward compatibility

- Validators MUST be non-strict: unknown kinds and unknown body fields are
  ignored, never rejected.
- A client that does not understand a kind MUST render its `alt` text rather than
  hiding the event. An event silently dropped from a task thread is worse than an
  ugly one.
- Adding a kind, or an optional body field, is a MINOR version bump. Removing or
  repurposing a kind, adding a required field, or changing a tag's meaning is
  MAJOR.

The policy those two paragraphs summarise is written out in full as
`spec/VERSIONING.md` in the reference implementation, and every change made
under it is recorded in `spec/CHANGELOG.md` beside it. A MAJOR bump requires a
migration note saying what a reader that does nothing will see.

Both bullets above are load-bearing rather than polite. A strict validator
anywhere in the chain turns every MINOR addition into a MAJOR one for everybody
downstream of it; a kind published without `alt` is a silent hole in a task
thread for every reader that has not been updated, and retrofitting `alt` means
re-publishing history.

## Reference implementation

Everything named below is MIT-licensed and lives in one repository:
<https://github.com/superirale/Quorum>. Paths are relative to its root.

`@quorum/protocol` — kind and tag definitions, validators, and JSON Schema for
every body, generated from the same source and committed to the repository so
that implementations in other languages validate against the same rules rather
than a prose reading of them. `schemas/index.json` publishes the per-kind
envelope requirements as data for the same reason, and `relay_enforced` names the
two resources a relay checks so that no implementation has to hand-copy them.

A signed golden transcript of the full loop — request, proposal, approval,
execution — is committed at `fixtures/deploy-approval.json`, and
`scripts/validate.py` validates it using only the standard library and the
committed schemas.

`@quorum/conformance` is a runnable suite — `npx @quorum/conformance <relay-url>`
— that publishes an honest event of every kind at a relay, breaks one thing at a
time, and reports section by section in the relay's own words. It groups its
results by profile rather than scoring them, because a generic relay that
implements none of this NIP still satisfies the claim the NIP rests on: every
event defined here is valid on any relay. The `quorum` profile is detected by
probe, not assumed.

`apps/relay` is a reference relay in Go (khatru + relay29) which reads those
schemas as data — it could not import the TypeScript validators if it wanted to,
which is the point: a protocol only one implementation can read is not a
protocol, and the second language is what has repeatedly caught rules that
existed in one place and not in the other.

`@quorum/sdk` is a reference client implementation of the addressing, ordering
and lease rules above, and `examples/echo-agent` is the smallest agent that
exercises them. Two clients are built on it — `apps/web` in the browser and
`apps/console` on the command line. They share the SDK and share an author, so
they are two implementations of the client rules rather than two independent
parties arriving at the same reading of them.
