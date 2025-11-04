# NIP-XX: ProofMode - Cryptographic Video Verification

`draft` `optional`

## Abstract

This NIP defines a standard for attaching cryptographic proof manifests to video events (NIP-71) to enable verification of video authenticity, recording continuity, and device integrity. ProofMode allows viewers to verify that a video was recorded on a specific device at a specific time without editing or tampering.

## Motivation

Social media platforms are increasingly vulnerable to deepfakes, edited videos, and synthetic media. While blockchain timestamping exists, it doesn't prove video continuity or prevent frame-level manipulation. ProofMode solves this by:

1. **Frame-level verification** - SHA256 hashes of captured frames prove recording continuity
2. **Hardware attestation** - iOS App Attest and Android Play Integrity verify the recording device
3. **Cryptographic signing** - PGP signatures ensure manifest authenticity
4. **Tamper detection** - Any edit to the video invalidates the proof chain
5. **Segment tracking** - Recording pauses are documented with sensor data

## Specification

### Event Tags

ProofMode data is attached to video events (typically Kind 34236) using the following tags:

#### Required Tags

- `["verification", "<level>"]` - Verification level (see Verification Levels below)
- `["proofmode", "<manifest_json>"]` - Complete ProofManifest as compact JSON

#### Optional Tags

- `["device_attestation", "<token>"]` - Hardware attestation token from iOS App Attest or Android Play Integrity
- `["pgp_fingerprint", "<fingerprint>"]` - PGP public key fingerprint used to sign the manifest

### Verification Levels

The `verification` tag indicates the strength of cryptographic proof:

- `verified_mobile` - Highest level: has device attestation + PGP signature + complete manifest
- `verified_web` - Medium level: has PGP signature + complete manifest (no hardware attestation)
- `basic_proof` - Low level: has proof data but no cryptographic signature
- `unverified` - No meaningful proof data

### ProofManifest Structure

The `proofmode` tag contains a JSON object with the following structure:

```json
{
  "sessionId": "<unique_session_id>",
  "challengeNonce": "<16_char_nonce>",
  "vineSessionStart": "<ISO8601_timestamp>",
  "vineSessionEnd": "<ISO8601_timestamp>",
  "totalDuration": 6500,
  "recordingDuration": 6000,
  "segments": [
    {
      "segmentId": "<segment_id>",
      "startTime": "<ISO8601_timestamp>",
      "endTime": "<ISO8601_timestamp>",
      "duration": 3000,
      "frameHashes": [
        "<sha256_hash_1>",
        "<sha256_hash_2>",
        "..."
      ],
      "frameTimestamps": [
        "<ISO8601_timestamp_1>",
        "<ISO8601_timestamp_2>",
        "..."
      ],
      "sensorData": {
        "accelerometer": {"x": 0.1, "y": 0.2, "z": 9.8},
        "gyroscope": {"x": 0.01, "y": 0.02, "z": 0.01}
      }
    }
  ],
  "pauseProofs": [
    {
      "startTime": "<ISO8601_timestamp>",
      "endTime": "<ISO8601_timestamp>",
      "duration": 500,
      "sensorData": {
        "timestamp": "<ISO8601_timestamp>",
        "accelerometer": {"x": 0.1, "y": 0.2, "z": 9.8},
        "gyroscope": {"x": 0.01, "y": 0.02, "z": 0.01},
        "magnetometer": {"x": 45.0, "y": 12.0, "z": -30.0},
        "light": 150.0
      },
      "interactions": [
        {
          "timestamp": "<ISO8601_timestamp>",
          "interactionType": "touch",
          "coordinates": {"x": 180, "y": 640},
          "pressure": 0.5
        }
      ]
    }
  ],
  "interactions": [
    {
      "timestamp": "<ISO8601_timestamp>",
      "interactionType": "start|stop|touch",
      "coordinates": {"x": 180, "y": 640},
      "pressure": 0.5,
      "metadata": {}
    }
  ],
  "finalVideoHash": "<sha256_hash_of_complete_video>",
  "deviceAttestation": {
    "token": "<platform_specific_attestation_token>",
    "platform": "iOS|Android|Web",
    "deviceId": "<device_identifier>",
    "isHardwareBacked": true,
    "createdAt": "<ISO8601_timestamp>",
    "challenge": "<challenge_nonce>",
    "metadata": {
      "attestationType": "app_attest|play_integrity|fallback",
      "deviceInfo": {
        "platform": "iOS",
        "model": "iPhone 15 Pro",
        "version": "17.0",
        "manufacturer": "Apple"
      }
    }
  },
  "pgpSignature": {
    "signature": "-----BEGIN PGP SIGNATURE-----\n...\n-----END PGP SIGNATURE-----",
    "publicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...\n-----END PGP PUBLIC KEY BLOCK-----",
    "publicKeyFingerprint": "1A2B3C4D5E6F7890..."
  }
}
```

