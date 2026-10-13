# NIP-101 Cookie Workflow Extension

UPlanet: Cookie-Based Workflow Automation
------------------------------------------

`draft` `optional`

**Extends:** [NIP-101](101.md) (UPlanet: Decentralized Identity & Geographic Coordination)

This NIP defines a workflow automation system that allows users to program their AI assistant using cookie-based data sources and visual workflow building (n8n-style interface).

## Motivation

Users upload cookies to enable authenticated web scraping (see [COOKIE_SYSTEM.md](../Astroport.ONE/IA/COOKIE_SYSTEM.md)). This extension allows users to:
- **Program workflows** visually (n8n-style interface)
- **Chain data sources** (cookie scrapers) → **processing** (AI, image recognition) → **output** → **actions**
- **Store workflows** as NOSTR events for portability and sharing
- **Execute workflows** automatically via `#cookie` tag in messages

## Event Kinds

### Workflow Definition (kind:31900)

A **replaceable event** (kind 31900) stores a complete workflow definition.

```jsonc
{
  "kind": 31900,
  "tags": [
    ["d", "workflow_id"],           // Unique workflow identifier
    ["t", "cookie-workflow"],       // Workflow type tag
    ["t", "uplanet"],               // UPlanet ecosystem tag
    ["cookie", "youtube.com"],         // Cookie domain used (optional)
    ["cookie", "leboncoin.fr"]       // Multiple cookie domains supported
  ],
  "content": "{WORKFLOW_JSON}"
}
```

**Workflow JSON Structure:**

```jsonc
{
  "name": "YouTube to Blog Workflow",
  "description": "Auto-generate blog posts from YouTube liked videos",
  "version": "1.0.0",
  "nodes": [
    {
      "id": "source_1",
      "type": "cookie_scraper",
      "name": "YouTube Scraper",
      "position": { "x": 100, "y": 100 },
      "parameters": {
        "domain": "youtube.com",
        "scraper": "youtube.com.sh",
        "output": "liked_videos"
      }
    },
    {
      "id": "filter_1",
      "type": "filter",
      "name": "Filter Recent",
      "position": { "x": 300, "y": 100 },
      "parameters": {
        "field": "published_at",
        "operator": ">",
        "value": "7 days ago"
      },
      "connections": {
        "input": ["source_1"]
      }
    },
    {
      "id": "process_1",
      "type": "ai_question",
      "name": "Generate Summary",
      "position": { "x": 500, "y": 100 },
      "parameters": {
        "prompt": "Summarize this video: {video_title}",
        "model": "gemma3:12b",
        "slot": 0
      },
      "connections": {
        "input": ["filter_1"]
      }
    },
    {
      "id": "output_1",
      "type": "nostr_publish",
      "name": "Publish Article",
      "position": { "x": 700, "y": 100 },
      "parameters": {
        "kind": 30023,
        "tags": ["t", "blog", "t", "youtube"]
      },
      "connections": {
        "input": ["process_1"]
      }
    }
  ],
  "triggers": [
    {
      "type": "schedule",
      "cron": "0 2 * * *"  // Daily at 2 AM
    },
    {
      "type": "manual",
      "tag": "#cookie"      // Trigger via #cookie tag in message
    }
  ]
}
```

### Workflow Execution Request (kind:31901)

A **regular event** (kind 31901) requests execution of a workflow.

```jsonc
{
  "kind": 31901,
  "tags": [
    ["e", "<workflow_event_id>"],   // Reference to kind 31900 workflow
    ["t", "cookie-workflow-exec"],   // Execution request tag
    ["cookie", "youtube.com"]        // Cookie domain to use
  ],
  "content": "{EXECUTION_PARAMETERS_JSON}"
}
```

**Execution Parameters:**

```jsonc
{
  "workflow_id": "<workflow_event_id>",
  "trigger": "manual",              // "manual" | "schedule" | "event"
  "parameters": {
    "override": {
      "filter_1": {
        "value": "1 day ago"         // Override filter value
      }
    }
  }
}
```

### Workflow Execution Result (kind:31902)

A **regular event** (kind 31902) stores workflow execution results.

```jsonc
{
  "kind": 31902,
  "tags": [
    ["e", "<workflow_event_id>"],   // Reference to workflow definition
    ["e", "<execution_request_id>"], // Reference to execution request
    ["t", "cookie-workflow-result"], // Result tag
    ["status", "success"]            // "success" | "failed" | "partial"
  ],
  "content": "{EXECUTION_RESULT_JSON}"
}
```

