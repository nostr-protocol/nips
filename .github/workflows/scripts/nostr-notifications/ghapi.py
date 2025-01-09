import codecs
import json
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError

API_VERSION='2022-11-28'
API_URL='https://api.github.com'
NOSTR_RE = re.compile('^(nprofile|npub)[0-9a-z]+$')

def get(req_url, ghtoken=None):
    try:
        req = Request(API_URL + req_url)
        req.add_header('Accept', 'application/vnd.github+json')
        req.add_header('X-GitHub-Api-Version', API_VERSION)
        if ghtoken is not None:
            req.add_header('Authorization', 'token ' + ghtoken)
        reader = codecs.getreader('utf-8')
        response = urlopen(req)
        return json.load(reader(response))
    except (HTTPError, json.decoder.JSONDecodeError):
        return None

def get_pubkey_from_socials(user, ghtoken=None):
    '''
    Get various socials from user's github profile that we might want to use in
    the rest of the bot.
    '''
    accounts = get(f'/users/{user}/social_accounts', ghtoken)
    if accounts is None: # in case of HTTP failure, we'll just return no socials
        accounts = ""
    for rec in accounts:
        url = urlparse(rec['url'])
        components = url.path.split('/')
        # possibly nostr
        # netloc will probably be njump.me, but we'll handle other URLs just in case
        for comp in components:
            if NOSTR_RE.match(comp):
                return comp
    
    return None