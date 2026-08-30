
NIP-XX
======

External Computation Off Relays
-------------------------------

For many social applications, implementation requires the execution of a state machine. For example, a group messaging application requires the handling of invites, bans, permission levels, and invite links. Each of these changes depend on the current state of group membership to be possible and will in themselves change the state of the group membership.

Nostr is a transport layer, not a computer. It is built to transmit notes and other stuff using relays. It doesn’t make sense to try to build a distributed computer like Etherium, or to try to specify a special-purpose state machine like in NIP-29. Instead, we can entrust computation to an external computer identified by its keys and wait for the results of the computation to be published to relays. A relay itself can optionally act as a computer, giving a system similar to NIP-29.

A Computer can be used to add interactive functionality to existing nips

- nip-72: A computer can manage the `kind:34550`, giving a way to edit the community outside of just a single private key.  The computer can also automate the approval of posts with `kind:4550` as timeline state.
- #875 : The computer can validate the claim tag tag and automatically grant membership.
- others TBD

## Spec

A computer is simply a Nostr client that consumes and publishes specific event kinds. A computer MUST publish a `kind:10002` event and `kind:10400` event.

The computer should not have hidden state that is not reflected in a state event, although the computer may use cryptography to protect any secrets in the state.

### Kind 10400: Computer

```json
{
  ...
  "kind": 10400,
  "description": "Description of the purpose of this computer",
  "nips": "The NIPs that this computer purports to implement",
  "input_kinds": [],
  "output_kinds": []
}
```

### Kind 400: Computation Log (optional)

A log of all computation requests that affected the state. Computations that only affect the timeline state should not be present here. Some computation requests attempt to modify the state but don’t succeed in causing a state transition. Those computation requests should be included in the computation log.

```json
{
  "e": "the computation request that was computed"
}
```

### Kind 3XXXX: State

A parameterized replaceable event that indicates the current state of the computer. Each computer can have multiple state machines, each with a different `d` tag.

There is a JSON inside the content which is the state.

- **d**: The tag identifying this state machine computed by the computer.
- **e**: The computation request that resulted in the current state.

### Kind XXXX: Timeline State

For any result of computation where the client needs to paginate or seek by time using until or before filters, the result will be stored in a timeline output. The computer can and will backdate events in this timeline.

- **a**: The state associated with this timeline event.
- **e**: The computation request that is associated with this timeline event.

### Kind XXXX: Computation Request

Any user may request computation from the computer for a specific virtual machine.

- **a**: The `3XXXX` event of the state to perform computation on.
- **e**: Optionally, the event id of the previous state, in order to prevent race conditions. If another computation happened before submitting this event.

## Comparison to NIP-29

TBD

## More Background

Nostr has operated so far without computation largely because of the lack of interaction between notes. Users want to see the sets of notes that they’re interested in, and taking a subset of events while excluding others has no major ill effects. Those notes are simply not shown, and other notes are not affected. When computation is required, though, this model breaks down with a sort of butterfly effect. Group members may invite other group members, and those may invite even more members. If this chain is broken due to a missing event, different peoples’ views of the situation can diverge wildly as branches of the invite tree are chopped off.

One common solution for this problem is by using Dapps. Thousands or millions of miners operate in lockstep using a consensus algorithm to run a virtual machine. But in order to establish consensus without trust, these systems require a costly proof-of-work or proof-of-stake to punish defectors.

NIP-29 takes one approach to this problem, by specifying a state machine that is to be run on a centralized relay per group. The group’s relay will execute the computation and emit events noting the group state. Matrix, a competing messaging protocol, specifies a state machine to be run in parallel on all servers, though it lacks a reliable consensus mechanism.