## Node Types

### Data Sources

#### `cookie_scraper`
- **Purpose**: Execute domain-specific scraper using uploaded cookies
- **Parameters**:
  - `domain`: Cookie domain (e.g., "youtube.com")
  - `scraper`: Scraper script name (e.g., "youtube.com.sh")
  - `output`: Output variable name
- **Output**: JSON array of scraped data

#### `nostr_query`
- **Purpose**: Query NOSTR relay for events
- **Parameters**:
  - `kind`: Event kind to query
  - `author`: Author pubkey (optional)
  - `tags`: Tag filters
  - `limit`: Result limit
- **Output**: Array of NOSTR events

### Processing Nodes

#### `ai_question`
- **Purpose**: Ask AI question using Ollama
- **Parameters**:
  - `prompt`: Question prompt (supports {variable} substitution)
  - `model`: Ollama model name
  - `slot`: Memory slot (0-12)
- **Output**: AI response text

#### `image_recognition`
- **Purpose**: Recognize image using PlantNet
- **Parameters**:
  - `image_url`: Image URL (from input or variable)
  - `latitude`: GPS latitude
  - `longitude`: GPS longitude
- **Output**: PlantNet recognition JSON

#### `image_generation`
- **Purpose**: Generate image using ComfyUI
- **Parameters**:
  - `prompt`: Image generation prompt
  - `output_path`: uDRIVE output path
- **Output**: Generated image URL

#### `filter`
- **Purpose**: Filter data based on conditions
- **Parameters**:
  - `field`: Field to filter
  - `operator`: ">", "<", "==", "!=", "contains", "regex"
  - `value`: Filter value
- **Output**: Filtered data array

#### `transform`
- **Purpose**: Transform data structure
- **Parameters**:
  - `mapping`: Field mapping JSON
  - `format`: Output format
- **Output**: Transformed data

### Output Nodes

#### `nostr_publish`
- **Purpose**: Publish NOSTR event
- **Parameters**:
  - `kind`: Event kind
  - `tags`: Tag array
  - `content_template`: Content template with {variables}
- **Output**: Published event ID

#### `udrive_save`
- **Purpose**: Save data to uDRIVE
- **Parameters**:
  - `path`: uDRIVE path (e.g., "Documents/workflow_output.json")
  - `format`: "json" | "text" | "csv"
- **Output**: Saved file path

#### `email_send`
- **Purpose**: Send email notification
- **Parameters**:
  - `to`: Recipient email
  - `subject`: Email subject
  - `template`: Email template
- **Output**: Email sent confirmation

## Workflow Execution

### Trigger Methods

1. **Manual Trigger** (`#cookie` tag):
   ```
   #BRO #cookie <workflow_name_or_id>
   ```
   - User sends message with `#cookie` tag and workflow identifier
   - `1.sh` detects `#cookie` tag and passes to `UPlanet_IA_Responder.sh`
   - `UPlanet_IA_Responder.sh` detects `#cookie` tag and calls `cookie_workflow_engine.sh`
   - `cookie_workflow_engine.sh` loads workflow from NOSTR (kind 31900)
   - Workflow nodes executed in sequence
   - Execution result returned to user via NOSTR message

2. **Scheduled Trigger**:
   - `NOSTRCARD.refresh.sh` checks for scheduled workflows
   - Executes workflows based on cron expressions

3. **Event Trigger**:
   - Workflow triggered by specific NOSTR events
   - Example: New video liked → trigger blog generation workflow

### Execution Flow

```
1. User creates workflow in n8n.html interface
   ↓
2. Workflow Definition (kind 31900) stored on NOSTR
   ↓
3. User sends message: #BRO #cookie <workflow_id>
   ↓
4. 1.sh detects #cookie tag and passes to UPlanet_IA_Responder.sh
   ↓
5. UPlanet_IA_Responder.sh detects #cookie tag
   ↓
6. cookie_workflow_engine.sh loads workflow from NOSTR
   ↓
7. Workflow engine executes nodes in sequence:
   - cookie_scraper → executes domain.sh script
   - filter → filters data
   - ai_question → processes with Ollama
   - nostr_publish → publishes results
   ↓
8. Execution result returned to user via NOSTR message
```

## Integration with Cookie System

Workflows can access cookie-based scrapers:

```jsonc
{
  "id": "source_1",
  "type": "cookie_scraper",
  "parameters": {
    "domain": "youtube.com",
    "scraper": "youtube.com.sh",
    "output": "videos"
  }
}
```

