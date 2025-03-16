NIP-XXB
=======

Simple To-do flow
-----------------

`draft` `optional`

This NIP defines a simple workflow for task management, using [NIP-XXA](XXA.md) as a base and requirement.

This NIP is meant to model a very simple task workflow. Possible use cases include:
- Individual to-do-list-style applications (Similar to Apple Reminders, Google Keep, etc)
- Group to-do-list-style applications (Similar to Apple Reminders shared lists)
- Systems that need to model to-do items to be completed by multiple people (e.g. an educational course that requires students to complete the same tasks, some onboarding system that requires new several people to complete the same tasks, etc)
- Any other system that needs to model simple to-do items (although some may need to extend this NIP to support other features)

### Workflow

In this workflow, [tasks](XXA.md) have only two states: OPEN/TODO and COMPLETE/DONE.

To update a task state, users signal updates using the task update event defined below.

The exact interpretation of which task update events are valid (e.g. to compute a final global state for each task) is left to the implementation of specific clients and relays, or to other NIPs.

### Task Update Event format

A task update event is a **regular** ([NIP-01](01.md)) event of `kind:1500` that signals a change in the status of a task.

The `.content` of these events MUST be one of two values:
- `"TODO"` to signal that the task is now open/pending/to-do.
- `"DONE"` to signal that the task is now closed/complete/done.

The list of required tags are as follows:
- `a` _(required)_: Coordinates to the kind `35000` task being updated.

Any other tags are strictly optional, and this NIP does not attach any specific meaning to them.

```jsonc
{
  "id": <32-bytes lowercase hex-encoded SHA-256 of the the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <Unix timestamp in seconds>,
  "kind": 1500,
  "content": <"TODO"/"DONE">,
  "tags": [
    ["a", "<kind integer>:<32-bytes lowercase hex of a pubkey>:<d tag value>", <recommended relay URL, optional>] // Coordinates to the task being updated
    (...) // Any other tags are optional
  ]
}
```

### Other notes

1. Consensus on the global state of tasks is left to the implementation of specific clients and relays, or to other NIPs. This is done on purpose to allow for flexibility in the implementation of each use case.
2. The task update event format is a regular event (not replaceable or addressable) because — as mentioned above — the final state of whether a user has completed the task or not is not necessarily the most recent event.
  - As an example, consider the example of some educational platform that assigns a task to a student, and no longer considers task updates after a due date. In this case, the final state of the task is not the most recent event, but the last one that was created before the due date.
  - Another reason is that clients may want to display the task update events in a timeline, so having older events may be useful to understand the history of the task.
