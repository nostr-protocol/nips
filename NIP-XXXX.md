# NIP-XXXX: Nostr Data Sharing URI Scheme

**Author**: Christian Moss
**Status**: Draft
**Type**: Standards Track
**Created**: 2023-05-02

## Abstract
This NIP proposes a new URI scheme for apps to share data, such as text or images, between Nostr clients.

## Motivation
It is commonplace in apps, such as games or photo libraries, to share one's achievements and moments on social network platforms like Twitter or Facebook to receive recognition and/or interaction from a community. Given the culture of "zapping" and gifting sats in Nostr, it would make sense to create a protocol that allows users to share an image and/or text with a Nostr client frictionlessly. For example, a user could achieve a high score on a mobile game, click a button in the game, which would then open up the user's Nostr client on their mobile device, allowing them to post a screenshot and caption of their achievement. Other players could then zap the user sats in recognition of this achievement.

## Specification
It was previously proposed to use a URI scheme such as
``nostr-share://?parameter=value&parameter2=value2``

Where parameter1 and parameter2 would be something like img, msg, etc., denoting the type of media to be shared.

However, after feedback, it was considered a better approach to keep it more generic and include a single JSON blob as the main parameter in line with Nostr notes.

An additional "hint" parameter would also be added to allow the recommendation for a particular relay.

Resulting in

``nostr-share://?msg={urlEscapedJSON}&hint={urlEscapedRelayUrl}``

The JSON by default should include at least the following parameters:

``text`` contains a message to be displayed analogous to a tweet or post.
``imageUrl`` contains an image URL to be loaded by the receiving Nostr client.
``videoUrl`` contains a video URL to be loaded by the receiving Nostr client.
``imageBase64`` contains an image encoded as a base64 string to be displayed by the receiving Nostr client.

  

In order to contain more images and messages, the JSON could be expanded to contain ``text2``  ``imageUrl2``

Example JSON:
``{
"text": "What sounds does an ostrich make?",
"imgUrl": "https://pbs.twimg.com/profile_images/1604195803748306944/LxHDoJ7P_400x400.jpg",
"videoUrl": "https://i.imgur.com/WC7LW4t.mp4",
"imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAbElEQVQYGWOc6nznPwMOkLVHmWGay12wLBMONWBhmCIQhwVF4T9Ghqx9SihCMMUIE//jVgTSiVDI+B/uHhQjoRwUq5n/s+JUjDARqPMv429shoHF4CaCggIbwPQMFlVz3J7AReEmwnTCZdAYAGPIHXIm/AOjAAAAAElFTkSuQmCC"
}``

Example encoded URI:
``nostr-share://?msg=%7B%22text%22%3A%22What+sounds+does+an+ostrich+make%3F%22%2C%22imgUrl%22%3A%22https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1604195803748306944%2FLxHDoJ7P_400x400.jpg%22%2C%22videoUrl%22%3A%22https%3A%2F%2Fi.imgur.com%2FWC7LW4t.mp4%22%2C%22imageBase64%22%3A%22%22%7D&hint=wss%3A%2F%2Fnostr.zebedee.cloud``
 
Clients implementing this NIP should register the `nostr-share` URI scheme with the operating system, enabling other applications to share data directly with the client.

## Example Implementation  

I have developed a sample integration in the form of 2 android apps.

The first app is an example game that generates the nostr-share URI containing a message, imageUrl, base64 encoded image, a video URL, as well as a route hint.

https://github.com/mandelmonkey/nostr-share-sample-game

<img src="https://i.imgur.com/ym6azwT.jpg" width="200">

The second app is an Android app which receives the nostr-share data and displays the media.
 
<img src="https://i.imgur.com/qmFYUmz.jpg" width="200">

<img src="https://i.imgur.com/MCItlcV.jpg" width="200">

https://github.com/mandelmonkey/nostr-share-wallet-demo

## Cavaets

In practice as long as any base64image is small or replaced with an image url this is not a major limitation

## Copyright

This NIP is licensed under the Creative Commons Attribution 4.0 International License.