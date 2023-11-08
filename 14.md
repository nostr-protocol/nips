NIP-14
======

Subject tag in Text events
--------------------------

`draft` `optional` `author:unclebobmartin`

This NIP defines the use of the "subject" tag in text (kind: 1) events.  
(implemented in more-speech)

`["subject": <string>]`

Browsers often display threaded lists of messages.  The contents of the subject tag can be used in such lists, instead of the more ad hoc approach of using the first few words of the message.  This is very similar to the way email browsers display lists of incoming emails by subject rather than by contents.

When replying to a message with a subject, clients SHOULD replicate the subject tag.  Clients MAY adorn the subject to denote
that it is a reply.  e.g. by prepending "Re:".  

Subjects should generally be shorter than 80 chars.  Long subjects will likely be trimmed by clients.
