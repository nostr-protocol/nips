import argparse
import ssl
import os
import re
from nostr.event import Event, EventKind
from nostr.key import PrivateKey
from nostr.relay_manager import RelayManager
import time
import json
import bech32
import ghapi

EMBED_RE = re.compile('nostr:([0-9a-z]+)')

def parse_tlv(data):
    try:
        rv = {}
        ptr = 0
        while ptr < len(data):
            t = data[ptr]
            l = data[ptr + 1]
            if t not in rv:
                rv[t] = []
            rv[t].append(data[ptr + 2:ptr + 2 + l])
            ptr += 2 + l
        return rv
    except IndexError:
        return None

def embeds_to_tags(content):
    tags = []
    for match in EMBED_RE.finditer(content):
        embed = match.group(1)
        (hrp, data, spec) = bech32.bech32_decode(embed, 1000)
        if hrp is None or data is None or spec is None:
            continue # no valid bech32
        data = bytes(bech32.convertbits(data, 5, 8))
        if hrp == 'nprofile':
            tlv = parse_tlv(data)
            if tlv is None or 0x00 not in tlv or len(tlv[0x00][0]) != 32:
                continue # no valid tlv, no key, or invalid-length key
            key = tlv[0x00][0]
            relays = tlv.get(0x01, [])
            if relays: # if relay supplied, specify the first one
                tags.append(['p', key.hex(), relays[0].decode('utf8')])
            else: # no relay supplied
                tags.append(['p', key.hex()])
        elif hrp == 'npub':
            if len(data) != 33: # 32 bytes + ?
                continue
            tags.append(['p', data[:-1].hex()])
    return tags

def send_nostr_note(private_key_hex, repo_name, user, gh_pubkey, title, url, relays):
    private_key = PrivateKey(bytes.fromhex(private_key_hex))
    public_key = private_key.public_key.hex()

    message = (
            "[{repo}] Merge PR from {user}{userinfo}: {title} {url}"
        ).format(
            userinfo = f" (nostr:{gh_pubkey})" if gh_pubkey is not None else "",
            repo   = repo_name,
            user   = user,
            title  = title,
            url    = url
        )

    event = Event(
        public_key=public_key,
        content=message,
        kind=EventKind.TEXT_NOTE,  # Tipo de evento: Nota
        tags=embeds_to_tags(message)
    )
    private_key.sign_event(event)
    
    json_obj = json.dumps(event.__dict__, indent=4)
    print(json_obj)

    for relay_url in relays:
        print(f"Enviando nota al relay: {relay_url}")
        relay_manager = RelayManager()
        relay_manager.add_relay(relay_url)

    relay_manager.open_connections({"cert_reqs": ssl.CERT_NONE})
    time.sleep(1.25)

    try:
        # Sende event
        relay_manager.publish_event(event)
        print(f"Nota enviada exitosamente a {relays}")
    except Exception as e:
        print(f"Error al enviar la nota a {relay_url}: {e}")
    finally:
        time.sleep(1) 
        relay_manager.close_connections()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enviar una nota a Nostr al realizar merge de un PR.")
    parser.add_argument("--repo", required=True, help="Repositorio donde se creeo la PR")
    parser.add_argument("--user", required=True, help="Usuario que creó el PR.")
    parser.add_argument("--title", required=True, help="Título del PR.")
    parser.add_argument("--url", required=True, help="URL del PR.")

    args = parser.parse_args()

    # Extract repository name
    repo_name = args.repo.split("/")[-1]

    relays_env = os.getenv("NOSTR_RELAYS", "")
    private_key_env = os.getenv("NOSTR_PRIVATE_KEY", "")

    if not relays_env:
        raise ValueError("The NOSTR_RELAYS environment variable is undefined or empty.")
    
    if not private_key_env:
        raise ValueError("The NOSTR_PRIVATE_KEY environment variable is undefined or empty.")

    # Split relays in a list
    relays = relays_env.split(",")

    # Gest user pubkey from github solica links
    gh_pubkey =  ghapi.get_pubkey_from_socials(args.user)

    # Create and send note
    send_nostr_note(private_key_env, repo_name, args.user, gh_pubkey, args.title, args.url, relays)
