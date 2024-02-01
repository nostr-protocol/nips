NIP-XX
======

Reposts
-------

`optional`

Clients MAY send `PROXY` messages requesting that the connected relay proxy their messages to other relays.

The format of the `PROXY` command is:

`["PROXY", "<proxy_mode>", <relay_url1>, <relay_url2>, ...]`

In which `proxy_mode` is one of `read`, `write`.

- If `read` is specified, `REQ` messages and their corresponding `CLOSED` MAY be proxied.
- If `write` is specified, `EVENT` messages and their corresponding `OK` messages MAY be proxied.

In either case, relays MAY proxy `AUTH` messages. Clients are responsible for deciding if they want to respond
to proxied challenges, since it poses a severe risk of man-in-the-middle attacks due to the proxy's access
to the user's authenticated session with other relays.

Relays MAY completely ignore this command.
