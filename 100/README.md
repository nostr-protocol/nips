# NostrReAction (NIP-100) Demo

**WORK IN PROGRESS**

This is a web-based demonstration application showcasing the features of NIP-100, also known as NostrReAction. NIP-100 is a proposed extension to the Nostr protocol that aims to unify and improve content interactions, content evolution, and validation.

## Overview

This demo allows you to interact with the Nostr network and experience NIP-100 concepts firsthand, including:

*   **Unified Interactions:**  Consolidated "like," "share," "reply," and "modify" actions into a single event type (kind: 10037).
*   **Content Evolution:**  Enables users to propose modifications to original content and content owners to validate or refuse these modifications.
*   **Notifications:** Notifies content owners of all interactions on their content (kind: 10038).
*   **IPFS Integration:** Leverages IPFS to handle larger content, ensuring censorship resistance and content availability.
* **Content Validation** : A robust system of validation is put in place, allowing original authors to validate the modifications and other users to see the different versions and the influence of each.
*   **Web of Trust Potential** The app offers a base for a web of trust approach to content validation by the means of G1 public key usage, and the IPNS/IPFS for better decentralization.

## Features

*   **Connect to a Nostr Relay:** Connects to any Nostr relay via WebSocket, allowing interaction with the network.
*   **Private Key Input (for testing):** Provides an input field for a Nostr private key, enabling the signing of events (use with caution). If no private key is given, the app will try to use a nostr extension (like Alby).
*   **Follow Public Keys:** Allows subscribing to events from specific public keys
*   **Publish Events:** Publishes simple text-based events to the connected relay.
*   **View Events:** Displays received events, their content, and associated data.
*   **React to Events (NIP-100):**
    *   **Like:** Send a like action.
    *   **Modify:** Propose a modification to an event.
    *   **Reply:** Reply to an event with a short text or a longer content through IPFS.
        *   Long replies (over 140 chars) are automatically handled by IPFS.
   *   **Validate/Refuse:** Validates a proposed modification.
*   **Notifications:** List all the notifications sent to the content author.
*   **IPFS Content Display:** Fetches and displays content from IPFS if the event has an `ipfs_cid` tag.
*   **Persistent Settings:** The app persists the relay URL and public key settings in local storage, so they are not lost when the page is reloaded.

## Getting Started

1.  **Open the HTML file:** Open the `index.html` file in a web browser.
2.  **Enter a Relay URL:** In the relay URL input field, enter the URL of a Nostr relay (e.g., `wss://relay.damus.io`).
3. **Enter public keys** If you want to see specific authors, enter the public keys you want to follow, separated by comma.
4.  **Connect to Relay:** Click the "Connect" button to establish a WebSocket connection with the specified relay.
5.  **Enter Private Key:** If you plan to publish event, enter your private key.
6.  **Publish Event:** Enter a message and click the "Publish Event" button to send a basic Nostr note (kind:10037).
7.  **Interact with Events:** Once the events are received, use the action buttons (like, modify, reply, validate, refuse) on every events.
8. **Content evolution** Once you start using the application, you will see how a content can be improved by proposing a modification, and validated or refused by the original author.
9. **Explore the power of decentralization:** Every long content (replies and modifications) are stored on IPFS, and you can see how the validation mechanism make the link between the different parts of a content and its history.

## Important Notes

*   **Private Key Security:** Use the private key input field with caution. It is primarily intended for testing and demonstration purposes.
*   **Nostr Extension:** If no private key is entered, the app will use the `window.nostr` if it exists (usually when the user has installed a Nostr browser extension like Alby), and prompt a signature request for each action.
*   **Relay Selection:**  Choose a stable and reliable Nostr relay for a better experience.
*   **IPFS Gateway:** The app uses `https://ipfs.io` as the default IPFS gateway.
*   **Demo Purposes:** This is a demo application and it doesn't store or persist any data.

## Technologies Used

*   **HTML, CSS, JavaScript:** For the user interface and application logic.
*   **Tailwind CSS:** For rapid and responsive styling.
*   **Nostr-tools:**  A JavaScript library for interacting with the Nostr network.
*   **Font-Awesome:** An icon library.

## Contributing

Feel free to contribute to the development of this demo application! Please submit any bug fixes or enhancements to the corresponding repository.

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
This license requires that any modified versions of this software must be made available under the same license terms,
including when the software is provided as a service over a network.

Commercial use is allowed, but any modifications must be open-sourced and attributed to the original authors.

For the full license text, see [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html).
