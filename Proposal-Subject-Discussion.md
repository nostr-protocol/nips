NIP-??
======

I am implementing this as a trial in more-speech.  

Subject and Discussion tags in Text events.
-------------------------------------------

`draft` `optional` `author:unclebobmartin`

This HIP defines the use of the Subject and Discussion tags in text (kind: 0) events.

Subject
-------

`["Subject": <string>]`

Browsers often display threaded lists of messages.  The contents of the subject tag can be used in such lists, instead of the more ad hoc approach of using the first few words of the message.  This is very similar to the way email browsers display lists of incoming emails by subject rather than by contents.

When replying to a message with a subject, clients should replicate the subject tag.

Subjects should generally be short.

Discussion
----------

`["Discussion": <string>]`
	
Sometimes users want to send messages to a general audience based on a discussion topic.  Other users would like to read all messages in a discussion topic without having to specifically follow the authors.  Text messages with Discussion tags allow clients to present those messsages that match the discussion.

Thoughts?