### Field Descriptions

#### Core Fields
- `sessionId` - Unique identifier for the recording session
- `challengeNonce` - Random nonce generated at session start, used in device attestation to prevent replay attacks
- `vineSessionStart` / `vineSessionEnd` - Recording session boundaries
- `totalDuration` - Total elapsed time in milliseconds (including pauses)
- `recordingDuration` - Actual recording time in milliseconds (excluding pauses)

#### Segments
Recording can be paused and resumed, creating multiple segments. Each segment contains:
- `segmentId` - Unique segment identifier
- `startTime` / `endTime` - Segment boundaries
- `frameHashes` - Array of SHA256 hashes of captured video frames
- `frameTimestamps` - Timestamps when each frame was captured (optional)
- `sensorData` - Device sensor readings during recording (optional)

#### Pause Proofs
When recording is paused, sensor data is collected to prove device continuity:
- `startTime` / `endTime` - Pause boundaries
- `sensorData` - Sensor readings during pause (accelerometer, gyroscope, magnetometer, light)
- `interactions` - User touch/tap events during pause

#### Interactions
User interactions recorded throughout the session:
- `timestamp` - When interaction occurred
- `interactionType` - Type of interaction (start, stop, touch)
- `coordinates` - Screen coordinates of interaction
- `pressure` - Touch pressure (optional)

#### Final Video Hash
- `finalVideoHash` - SHA256 hash of the complete rendered video file

#### Device Attestation
Platform-specific hardware attestation proving the device is genuine:
- **iOS**: Uses App Attest API (iOS 14+)
- **Android**: Uses Play Integrity API
- **Web/Other**: Fallback software attestation

Fields:
- `token` - Platform-specific attestation token
- `platform` - Operating system (iOS, Android, Web)
- `deviceId` - Device identifier
- `isHardwareBacked` - Whether attestation uses hardware security module
- `challenge` - Challenge nonce used in attestation (matches `challengeNonce`)
- `metadata` - Platform-specific attestation details

#### PGP Signature
Cryptographic signature of the entire manifest:
- `signature` - PGP signature in ASCII-armored format
- `publicKey` - PGP public key in ASCII-armored format
- `publicKeyFingerprint` - Key fingerprint for quick lookup

## Implementation

### Recording Phase

1. **Start Session**
   - Generate unique `sessionId` and `challengeNonce`
   - Request hardware device attestation with challenge nonce
   - Initialize ProofMode session

2. **Capture Frames**
   - During recording, periodically capture video frames
   - Generate SHA256 hash of each frame
   - Store frame hashes with timestamps
   - Optionally collect sensor data (accelerometer, gyroscope, etc.)

3. **Handle Pauses**
   - When recording pauses, stop current segment
   - Begin collecting pause proof data (sensor readings, interactions)
   - When resuming, start new segment

4. **Finalize Session**
   - Stop recording and close final segment
   - Hash complete video file
   - Compile ProofManifest with all segments, pauses, and interactions
   - Sign manifest with PGP private key
   - Attach ProofManifest to video event as tags

### Verification Phase

To verify a ProofMode video, clients should:

1. **Extract ProofManifest**
   - Parse `proofmode` tag from video event
   - Extract `deviceAttestation` and `pgpSignature` from separate tags

2. **Verify PGP Signature**
   - Extract PGP public key from manifest
   - Verify signature of manifest JSON
   - Check public key fingerprint matches `pgp_fingerprint` tag

3. **Verify Device Attestation** (if present)
   - Validate attestation token against platform-specific APIs
   - Verify challenge nonce matches manifest `challengeNonce`
   - Check attestation timestamp is recent (within 24 hours of recording)

4. **Verify Frame Hashes** (advanced)
   - Re-encode video to extract individual frames
   - Generate SHA256 hashes of extracted frames
   - Compare against hashes in manifest segments
   - Verify frame count and timestamps match recording duration

5. **Verify Recording Continuity**
   - Check that segment timestamps are contiguous
   - Verify pause durations match gaps between segments
   - Validate total recording duration matches video length

6. **Display Verification Badge**
   - `verified_mobile` - Show "Verified" badge with hardware attestation icon
   - `verified_web` - Show "Signed" badge
   - `basic_proof` - Show "Basic Proof" indicator
   - `unverified` - No badge or "Unverified" indicator

## Example Event

