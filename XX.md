 NIP-X
 =====

 Bare Signatures
 ------

 Under certain circumstances you may wish to sign content that isn't a well formed nostr message. Perhaps something like:

 ```
 jack  @jack
 We reject: kings, presidents, and voting.
 We believe in: rough consensus and running code.

 —David Clark, 1992

 3:31 PM · Sep 11, 2024 · 661.6K Views [https://x.com/jack/status/1833951636005552366]
 ```

If this was posted to Nostr it would be trivial to verify whether it was signed using the expected private key. If was not, we have to evaluate how likely it is to be true. How was it was published? Does it sound like something the author would say? Was it said at a time the author would have said it? Has it remained unchanged since it was published? If the platform were sold, do we trust the new ownership? If it closed, do we have recordings of it that we trust? Without a cryptographic signature, the truth is mostly conjecture.

## What's In a Signature?

In nostr messages are signed by collecting pertinent details, arranging them in a rigid manner, taking a hash, and signing the hash. For the above, the input might look like:

```json
{
    "pubkey": "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2",
    "created_at": 1726083060001,
    "kind": 1,
    "tags": [],
    "content": "We reject: kings, presidents, and voting.\nWe believe in: rough consensus and running code.\n\n—David Clark, 1992"
}
```

Wait a second, where did all of that come from? Well, the author has included an npub on their profile page, so that's a good place to start. Then, the event does have a relatively narrow timestamp, down to the minute. Most of these types of messages are "kind":1 on nostr, and we'll just assume that there aren't any fancy tags.

Having roughly constructed a plausible event, we can now generate an `id` for it, and finally check that the signature is valid. Except: we don't have the signature, and we kind-of just made up the timestamp. If we actually had a signature the timestamp would be kind of easy: just try all of them for the expected time period – it's really fast. So now all we need is the signature.

An event signature is pretty long. Here's an example:

```
3046022100dc07c1e346d41605a555688e65fb08496e657ebf23421045f65413703e37259c0221009045ebd40430ad2a7aaa73ae20b350a0113b3cda6446887e6ded7e5e6af2929a
```

Given message length constraints on certain systems, including 144 meaningless characters is really going to cramp your style. What IS the limit on those other systems, though? Is it really 180 characters? Well, it depends on how many bytes you think a character is.

## Base8196

The limit is actually 180 things-that-look-like-characters, which happens to include Hangul syllables. The unicode standard includes a commonly implemented (block)[https://en.wikipedia.org/wiki/Hangul_Syllables] for these, giving us easily pasteable access to 11,172 characters per character. That's even more than we need, so we can throw out some of the more archaic glyphs and still have plenty for 13 bits per character. With this encoding the above signature is now 45 characters:

```
됀쯾쇼빠삷촙쨶쥕잚죔떔홈숎탟믟햗뛲굟퀶궋겚빩봢껍값굟줴걕궴먨졳와녨붢셠왅츾쵫웹풕펡췱좟렱욤
```

leaving you with at least 135 characters to change the world. Having supplied a simple message and signature, it's now possible for us to fully reconstruct the above event, possibly by burning through every `created_at` in a week until we find the number that produces a valid signature.

## But Why

Assuming that you've gone through the trouble to say something important in the first place, and you have the private key necessary to produce a valid signature, why wouldn't you just post to nostr? That's a good question, but why are you raining on this awesome parade, and actually I also wish that I knew the answer but here we are.

Assuming that someone has posted an interesting message that either included a signature or was in close proximity to another message that contained a signature... why would anyone care? This is an even more exciting question because it reveals what it means to publish to nostr - that is, to Sign Things and Relay Them.

Once you have signed an event, it has been published. You may have also sent it to your relays, but you could be offline. You might wrap its delivery in Tor, or yeeted it to every plaintext relay you could find. (My kids are expanding my vocabulary.) Maybe only the NSA has a copy, or there's a polaroid someone took of you while it was on your screen. Once you have signed it it has been published because anyone who manages to obtain the information in that event along with the signature, can publish it to whatever relays they want. Yes, you can publish events over instant film. Or Ham radio. Or QR code. Or peer to peer onion service.

And once that happens, it isn't people talking about what you may have said... it is literally what you said. It has your profile photo, your followers get alerts, you would get reply notifications if you ever logged in, yadda yadda.

And so, I propose an informal standard for signing plain text. It doesn't need to use anything exotic like my so very clever base8196, you just need to sign an event with nothing in it except for the content, and then share both the content and the signature.

Did you know that Hangul is phoenetic?

## One implementation of Base8196

```python
INITIAL_CONSONANTS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
VOWELS = 'ㅏㅐㅑㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
FINAL_CONSONANTS = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'

TOKENS = [chr(0xAC00 + (588 * ci) + (28 * vi) + fi)
            for ci, c in enumerate(INITIAL_CONSONANTS)
            for vi, v in enumerate(VOWELS)
            for fi, f in enumerate([''] + list(FINAL_CONSONANTS))]

def base8192_encode(data):
    result = []
    bits = ''.join(format(byte, '08b') for byte in data)
    for i in range(0, len(bits), 13):
        chunk = bits[i:i+13]
        if len(chunk) < 13:
            chunk = chunk.ljust(13, '0')
        index = int(chunk, 2)
        result.append(TOKENS[index])
    return ''.join(result)

def base8192_decode(encoded):
    bits = ''
    for char in encoded:
        index = TOKENS.index(char)
        bits += format(index, '013b')
    result = bytes(int(bits[i:i+8], 2) for i in range(0, len(bits), 8))
    while result[-1] == 0:
        result = result[:-1]
    return result
```
