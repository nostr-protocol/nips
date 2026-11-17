# NIP-52R

## Recurring Calendar Events (Addendum to NIP-52)

`draft` `optional`

This NIP proposes extending [NIP-52](https://github.com/nostr-protocol/nips/blob/master/52.md) to support recurring (repeating) calendar events via [iCalendar RRULE](https://www.rfc-editor.org/rfc/rfc5545#section-3.8.5.3) strings attached using the [NIP-32](https://github.com/nostr-protocol/nips/blob/master/32.md) label convention.

NIP-52 explicitly deferred recurring events as a future concern. This document proposes a minimal, backward-compatible mechanism that allows clients to express recurrence without inventing a new tag vocabulary.

---

## Motivation

Recurring events — weekly standups, monthly reviews, annual birthdays, daily journaling reminders — are a fundamental part of how people use calendars. The iCalendar RRULE format (RFC 5545) is a widely understood, well-tested standard for expressing recurrence. Rather than designing a bespoke Nostr recurrence grammar, this NIP reuses RRULE directly.

---

## Approach: RRULE via NIP-32 Labels

Recurrence is expressed by adding two tags to an existing kind `31923` (time-based) or kind `31922` (date-based) calendar event:

```
["L", "rrule"]
["l", "<RRULE string>"]
```

- `["L", "rrule"]` declares the `rrule` label namespace (per NIP-32)
- `["l", "<RRULE string>"]` carries the RRULE value as the label

This is purely additive. Clients that do not understand these tags treat the event as a single non-recurring occurrence starting at `start`. Clients that understand RRULE expand the event into its occurrence set.

---

## Tag Specification

### New optional tags (for kind `31922` and kind `31923`)

| Tag | Value | Description |
|-----|-------|-------------|
| `L` | `"rrule"` | Declares the RRULE label namespace |
| `l` | `"<RRULE string>"` | The recurrence rule; must follow RFC 5545 RRULE syntax |

Both tags MUST appear together. An `L` tag with value `"rrule"` without a following `l` tag is invalid.

### RRULE Syntax

The value of the `l` tag is a bare RRULE property value per RFC 5545, **without** the `RRULE:` prefix and **without** a `DTSTART` component (the event's `start` tag serves as DTSTART).

Examples of valid values:

| Value | Meaning |
|-------|---------|
| `FREQ=DAILY` | Every day |
| `FREQ=WEEKLY` | Every week on the same weekday as `start` |
| `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` | Every weekday (Mon–Fri) |
| `FREQ=MONTHLY` | Same day of the month, every month |
| `FREQ=MONTHLY;INTERVAL=3` | Every 3 months (quarterly) |
| `FREQ=YEARLY` | Same date each year |
| `FREQ=WEEKLY;COUNT=10` | Every week, 10 times total |
| `FREQ=DAILY;UNTIL=20260101T000000Z` | Every day until 1 Jan 2026 |

Supported RRULE properties: `FREQ`, `INTERVAL`, `BYDAY`, `COUNT`, `UNTIL`.

Clients SHOULD ignore (not fail on) unsupported RRULE properties for forward compatibility.

### DTSTART

The DTSTART used for RRULE expansion is the event's `start` tag value:
- For kind `31923`: `start` is a Unix timestamp in seconds; convert to a UTC datetime for RRULE computation
- For kind `31922`: `start` is an ISO 8601 date (YYYY-MM-DD); treat as a date-only DTSTART

### Event Duration

Duration is derived from `end - start`. Each occurrence has the same duration as the original event. If `end` is absent, duration is zero (instantaneous occurrence).

---

## Changes to the `D` Tag for Recurring Events

The existing NIP-52 spec requires a `D` (day index) tag for kind `31923`:

> `D` (required) the day-granularity unix timestamp on which the event takes place, calculated as `floor(unix_seconds() / seconds_in_one_day)`. Multiple tags SHOULD be included to cover the event's timeframe.

For recurring events, enumerating every future occurrence as `D` tags is impractical (an infinite series has infinitely many). This NIP proposes the following revision:

**For recurring events (`L`/`l` tags present):**

- `D` tags are **optional** but SHOULD cover the next N upcoming occurrences from the time of publication (recommended: 52 occurrences, or 2 years of occurrences — whichever is smaller)
- Clients MUST NOT rely solely on `D` tag filtering to discover recurring events; they should fetch by `d` tag or author and evaluate RRULE client-side
- Including a reasonable window of `D` tags allows relay-side filtering to surface events that are "active now" without requiring clients to fetch all events and compute occurrences locally

**For non-recurring events (no `L`/`l` tags):**

- `D` tag behavior is unchanged from NIP-52

---

## Full Example: Kind `31923` with Recurrence

A weekly team sync recurring every Monday:

```json
{
  "kind": 31923,
  "pubkey": "ab12cd34ef56...",
  "created_at": 1700000000,
  "content": "Weekly team alignment meeting",
  "tags": [
    ["d", "team-sync-weekly"],
    ["title", "Team Sync"],
    ["start", "1700650800"],
    ["end", "1700654400"],
    ["start_tzid", "America/New_York"],
    ["end_tzid", "America/New_York"],
    ["L", "rrule"],
    ["l", "FREQ=WEEKLY;BYDAY=MO"],
    ["D", "19680"],
    ["D", "19687"],
    ["D", "19694"],
    ["location", "https://meet.example.com/team-sync"],
    ["p", "ab12cd34ef56...", "", "organizer"],
    ["p", "12ab34cd56ef...", "", "attendee"]
  ]
}
```

(The `D` values cover the next several Monday occurrences from the publication date.)

A yearly birthday reminder with no end:

```json
{
  "kind": 31922,
  "pubkey": "ab12cd34ef56...",
  "created_at": 1700000000,
  "content": "Alice's birthday",
  "tags": [
    ["d", "alice-birthday"],
    ["title", "Alice's Birthday"],
    ["start", "1990-04-15"],
    ["L", "rrule"],
    ["l", "FREQ=YEARLY"]
  ]
}
```

A daily standup limited to 10 occurrences:

```json
{
  "kind": 31923,
  "pubkey": "ab12cd34ef56...",
  "created_at": 1700000000,
  "content": "Morning standup",
  "tags": [
    ["d", "standup-sprint-42"],
    ["title", "Sprint 42 Standup"],
    ["start", "1700650800"],
    ["end", "1700652600"],
    ["L", "rrule"],
    ["l", "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;COUNT=10"]
  ]
}
```

---

## Client Rendering

### Computing Occurrences

1. Parse the `start` tag as DTSTART
2. Read the RRULE from the `l` tag
3. Use an RFC 5545 RRULE library (e.g. `rrule.js`) to expand occurrences
4. Each occurrence shares the same duration as the original event (`end - start`)
5. When rendering a calendar view, find occurrences that fall within the visible date range

Pseudocode:

```
dtstart = parse(event.start)          // Unix seconds → Date
rruleStr = event.tags["l"]            // bare RRULE string
rule = RRule.fromString(
  "DTSTART:" + formatISO(dtstart) + "\n" +
  "RRULE:" + rruleStr
)
duration = event.end - event.start    // in seconds
occurrences = rule.between(viewStart, viewEnd)
render(occurrences.map(occ => { begin: occ, end: occ + duration }))
```

### Fetching Recurring Events

Because recurring events may have started long before the current view window, clients MUST NOT filter recurring events by `start` time alone. Specifically:

- A weekly event started 2 years ago will have `start` = 2 years ago, but its next occurrence may be tomorrow
- Clients should fetch events by `author` + `d` tag and evaluate RRULE client-side, or maintain a local cache of known recurring events

Recommended fetch strategy:

1. Fetch all events for a user with a broad or no time-range filter
2. Identify events with `L = "rrule"` tags
3. Expand their occurrences into the current view window
4. For known-recurring events already in cache, always re-evaluate against the current view window on load

### Deduplication with RSVP

RSVPs (kind `31925`) reference a specific revision of a calendar event via its `a` tag and optional `e` tag. For recurring events, a single RSVP SHOULD be interpreted as applying to all future occurrences unless the RSVP's `e` tag pins it to a specific event revision. Clients MAY choose to allow per-occurrence RSVP by creating a separate RSVP event per occurrence.

---

## Modifying or Deleting Individual Occurrences

NIP-52R does not define a mechanism for modifying individual occurrences of a recurring series (iCalendar calls these "exception dates" via `EXDATE` and override events via `RECURRENCE-ID`). This complexity is left to a future NIP extension.

For now, the recommended approach for clients that need to cancel a single occurrence is to publish a new non-recurring event at the specific time, note in its description that it replaces the occurrence, and optionally notify participants via DM or gift wrap.

---

## Backward Compatibility

- Clients that do not support RRULE will render the event as a single occurrence at `start`/`end` — exactly as any other NIP-52 event
- The `L`/`l` tags are invisible to non-NIP-32-aware clients
- No new event kinds are required; existing kinds `31922` and `31923` are reused
- No changes to the RSVP kind `31925` are required

---

## Summary of Changes to NIP-52

| Section | Change |
|---------|--------|
| Common tags | Add `L` (label namespace, optional) and `l` (label value, optional) |
| Time-based event (kind 31923) | `D` tag is optional when `L = "rrule"` is present |
| Date-based event (kind 31922) | `L`/`l` tags may express recurrence for annual/monthly date-based events |
| Intentionally Unsupported section | Remove "Recurring Calendar Events" from unsupported list |
| New section: Recurring Calendar Events | Document RRULE via NIP-32 labels as described above |

---

## Relationship to NIP-32

[NIP-32](https://github.com/nostr-protocol/nips/blob/master/32.md) defines a generic label mechanism using `L` (namespace) and `l` (label value) tags. This NIP registers `"rrule"` as a label namespace for calendar events. The convention is:

- `["L", "rrule"]` — declares this event has an RRULE label
- `["l", "<value>", "rrule"]` — NIP-32 full form (the third element is the namespace)

Both forms are acceptable. The two-tag form (without the namespace repeated in `l`) is preferred for brevity in calendar events since the adjacent `L` tag makes the namespace unambiguous.

---

## Reference Implementation

A working implementation exists at [formstr-hq/nostr-calendar](https://github.com/formstr-hq/nostr-calendar) (live at [calendar.formstr.app](https://calendar.formstr.app)).

Relevant source files:
- `src/utils/repeatingEventsHelper.ts` — RRULE parsing, occurrence expansion, `buildRecurrenceRule` / `parseRecurrenceRule`
- `src/common/calendarEngine.ts` — per-day occurrence rendering via `getEventSegmentForDay`
- `src/utils/parser.ts` — `nostrEventToCalendar` RRULE tag parsing (`L`/`l` case)
- `src/common/nostr.ts` — `preparePrivateCalendarEvent` shows RRULE tag emission pattern
