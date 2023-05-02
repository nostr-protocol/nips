
# NIP-XXXX: Nostr Data Sharing URI Scheme

**Author**: Christian Moss  
**Status**: Draft  
**Type**: Standards Track  
**Created**: 2023-05-02

## Abstract

This NIP proposes a new URI scheme for apps to share data, such as text or images, between Nostr clients.

## Motivation

It is commonplace in apps, such as games or photo libraries, to share one's achievements and moments on social network platforms like Twitter or Facebook in order to receive recognition and/or interaction from a community. Given the culture of "zapping" and gifting sats in Nostr, it would make sense to create a protocol that allows users to frictionlessly share an image and/or text with a Nostr client. For example, a user could achieve a high score on a mobile game, click a button in the game, which would then open up the user's Nostr client on their mobile device, allowing them to post a screenshot and caption of their achievement. Other players could then zap the user sats in recognition of this achievement.

## Specification

The proposed URI scheme format is as follows:

``nostr-share://?parameter=value&parameter2=value2``

The parameters supported in this URI scheme include: 1. `msg`: A string  of the message to be shared. 2. `img`: A URL to an image hosted elsewhere (URL encoded) or an image represented as a Base64 encoded string. ### Usage To share a text message, the URI would look like this:

``nostr-share://?msg=Hello%20World``

To share an image  (in Base64 format), the URI would look like this:

``nostr-share://?img=data:image/png;base64,iVBORw0KG...``
or
``nostr-share://?msg=Hello%20World&img=https%3A%2F%2Fi.imgur.com%2FaI24Z3F.jpeg``

To share both, it would look like this:

``nostr-share://?msg=Hello%20World&img=data:image/png;base64,iVBORw0KG...``
or
``nostr-share://?msg=Hello%20World&img=https%3A%2F%2Fi.imgur.com%2FaI24Z3F.jpeg``


Applications that support this URI scheme should be able to parse the `msg` parameter and display the data accordingly. For text, the application should display the message as plain text, and for binary data, the application should decode the Base64 string and display the appropriate content.

Clients implementing this NIP should register the `nostr-share` URI scheme with the operating system, enabling other applications to share data directly with the client.

## Copyright

This NIP is licensed under the Creative Commons Attribution 4.0 International License.