The system automatically:
- Finds `.youtube.com.cookie` in user's MULTIPASS directory
- Executes `youtube.com.sh` with cookie file
- Returns scraped data to workflow

## Example Workflows

### 1. YouTube to Blog Auto-Post

```jsonc
{
  "name": "YouTube Blog Generator",
  "nodes": [
    {
      "type": "cookie_scraper",
      "parameters": { "domain": "youtube.com" }
    },
    {
      "type": "filter",
      "parameters": { "field": "liked_at", "operator": ">", "value": "1 day ago" }
    },
    {
      "type": "ai_question",
      "parameters": { "prompt": "Write a blog post about: {video_title}" }
    },
    {
      "type": "nostr_publish",
      "parameters": { "kind": 30023, "tags": [["t", "blog"], ["t", "youtube"]] }
    }
  ]
}
```

### 2. Leboncoin Alert System

```jsonc
{
  "name": "Leboncoin Price Alert",
  "nodes": [
    {
      "type": "cookie_scraper",
      "parameters": { "domain": "leboncoin.fr" }
    },
    {
      "type": "filter",
      "parameters": { "field": "price", "operator": "<", "value": 100 }
    },
    {
      "type": "email_send",
      "parameters": { "to": "user@email.com", "subject": "New cheap item found!" }
    }
  ]
}
```

## Tags

### Standard Tags

- `d`: Workflow identifier (for kind 31900)
- `e`: Event reference (workflow ID, execution request ID)
- `t`: Type tags (`cookie-workflow`, `cookie-workflow-exec`, `cookie-workflow-result`)
- `cookie`: Cookie domain used (e.g., `["cookie", "youtube.com"]`)
- `status`: Execution status (`success`, `failed`, `partial`)

### Custom Tags

- `workflow_name`: Human-readable workflow name
- `workflow_version`: Version string
- `trigger_type`: `manual` | `schedule` | `event`

## Client Behavior

### Workflow Builder Interface

Clients should provide:
- **Visual node editor** (drag-and-drop)
- **Node configuration forms**
- **Connection lines** between nodes
- **Workflow validation**
- **Save/load workflows** from NOSTR

### Workflow Execution

Clients should:
- **Monitor execution requests** (kind 31901)
- **Display execution progress**
- **Show execution results** (kind 31902)
- **Handle errors gracefully**

## Relay Behavior

Relays should:
- **Store workflow definitions** (kind 31900) as replaceable events
- **Store execution requests** (kind 31901) as regular events
- **Store execution results** (kind 31902) as regular events
- **Index by cookie domain** for efficient querying

## Security Considerations

- **Cookie access**: Only workflow owner can access their cookies
- **Workflow privacy**: Workflows stored on user's own relay
- **Execution validation**: Verify workflow ownership before execution
- **Rate limiting**: Prevent workflow execution abuse

## Implementation

### Frontend Interface
- **n8n.html**: Visual workflow builder interface
  - Location: `UPassport/templates/n8n.html`
  - Access: `http://localhost:54321/n8n` or `https://u.copylaradio.com/n8n`
  - Features:
    - Drag-and-drop node editor
    - Node configuration forms
    - Workflow save/load from NOSTR
    - Visual connection lines

### Backend Components
- **cookie_workflow_engine.sh**: Workflow execution engine
  - Location: `Astroport.ONE/IA/cookie_workflow_engine.sh`
  - Executes workflow nodes in sequence
  - Handles cookie scrapers, AI processing, filters, and outputs

- **UPlanet_IA_Responder.sh**: Main IA responder with #cookie tag support
  - Detects `#cookie` tag in messages
  - Calls `cookie_workflow_engine.sh` for execution
  - Returns results to user

### API Routes
- **GET /n8n**: Serves n8n.html workflow builder interface
  - Location: `UPassport/54321.py`

## Compatibility

- **Requires**: NIP-42 (Authentication), NIP-101 (UPlanet Identity)
- **Uses**: Cookie System (see COOKIE_SYSTEM.md)
- **Integrates**: UPlanet_IA_Responder.sh for execution
- **Frontend**: Bootstrap 5, NostrTools.js
- **Backend**: Bash scripts, Python (question.py, nostr_send_note.py)

---

**Version**: 1.0.0  
**Status**: Draft  
**Author**: UPlanet/Astroport.ONE Team  
**License**: AGPL-3.0