```json
{
  "kind": 34236,
  "pubkey": "...",
  "created_at": 1730326800,
  "tags": [
    ["d", "unique-video-identifier"],
    ["title", "My Verified Video"],
    ["url", "https://media.example.com/video.mp4", "720x1280"],
    ["thumb", "https://media.example.com/thumb.jpg", "720x1280"],
    ["duration", "6"],
    ["verification", "verified_mobile"],
    ["proofmode", "{\"sessionId\":\"session_1730326800000_1234\",\"challengeNonce\":\"a1b2c3d4e5f6789\",\"vineSessionStart\":\"2025-10-30T10:00:00.000Z\",\"vineSessionEnd\":\"2025-10-30T10:00:06.500Z\",\"totalDuration\":6500,\"recordingDuration\":6000,\"segments\":[{\"segmentId\":\"segment_1\",\"startTime\":\"2025-10-30T10:00:00.000Z\",\"endTime\":\"2025-10-30T10:00:06.000Z\",\"frameHashes\":[\"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\"]}],\"pauseProofs\":[],\"interactions\":[{\"timestamp\":\"2025-10-30T10:00:00.000Z\",\"interactionType\":\"start\",\"coordinates\":{\"x\":180,\"y\":640}}],\"finalVideoHash\":\"d4e5f6a7b8c9...\"}"],
    ["device_attestation", "AAABBBCCC..."],
    ["pgp_fingerprint", "1A2B3C4D5E6F7890..."]
  ],
  "content": "Check out this verified video!",
  "sig": "..."
}
```

## Security Considerations

### Threat Model

ProofMode protects against:
- ✅ **Post-recording video editing** - Frame hashes detect any modifications
- ✅ **Deepfakes and synthetic videos** - Hardware attestation proves real device
- ✅ **Timestamp manipulation** - Device attestation includes trusted timestamps
- ✅ **Replay attacks** - Challenge nonce prevents reuse of attestations

ProofMode does NOT protect against:
- ❌ **Screen recording** - A user can screen-record another video
- ❌ **Camera lens manipulation** - Physical objects placed in front of camera
- ❌ **Compromised devices** - Rooted/jailbroken devices may forge attestations
- ❌ **Social engineering** - User can intentionally create misleading content

### Privacy Considerations

- **Device Identifiers**: The `deviceId` field may be sensitive. Clients should:
  - Hash or truncate device IDs before publishing
  - Allow users to opt-out of device attestation
  - Clearly indicate when ProofMode is active

- **Sensor Data**: Accelerometer and gyroscope data may reveal user location or behavior. Clients should:
  - Allow disabling sensor data collection
  - Sanitize or omit sensitive sensor readings
  - Aggregate sensor data to reduce precision

- **PGP Keys**: Users should be able to:
  - Rotate PGP keys periodically
  - Revoke compromised keys
  - Use separate keys for different purposes

### Verification Best Practices

Verifying clients should:

1. **Always check PGP signature** - This is the minimum verification
2. **Validate device attestation** when present - But gracefully handle missing/invalid attestations
3. **Display verification level prominently** - Users should understand confidence level
4. **Cache verification results** - Re-verification is expensive
5. **Handle expired attestations** - Attestations may expire after 24-48 hours
6. **Warn on missing proofs** - But don't assume malice if ProofMode is absent

## Reference Implementation

OpenVine provides a complete reference implementation:
- **Recording**: `ProofModeSessionService` in OpenVine mobile app
- **Publishing**: `VideoEventPublisher` adds ProofMode tags to Nostr events
- **Verification**: `ProofModeHelpers` and verification UI components

Source: https://github.com/openvine/openvine

## Backwards Compatibility

This NIP is fully backwards compatible:
- Events without ProofMode tags are treated as unverified
- Older clients ignore ProofMode tags
- ProofMode is opt-in - videos without it still work normally

## Future Extensions

Possible future enhancements:

1. **Witness Signatures** - Multiple devices co-sign the same recording
2. **Location Proofs** - GPS coordinates with cryptographic verification
3. **Biometric Proof** - Prove human presence during recording
4. **Chain of Custody** - Track video transfer and handling
5. **Selective Disclosure** - Zero-knowledge proofs for privacy-preserving verification

## References

- [NIP-01: Basic protocol flow description](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-71: Video Events](https://github.com/nostr-protocol/nips/blob/master/71.md)
- [iOS App Attest](https://developer.apple.com/documentation/devicecheck/establishing_your_app_s_integrity)
- [Android Play Integrity](https://developer.android.com/google/play/integrity)
- [ProofMode Original Project](https://proofmode.org)

## Authors

- Evan Henshaw-Plath (Rabble)

## License

This NIP is released into the public domain.

