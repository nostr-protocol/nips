# NIP XXXX: Read Status Tracking via Salted Hash Keys and Compressed 64-bit Roaring Bitmaps

**Abstract:**  
Track message read status by publishing replaceable events (kind 30050) containing a compressed 64-bit Roaring Bitmap of read-event keys.

**Specification:**

1. **Secret Salt:**
  
  - Generate a random 32-byte salt and encrypt it using NIP‑44.
  - Include the encrypted salt in every `read_status` event.
2. **Key Generation:**
  
  - For each event, compute its 64-bit key by taking the first 8 bytes of the SHA-256 hash of the concatenated salt and event ID:
  - ```
    key = takeFirst8Bytes( sha256( salt + event_id ) )
    ```
    
3. **Roaring Bitmap:**
  
  - A compressed data structure for storing integer sets, optimized for fast operations and low memory usage.
  - In sparse mode, it stores about 2 bytes per entry, versus 32 bytes for raw event IDs, offering >90% size reduction.
4. **Read Status Events (Kind 30050):**
  
  - **Event structure:**
    
    ```json
    {
      "id": "<event id>",
      "pubkey": "<publisher pubkey>",
      "created_at": 1626548400,
      "kind": 30050,
      "tags": [
        ["d", "<sequence identifier>"]
      ],
      "content": "{\"bitmap\":\"<base64_encoded_bitmap>\",\"salt\":\"<nip44_encrypted_salt>\"}",
      "sig": "<signature>"
    }
    ```
    
  - **Handling large bitmaps:**
    
    - Clients can retain the original event and publish new events with only the diff (new read statuses), minimizing network traffic.
5. **### **Client Behavior:**
  
  - **Marking Reads:**  
    Compute the key for each event and update both the **total read messages bitmap** and the **current read messages bitmap** accordingly.
    
  - **Publishing:**
    
    - Maintain two bitmaps:
      1. **Total Read Messages Bitmap**: Complete set of read message keys.
      2. **Current Read Messages Bitmap**: Tracks recent changes.
    - Periodically (e.g., every 5 minutes or app close), publish an updated event.
    - When the **current read messages bitmap** exceeds a soft limit (e.g., 10,000 events, ~20KB base64-encoded), reset it and publish the diff since the last event. If the diff is too large, publish the entire updated bitmap.
    - The **total read messages bitmap** is never transferred due to potential size limitations (e.g., 10M events = 27MB base64-encoded).
6. **### **Security:**
  
  - The 64-bit key space offers minimal collision risk, and any collisions would mistakenly mark another message as read.
  - Salt is encrypted to obfuscate read statuses, and only devices with the decryption key can recover the salt and keys.
  - If the salt is compromised, a new salt must be used to recalculate the bitmaps, ensuring confidentiality.
7. **References:**
  
  - [Roaring Bitmaps paper](https://arxiv.org/abs/1402.6407).
  - [CRoaring: Roaring bitmaps in C (and C++)](https://github.com/RoaringBitmap/CRoaring)
  - [RoaringBitmap: A better compressed bitset in Java](https://github.com/RoaringBitmap/RoaringBitmap)

