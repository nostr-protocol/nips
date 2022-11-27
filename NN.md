
NIP-NN
======

Filter by Time Seen
-------------------

`draft` `optional` `author:mikedilger`

This NIP extends NIP-01 `<filters>` definition to add two additional optional fields:

````json
{
  "seen_since": <a timestamp, events must have been received by this relay at or later than this to pass>
  "seen_until": <a timestamp, events must have been received by this relay before this to pass>
}
````

While the `since` and `until` filters operate on the `event.created_at` timestamp, these operate on the timestamp given to the events when they arrived at the filter.

## Motivation

Clients do not typically ask relays for all events throughout history, they typically ask for events after some time, which they presume they already have all the events before that time.

However, events can arrive at relays out of time order. And they might arrive quite late as well. If a client asks for events after the last time they asked (or the last event they received), they may miss events which were dated earlier but arrived at the relay later.

For clients to be sure they aren't missing any events, they can use the new filter `seen_since` to pick up events that might have been dated earlier, but which the relay didn't have and didn't send to them last time the client connected.
