#NIP-??


##Qualified Tags.

`draft` `mandatory(7/1/22)` `author:unclebobmartin`

###Abstract
In order to resolve the ambiguities that have arisen based upon the ad-hoc rules that have been used to identify replies, I propose that we add an optional qualifier to tags in general.  In the case of replies these qualifiers would look like this:

`[["e[reply]" <reply-id>] ["e[root]" <root-id>]]`

Such qualifiers ought to create the flexibility we will need as new use cases present themselves.

###Justification
Replying to an event is a use-case that is separate from the kind of citing that the unqualified "e" tag is meant for.  The attempt to use "e" tags to handle replies has led several clients to impose an ad-hoc ordering to the "e" tags.  That ordering was eventually described in NIP-10.  It describes these three cases:

 1. `[["e" <reply-id>]]`
 2. `[["e" <reply-id>] ["e" <root-id>]]`
 3. `[["e" <reply-id>] ["e" <mention-id>]... ["e" <root-id>]]`

Where:

 * `reply-id` is the id of the event being replied to.
 * `root-id` is the id of the event at the root of the thread of replies.

Unfortunately these orderings create ambiguities.

For example, consider an event with this tag: `[["e" <event-id>]]`

Is this event a reply to `event-id`, or is it merely mentioning `event-id`? 

To answer this question, some clients (e.g. damus) have resorted to an undocumented and ad-hoc _parsing_ rule.  These clients parse the content of the event, looking for the replacement tags defined in NIP-08.  (e.g. `#[n]`, where `n` is the ordinal position of the tag in the `tags` array.  More on that later.)  The client determimes which "e" tags hold the `<reply-id>` and the `<root-id>` by eliminating all "e" tags that have replacement tokens in the content.  The remaining "e" tags must be the `<reply-id>` and `<root-id>`; and they are identified by their order in the tags array.

Unfortunately, if the `<reply-id>` and `<root-id>` are to be properly identified, this solution _forces_ the use of replacement tokens in the content.  This, it seems to me is an unreasonable constraint that all clients would have to conform to.  It is unreasonable because it will likely be common for the author of an event to include footnotes in "e" tags without referencing them with replacement tokens in the content.  These unreferenced mentions lead to ambiguities.

###Ambiguities

 * An event with an unreferenced footnote would use the tag `[["e" <footnote-id>]]`. Clients that used NIP-10, and the ad-hoc _parsing_ rule would consider this to be a reply, and would therefore thread it below an event that is merely a footnote.  Users will consider this to be _odd_.  

 * An event with two unreferenced footnotes would use the tags `[["e" <footnote-id-1>] ["e" <footnote-id-2]]`.  Again clients that conformed to NIP-10 and the ad-hoc _parsing_ rule would consider this event to be a reply to `footnote-id-1` AND would assume that `footnote-id-2` was the root of the reply thread -- which is almost certainly is not!  Who knows what kinds of data corruption and crashes would ensue from there?
 
 * Recently we have been considering _discussion_ threads.  It has been proposed that discussion threads can be implemented simply by following the `id` of the event at the root of the discussion.  I believe this is a good plan.  However, consider what happens if an event cites the discussion as an unreferenced mention.  Clients that follow NIP-10 and the ad-hoc _parsing_ rule would consider such messages to be replies, and would thread them into the discussion.  Thus the discussion thread would become littered with "Hay, look at this cool discussion." events.
 
###Warnings.

The ambiguities and ad-hoc rules mentioned above ought to serve as a warning.  

  1. New use cases are going to depend upon tags.  Tags need more flexibility in order to respond to those use cases.
  2. The ambiguities created by NIP-10 suggest that, as a general rule, the position of tags within the tags array should carry no meaning.  
 
###Proposal.

To resolve these ambiguities and address these warnings, I recommend that we add an optional qualifier to tags.  The qualifier would be a simple string enclosed in square brackets:  `"tag-name[qualifier]"` 

Using this we can resolve the NIP-10 ambiguities with:

`[["e[reply]" <reply-id>] ["e[root]" <root-id>]]`

This eliminates the need for NIP-10, and also eliminates the need for the ad-hoc _parsing_ rule.  The need for the `<reply-id>` is obvious.  The `<root-id>` is necessary because clients may not posess the event that is at the root of the thread.  

The positional ordering of NIP-08 replacement tokens could be resolved with:

`["e[fun-event]" <fun-event-id>]` and the content reference: `#[fun-event]`.

###Implementation plan

Because there are clients currently following NIP-10 and the ad-hoc _parsing_ rule, we need a way to gently transition toward the tag qualifier solution. (if adopted.)

I propose that clients that have implemented NIP-10 (and possibly also the ad-hoc _parsing_ rule) continue to adhere to them, while ALSO adding _additional_ qualified "e" tags.  Thus:

`[["e" <reply-id>] ["e" <root-id>] ["e[reply]" <reply-id>] ["e[root]" <root-id>]]`

New clients should NOT implement NIP-10 and should start using qualified tags immediately.  

I propose that we depracate NIP-10 with a cutoff date of July 1, 2022, after which NIP-10 would no longer be valid and all clients must use qualified tags for replies.  

It is my hope that the community is small enough, at this point in time, to tolerate this change without undue pain.


