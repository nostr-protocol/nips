# NIP-XX: Smart Widgets - Interactive Components for Nostr 

`draft` `optional`

Improved version from (PR [#1454](https://github.com/nostr-protocol/nips/pull/1454))
## Abstract

This NIP introduces Smart Widgets, interactive graphical components encapsulated as Nostr events (kind `30033`), designed for seamless integration into Nostr clients. Smart Widgets enable rich, dynamic content that enhances user interaction through embedded applications, interactive forms, and mini-apps within the Nostr ecosystem.

## Motivation

As Nostr continues to grow, there is an increasing need for more engaging and interactive content beyond traditional static notes. Smart Widgets provide a standardized way to embed interactive components directly into Nostr events, enabling developers to create rich user experiences while maintaining the decentralized nature of the protocol.

## Specification

### Event Structure

Smart Widgets use addressable event kind `30033` with the following structure:

```json
{
  "id": "<32-bytes lowercase hex-encoded SHA-256 of the serialized event data>",
  "pubkey": "<32-bytes lowercase hex-encoded public key of the event creator>",
  "created_at": "<Unix timestamp in seconds>",
  "kind": 30033,
  "content": "<widget-title>",
  "tags": [
    ["client", "<client-name>", "<client-31190-data>"],
    ["d", "<unique-identifier>"],
    ["l", "<widget-type>"],
    ["icon", "<widget-icon-url>"],
    ["image", "<widget-thumbnail-image-url>"],
    ["input", "<input-label>"],
    ["button", "<label>", "<type>", "<url>"],
    ["button", "<label>", "<type>", "<url>"]
  ],
  "sig": "<64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data>"
}
```

### Tags

#### Required Tags
- `d`: Unique identifier for the widget (UUID recommended)
- `l`: Widget type (`basic`, `action`, or `tool`)
- `image`: Thumbnail image URL for widget display

#### Optional Tags
- `client`: Reference to the client used for creating the widget
- `icon`: Icon URL (required for `action` and `tool` widgets)
- `input`: Input field label/placeholder (maximum of one)
- `button`: Button definition (maximum of six for `basic`, one for `action`/`tool`)

### Widget Types

#### Basic Widget
**Purpose**: Versatile widgets combining multiple UI components for flexible display and interaction.

**Components**:
- Image (mandatory, maximum of one)
- Input field (optional, maximum of one) 
- Buttons (optional, maximum of six, of the following available types : `redirect`,`nostr`,`zap`,`post`)

**Use Cases**: Forms, dashboards, interactive content with multiple actions

#### Action Widget  
**Purpose**: Streamlined widgets designed to trigger actions by embedding URLs in iframes.

**Components**:
- Image (mandatory, for visual representation)
- Icon (mandatory, for widget identification)
- Button (mandatory, single button of type `app`)

**Behavior**: Clicking opens the specified URL in an iframe without expecting data return.

**Use Cases**: Launching external applications, mini-games, one-way interactions

#### Tool Widget
**Purpose**: Widgets that facilitate interaction with external applications via iframes with data exchange capabilities.

**Components**:
- Image (mandatory, for visual representation)
- Icon (mandatory, for widget identification)
- Button (mandatory, single button of type `app`)

**Behavior**: Clicking opens the specified URL in an iframe configured to return data to the parent application.

**Use Cases**: Data retrieval tools, configuration interfaces, two-way interactions

### Button Types

Smart Widgets support the following button types:

- `redirect`: Standard web link (opens in new tab/window)
- `nostr`: Nostr protocol action (handles `nostr:` URIs or npub/note identifiers)
- `zap`: Lightning payment (accepts Lightning addresses or invoices)
- `post`: Form submission (submits input data to URL, expects widget response)
- `app`: Application integration (opens URL in iframe for Action/Tool widgets)

### Input Field

Widgets may include a single input field for user data entry:
- Text input with configurable placeholder/label
- Submitted data included in `post` button requests
- Input value accessible to iframe applications via the widget handler API

## Developer Flow Guide

### Quick Start for Basic Widgets

**📋 No-Code Path (Recommended for beginners)**
1. ✅ Visit [YakiHonne Widget Editor](https://yakihonne.com/smart-widget-builder)
2. ✅ Choose "Basic Widget" template
3. ✅ Add your image, input field (optional), and buttons
4. ✅ Configure button actions (redirect, nostr, zap, post)
5. ✅ Preview your widget
6. ✅ Publish to Nostr relays
7. ✅ Share your widget's `naddr` address

**⚡ Code Path (For dynamic content)**
1. ✅ `npm install smart-widget-builder`
2. ✅ Create API endpoint that returns widget JSON
3. ✅ Use the builder package to generate and sign events
4. ✅ Publish to relays or return signed events
5. ✅ Test in a Nostr client that supports widgets

### Quick Start for Action/Tool Widgets

**🚀 Development Flow**
1. ✅ Build your web application (React, Vue, vanilla JS, etc.)
2. ✅ `npm install smart-widget-handler`
3. ✅ Add iframe communication code:
   ```javascript
   // Notify parent when ready
   SWHandler.client.ready();
   
   // Listen for user data
   SWHandler.client.listen((data) => {
     if (data.kind === 'user-metadata') {
       setUser(data.data.user);
     }
   });
   ```
4. ✅ Create `/.well-known/widget.json` manifest file
5. ✅ Deploy to hosting service (Vercel, Netlify, etc.)
6. ✅ Test your app URL works independently
7. ✅ Use YakiHonne Widget Editor to create Action/Tool widget
8. ✅ Enter your app URL and publish to Nostr

**🔧 Widget Manifest Example**
```json
{
  "pubkey": "your-hex-pubkey",
  "widget": {
    "title": "My Cool App",
    "appUrl": "https://my-app.vercel.app",
    "iconUrl": "https://my-app.vercel.app/icon.png",
    "imageUrl": "https://my-app.vercel.app/preview.jpg",
    "buttonTitle": "Launch App",
    "tags": ["utility", "tool"]
  }
}
```

### Integration for Nostr Client Developers

**📱 Adding Widget Support to Your Client**
1. ✅ `npm install smart-widget-previewer smart-widget-handler`
2. ✅ Filter for kind `30033` events in your feed
3. ✅ Use `<Widget>` component to render events
4. ✅ Handle button callbacks (nostr, zap, post, app actions)
5. ✅ Implement iframe security for Action/Tool widgets
6. ✅ Test with existing widgets in the ecosystem

## Implementation

### For Widget Creators

#### Basic Widgets

**Option 1: No-Code Creation**
Use the YakiHonne Widget Editor to build widgets without coding.

**Option 2: Custom API Development**
```bash
npm install smart-widget-builder
```

Example implementation:
```javascript
const { SW, SWComponentsSet, Image, Button, Input } = require('smart-widget-builder');

async function createWidget() {
  const smartWidget = new SW('basic');
  await smartWidget.init();
  
  const widgetImage = new Image('https://example.com/image.jpg');
  const widgetInput = new Input('Enter your name');
  const submitButton = new Button(1, 'Submit', 'post', 'https://api.example.com/submit');
  
  const componentsSet = new SWComponentsSet([widgetImage, widgetInput, submitButton], smartWidget);
  
  const result = await smartWidget.publish(componentsSet, 'My Widget', 'unique-id-123');
  return result;
}
```

#### Action/Tool Widgets

1. **Develop Your Application**: Create a web application (new or existing)
2. **Add Nostr Integration**:
   ```bash
   npm install smart-widget-handler
   ```
3. **Implement Widget Communication**:
   ```javascript
   import SWHandler from 'smart-widget-handler';
   
   // Client side (iframe)
   SWHandler.client.ready();
   SWHandler.client.listen((data) => {
     if (data.kind === 'user-metadata') {
       // Handle user data from parent
     }
   });
   ```
4. **Create Widget Manifest**: Place `widget.json` at `/.well-known/widget.json`
   ```json
   {
     "pubkey": "your-nostr-pubkey-in-hex",
     "widget": {
       "title": "My Widget",
       "appUrl": "https://your-app.com",
       "iconUrl": "https://your-app.com/icon.png",
       "imageUrl": "https://your-app.com/thumbnail.png",
       "buttonTitle": "Launch Widget",
       "tags": ["tool", "utility"]
     }
   }
   ```

### For Nostr Client Developers

#### Widget Display
```bash
npm install smart-widget-previewer
```

```javascript
import { Widget } from 'smart-widget-previewer';

function WidgetRenderer({ widgetEvent }) {
  return (
    <Widget 
      event={widgetEvent}
      onNextWidget={(newWidget) => console.log('Updated widget:', newWidget)}
      onNostrButton={(url) => handleNostrAction(url)}
      onZapButton={(address) => handleZapAction(address)}
      onActionWidget={(url) => openInIframe(url)}
    />
  );
}
```

#### Widget Communication
```bash
npm install smart-widget-handler
```

```javascript
import SWHandler from 'smart-widget-handler';

// Host side (parent application)
SWHandler.host.sendContext(userProfile, hostOrigin, iframeOrigin, iframeElement);
SWHandler.host.listen((data) => {
  if (data.kind === 'sign-publish') {
    // Handle event signing request
  }
});
```

## Security Considerations

### Iframe Security
- All iframe integrations MUST implement proper sandboxing
- CORS policies MUST be enforced for cross-origin requests
- Content Security Policy (CSP) headers SHOULD be implemented

### Input Validation
- All user inputs MUST be sanitized before processing
- URL validation MUST be performed on all button and image URLs
- Widget manifests MUST be validated against the specified schema

### Authentication
- Widget creators MUST be verified through their Nostr public key
- Iframe applications SHOULD verify parent origin before accepting messages
- Event signatures MUST be validated before processing widget interactions

## Widget Manifest Schema

The `/.well-known/widget.json` file MUST conform to the following schema:

```json
{
  "pubkey": "string (hex)",
  "widget": {
    "title": "string",
    "appUrl": "string (URL)",
    "iconUrl": "string (URL)",
    "imageUrl": "string (URL)",
    "buttonTitle": "string",
    "tags": ["array of strings"]
  }
}
```

## Implementation Requirements

### Required for Basic Widgets
- Support for image display
- Input field handling (optional)
- Button interaction handling
- POST request processing for dynamic updates

### Required for Action/Tool Widgets
- Iframe embedding capabilities
- Secure parent-child communication
- Widget manifest validation
- User context passing

### Recommended
- Widget validation tools
- Development debugging interfaces
- Performance optimization for iframe loading
- Error handling and fallback displays

## Examples

### Basic Widget Event
```json
{
  "id": "widget_event_id",
  "pubkey": "creator_pubkey",
  "created_at": 1681234567,
  "kind": 30033,
  "content": "Weather Widget",
  "tags": [
    ["d", "weather-widget-123"],
    ["l", "basic"],
    ["image", "https://example.com/weather.jpg"],
    ["input", "Enter city name"],
    ["button", "Get Weather", "post", "https://api.weather.com/check"],
    ["button", "Share", "nostr", "nostr:npub1..."]
  ],
  "sig": "signature"
}
```

### Action Widget Event
```json
{
  "id": "action_widget_id", 
  "pubkey": "creator_pubkey",
  "created_at": 1681234567,
  "kind": 30033,
  "content": "Mini Game",
  "tags": [
    ["d", "game-widget-456"],
    ["l", "action"],
    ["image", "https://game.example.com/thumbnail.jpg"],
    ["icon", "https://game.example.com/icon.png"],
    ["button", "Play Game", "app", "https://game.example.com"]
  ],
  "sig": "signature"
}
```

## Rationale

Smart Widgets address several key limitations in the current Nostr ecosystem:

1. **Limited Interactivity**: Traditional notes are static; widgets enable dynamic content
2. **Application Integration**: Seamless embedding of external applications within Nostr clients  
3. **User Experience**: Rich, engaging content that encourages longer engagement
4. **Developer Accessibility**: Multiple implementation paths from no-code to fully custom solutions
5. **Ecosystem Growth**: Standardized framework for innovative applications built on Nostr

## Backwards Compatibility

Smart Widgets are entirely additive to the Nostr protocol. Clients that do not support kind `30033` events will simply ignore them without any adverse effects. The event structure follows standard Nostr conventions and uses established tag patterns.

## Reference Implementation
- **Smart Widgets Full Documentation**: 
    - https://yakihonne.com/docs/sw/intro 
- **Dynamic Basic Smart Widget Boiler Plate**: 
    - https://github.com/YakiHonne/sw-dynamic-api
- **YakiHonne Widget Editor**: 
    - https://yakihonne.com/smart-widget-builder
- **Smart Widget Builder Package**: 
    - https://github.com/YakiHonne/smart-widget-builder
    - https://www.npmjs.com/package/smart-widget-builder
- **Smart Widget Previewer Package**: 
    - https://github.com/YakiHonne/smart-widget-previewer
    - https://www.npmjs.com/package/smart-widget-previewer 
- **Smart Widget Handler Package**: 
    - https://github.com/YakiHonne/smart-widget-handler
    - https://www.npmjs.com/package/smart-widget-handler

## Conclusion

Smart Widgets represent a significant evolution in Nostr's capability to support rich, interactive content while maintaining the protocol's decentralized principles. By providing multiple implementation paths and comprehensive tooling, this specification enables both technical and non-technical users to create engaging experiences within the Nostr ecosystem.
