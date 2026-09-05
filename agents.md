# NIP-YYY: Standardized LLM/AI Agent Communication Protocol

**Abstract:** This NIP proposes a standardized protocol for Large Language Model (LLM) and AI Agent communication on the Nostr network. It aims to build on and replace many aspects of [NIP-90](./90.md) by providing a more comprehensive and robust specification without the extra bloat. This proposal standardizes communication patterns, LLM parameter exchange, context and state management, service discovery, and secure payment/job contract mechanisms. The goal is to foster a vibrant, interoperable ecosystem of user-agent and agent-agent interactions and transactions.

**Replaces:** [NIP-90](./90.md), specifically kinds [5000](https://github.com/nostr-protocol/data-vending-machines/blob/master/kinds/5000.md)-[5250](https://github.com/nostr-protocol/data-vending-machines/blob/master/kinds/5250.md) content generation services, in general.

**Kind:** `ZZZZ` - *TBD*.

## Terminology

For clarity and consistency, this NIP defines the following terms:

*   **AI (Agent):** A Nostr `pubkey` (typically an automated agent, service, or bot) offering LLM text, multi-modal generation, or other AI-powered services.
    *   *Why:* Identifies the service provider on Nostr.
*   **Client:** A Nostr `pubkey` (user or another service) requesting services from an AI Agent.
    *   *Why:* Identifies the service requestor on Nostr.
*   **Task Request:** A Nostr event of `kind ZZZZ` sent by a Client to an AI Agent, initiating an AI task.
    *   *Why:* Standardizes how AI tasks are requested on Nostr.
*   **Task Result:** A Nostr event of `kind ZZZZ` sent by an AI Agent in response to a Task Request, containing the output or an error.
    *   *Why:* Standardizes how AI task results are delivered on Nostr.
*   **Agent Card:** A JSON metadata file, hosted at a publicly accessible URL, describing an AI Agent's capabilities, supported NIPs, interaction protocols, pricing, authentication requirements, and example usage.
    *   *Why:* Enables discovery, interoperability, and clear communication of an agent's services.
*   **Context:** Information shared between Client and AI Agent necessary for task completion, including past interactions, session state, and specific instructions, messages, prompts, and/or other data.
    *   *Why:* Essential for coherent, relevant, and contextually appropriate AI responses, especially in multi-turn conversations.
*   **Session:** A series of related interactions between a Client and an AI Agent, identified by a unique Session ID.
    *   *Why:* Enables stateful conversations and efficient context management.

## Motivation

The Nostr protocol's decentralized nature is well-suited for creating open marketplaces of services, including those powered by LLMs and AI. [NIP-90](./90.md) provided an initial generic framework for "data vending machines (DVMs)," but specific standardization for common LLM/AI agent interaction patterns and language model parameters is needed. Current approaches lack clarity and consistency in:

*   Standardized representation of LLM tasks and parameters.
*   Efficient context and state management for multi-turn conversations.
*   Discoverability and advertisement of AI agent capabilities.
*   Secure and reliable payment and job contract mechanisms.
*   Consistent error handling and communication.

This NIP addresses these gaps by:
*   Defining a dedicated Nostr `kind` for LLM/AI requests and responses.
*   Standardizing tag usage for prompts, parameters, session management, payments, and results.
*   Introducing "Agent Cards" for service discovery and capability description.
*   Emphasizing secure payment mechanisms using Lightning Network BOLT11 invoices.
*   Providing guidelines for robust error handling, security, and privacy.

By standardizing these elements, this NIP aims to benefit both users seeking AI assistance and AI agents offering services, fostering innovation and growth within the Nostr AI ecosystem.

## Event Structure

This NIP defines a single event `kind: ZZZZ` for both Client requests and AI Agent responses. The direction and nature of the message are determined by the presence of specific tags and the relationship between the `pubkey` of the event and the referenced `p` tags.

### Common Tags (for Requests and Results)

*   `["p", "<agent_pubkey>"]`: The `pubkey` of the AI Agent. REQUIRED in requests. Agents MAY include this in results, echoing the request.
*   `["p", "<client_pubkey>"]`: The `pubkey` of the Client. OPTIONAL in requests (agent can infer from event `pubkey`). REQUIRED in results directed to a specific client.
*   `["e", "<request_event_id>"]`: In a Task Result, this tag MUST be present and reference the `id` of the corresponding Task Request event.
*   `["t", "<session_id>"]`: A unique identifier (RECOMMENDED: UUID v4) for a conversation or session. Allows the agent to maintain state across multiple events. Clients SHOULD generate this ID for the first request in a session and reuse it for subsequent requests in that session.
    *   *Rationale:* Replaces sending entire context in every event, enabling efficient stateful interactions.
*   `["nip_version", "YYYYMMDD"]`: Version of this NIP specification the event adheres to (e.g., "20250520"). Allows for future upgrades.

### Task Request Tags (Client to Agent)

In addition to Common Tags, a Task Request event MUST include:

*   `["request", "<json_string>"]`: A JSON string detailing the task. The structure of this JSON object SHOULD align with common API standards (e.g., OpenAI's `/chat/completions` format) to promote interoperability.
    *   **RECOMMENDED JSON Structure:**
        ```json
        {
          "model": "string", // Optional: Requested model identifier (agent specific)
          "messages": [ // REQUIRED: Conversation history or prompt
            {"role": "user" | "assistant" | "system", "content": "string | object"}
            // For multi-modal: "content": [{"type": "text", "text": "..."}, {"type": "image_url", "image_url": {"url": "data:image/png;base64,..." | "http://..."}}]
          ],
          "response_format": { // Optional: Desired output format
            "type": "text" | "json_object" // etc.
          },
          "parameters": { // Optional: LLM parameters
            "temperature": 0.7,
            "max_tokens": 512,
            // Other common or agent-specific parameters
          },
          "tools": [ // Optional: Tools the agent may use
            // Tool definitions
          ]
        }
        ```
    *   *Note:* `parameters` here are distinct from the top-level Nostr event tags like `#temperature`. This allows for namespacing and rich parameter structures. Agent Cards (see below) define supported models, parameters, and tools.
*   `["output_format", "<mime_type>"]`: OPTIONAL. Specifies the desired MIME type of the primary output (e.g., `text/markdown`, `application/json`, `image/png`). This can also be specified within the `request` JSON's `response_format` field. If both are present, the one in the `request` JSON is preferred.
*   `["contract", "<json_string_or_url>"]`: OPTIONAL. A JSON string or a URL pointing to a JSON file describing the job contract (scope, deliverables, explicit payment terms beyond simple invoice).
    *   **Example Contract JSON:**
        ```json
        {
          "scope": "Summarize the provided text into 5 bullet points.",
          "deliverables": ["Markdown formatted summary."],
          "payment_amount_sats": 1000,
          "settlement_terms": "Payment upon successful delivery and acceptance (if applicable).",
          "dispute_resolution": "See agent's policy at <url>."
        }
        ```
*   `["bolt11", "<ln_invoice>"]`: OPTIONAL. A BOLT11 Lightning invoice for pre-payment if the agent requires it.

### Task Result Tags (Agent to Client)

In addition to Common Tags (especially `e` and `p` pointing to client), a Task Result event MUST include one of the following:

*   `["result", "<json_string>"]`: A JSON string containing the successful result from the AI Agent.
    *   **RECOMMENDED JSON Structure (aligning with OpenAI):**
        ```json
        {
          "id": "string", // Agent-generated ID for this completion
          "object": "chat.completion", // or other relevant object type
          "created": 1677652288, // Unix timestamp
          "model": "string", // Model used for the completion
          "choices": [
            {
              "index": 0,
              "message": {"role": "assistant", "content": "string | object"},
              "finish_reason": "stop" | "length" | "tool_calls"
            }
          ],
          "usage": { // Optional: Token usage
            "prompt_tokens": 56,
            "completion_tokens": 31,
            "total_tokens": 87
          }
          // Other result fields like tool_calls
        }
        ```
    *   The actual `content` (e.g., text, image data if not in JSON) MAY be in the Nostr event's `content` field if appropriate, or referenced if large. The `result` JSON should clarify where to find the primary output.
*   `["error", "<json_string>"]`: A JSON string describing an error if the task could not be completed.
    *   **RECOMMENDED JSON Structure:**
        ```json
        {
          "code": "string", // Standardized error code (see Error Handling section)
          "message": "string", // Human-readable error message
          "details": {} // Optional: Additional error-specific details
        }
        ```

And MAY include:

*   `["bolt11", "<ln_invoice>"]`: OPTIONAL. If payment is due post-service, the agent includes a BOLT11 invoice.
*   `["cost", "<json_string>"]`: OPTIONAL. A JSON string detailing the cost breakdown of the service provided.
    *   **RECOMMENDED JSON Structure:**
        ```json
        {
          "input_tokens": 120,
          "output_tokens": 350,
          "price_sats": 500,
          "currency": "sats", // Default "sats", could be other if specified in Agent Card
          "breakdown": [
            {"item": "model_usage", "cost_sats": 450},
            {"item": "tool_xyz", "cost_sats": 50}
          ]
        }
        ```

## Agent Cards

To facilitate discovery and interoperability, AI Agents SHOULD publish an "Agent Card." This is a JSON file hosted at a publicly accessible URL, linked from the agent's [NIP-05](./05.md) identifier or a dedicated [NIP-89](./89.md)-style announcement (e.g., kind `3ZZZZ`, where `ZZZZ` is the NIP kind). Agent Cards offer a much more detailed and reliable way to describe an agent's details, parameters, and custom properties, without the need to perpetually broadcast [NIP-89](./89.md) announcements.

Agent Cards MUST be versioned (e.g., using a `version` field or SemVer in the URL). Clients SHOULD cache Agent Cards but periodically refresh them.

**Agent Card JSON Structure (Example):**

```json
{
  "nip_yyy_version": "20250520", // Version of this NIP it adheres to
  "agent_card_version": "1.1.0", // Version of this card
  "name": "My Awesome AI Assistant",
  "pubkey": "<agent_nostr_pubkey>",
  "description": "Provides text summarization and translation services.",
  "capabilities": {
    "tasks": [
      {"type": "summarization", "description": "Summarizes text up to 5000 words."},
      {"type": "translation", "description": "Translates between EN, ES, FR."}
    ],
    "supported_models": ["gpt-3.5-turbo-instruct", "custom-summarizer-v2"],
    "supported_input_formats": ["text/plain", "text/markdown"],
    "supported_output_formats": ["text/plain", "text/markdown", "application/json"],
    "max_context_tokens": 4096,
    "context_refresh_strategy": "summarize_last_5_turns" // e.g.
  },
  "interaction_protocols": [ // How to interact (beyond this NIP, if any)
    {"type": "nostr_nip_yyy", "kind": "ZZZZ"},
    {"type": "http_api", "endpoint_url": "https://api.exampleagent.com/v1", "docs_url": "..."}
  ],
  "llm_parameters_schema": { // JSON schema or link to one for supported `request.parameters`
    "$ref": "https://api.exampleagent.com/v1/params_schema.json"
  },
  "pricing": {
    "default_currency": "sats",
    "models": [
      {
        "id": "gpt-3.5-turbo-instruct",
        "input_cost_per_1k_tokens": 10,
        "output_cost_per_1k_tokens": 30
      }
    ],
    "payment_methods_accepted": ["bolt11_prepaid", "bolt11_postpaid", "escrow_hodl_optional"],
    "escrow_details": { // If escrow is supported
      "preferred_escrow_providers": ["<mostro_pubkey>", "https://escrow.service/api"],
      "min_escrow_value_sats": 5000
    }
  },
  "authentication": { // How the agent authenticates clients if needed
    "type": "none" // or "nip98", etc.
  },
  "rate_limits": {
    "anonymous_requests_per_hour": 10,
    "authenticated_requests_per_hour": 100,
  },
  "terms_of_service_url": "https://exampleagent.com/tos",
  "privacy_policy_url": "https://exampleagent.com/privacy",
  "example_request": { // A full Nostr event example for this agent
    "kind": "ZZZZ",
    "pubkey": "<client_pubkey>",
    "created_at": 0,
    "tags": [
      ["p", "<agent_nostr_pubkey>"],
      ["request", "{\"messages\":[{\"role\":\"user\",\"content\":\"Summarize this...\"}], \"model\":\"custom-summarizer-v2\"}"]
    ],
    "content": "This is the text to summarize...",
    "id": "...",
    "sig": "..."
  }
}
```

*Frameworks like Open Agentic Schema Framework (OASF) or Agents JSON can provide further inspiration for Agent Card structures.*

## LLM/AI Parameter Standardization

*   Parameters specific to LLM calls (e.g., temperature, max_tokens, top_p) SHOULD be included within the `["request", "<json_string>"]` tag's JSON payload, under a `parameters` key.
*   Agent Cards MUST define or link to a schema (e.g., JSON Schema) for the `parameters` they accept, including data types, ranges, and default values.
*   Agents SHOULD adopt common parameter names where functionality aligns (e.g., `temperature`, `max_tokens`).
*   Naming conventions for proprietary model files/identifiers (e.g., `Llama-3-8b-Instruct-Q4_K_M.gguf`) can be useful for clients but are agent-specific and should be listed in the Agent Card.

## Context and State Management

*   The `["t", "<session_id>"]` tag is CRUCIAL for managing state across multiple interactions. Clients are responsible for generating and reusing session IDs.
*   AI Agents are responsible for storing and retrieving context based on the `session_id`. This may involve in-memory storage, external databases, or even storing encrypted context in Nostr events (if small enough and privacy-preserving).
*   Agent Cards MAY specify their context window limits (e.g., `max_context_tokens`) and context refresh strategies (e.g., "truncate FIFO," "summarize conversation every N turns").
*   Clients SHOULD be mindful of agent context limits and manage the information sent accordingly.

## Payment, Job Contracts, and Escrow

*   **Direct Payment:**
    *   Pre-payment: Client includes a `["bolt11", "<invoice>"]` in the Task Request.
    *   Post-payment: Agent includes a `["bolt11", "<invoice>"]` in the Task Result.
    *   The `["cost", "<json_string>"]` tag in the Task Result provides transparency.
*   **Job Contracts:** The `["contract", "<json_string_or_url>"]` tag allows for defining scope, deliverables, and payment terms beyond a simple invoice.
*   **Lightning Network Escrow:** For higher-value or trust-sensitive tasks, escrow is STRONGLY RECOMMENDED.
    *   Agents supporting escrow SHOULD specify this in their Agent Card, including preferred escrow mechanisms (e.g., HODL invoices, PTLCs) and potentially trusted escrow service providers (e.g., Mostro - `https://mostro.network/`).
    *   The job contract (`["contract"]` tag) can specify escrow terms, including the escrow agent's `pubkey` and fees.
    *   The escrow process might involve a 2-of-3 multisig or interaction with an escrow service via Nostr messages. (Detailed escrow NIPs may be referenced here in the future).
*   **Reputation Systems:** While this NIP doesn't define a specific reputation system, agents and clients are encouraged to participate in emerging Nostr-based reputation protocols. Agent Cards MAY link to reputation profiles. Verifiable behavior logs (e.g., publishing anonymized success/failure rates) can build trust.
*   **Payment Splitting:** For tasks involving multiple agents, the primary agent coordinating the task is responsible for handling payments to sub-agents. The main contract may specify this.

## Discovery of AI Agents

*   **Agent Cards:** As described above, linked from [NIP-05](./05.md) or a dedicated [NIP-89](./89.md) announcement.
*   **[NIP-89](./89.md) Application Handlers:** Agents SHOULD advertise their support for this NIP (`kind ZZZZ`) via [NIP-89](./89.md), allowing clients to discover them.
*   **Dedicated Announcement Kind:** A kind like `3ZZZZ` (e.g., `37001` if `ZZZZ` is `7001`) can be used for agents to announce their Agent Card URL and key capabilities using standardized tags (e.g., `["capability", "text_summarization"]`, `["capability", "image_generation"]`).
*   **Searchable Tags:** Using standardized tags in these announcements facilitates client-side searching and filtering.
*   **Directories:** Services like Nostrbook MAY be leveraged to list AI agents and their Agent Cards.

## Error Handling

AI Agents MUST use the `["error", "<json_string>"]` tag in their Task Result event if a task fails. The JSON string SHOULD contain:

*   `code`: A standardized error code.
*   `message`: A human-readable error message.
*   `details`: OPTIONAL. An object with additional information specific to the error.

**Standard Error Codes (Inspired by HTTP, but extensible):**

*   `BAD_REQUEST` (400 equivalent): Malformed request, invalid JSON, missing required fields.
*   `UNAUTHORIZED` (401 equivalent): Authentication failed or required but not provided.
*   `PAYMENT_REQUIRED` (402 equivalent): Payment is required to process the request.
*   `FORBIDDEN` (403 equivalent): Client is not allowed to access this resource/perform this action.
*   `NOT_FOUND` (404 equivalent): Requested model or resource not found.
*   `RATE_LIMIT_EXCEEDED` (429 equivalent): Client has sent too many requests.
*   `AGENT_ERROR` (500 equivalent): An unexpected error occurred on the agent's side.
*   `MODEL_ERROR`: The underlying LLM or AI model reported an error.
*   `SERVICE_UNAVAILABLE` (503 equivalent): The agent is temporarily overloaded or down for maintenance.
*   `TIMEOUT`: The request timed out.
*   `INSUFFICIENT_FUNDS`: For pre-paid services, if payment was insufficient.
*   `CONTENT_TOO_LARGE`: Input content exceeds agent's limits.
*   `INVALID_PARAMETER`: A specified parameter in the request is invalid or unsupported.

## Security Considerations

*   **Authentication:** Agents MAY require client authentication (e.g., [NIP-98](./98.md)) for certain operations or to access higher rate limits. This SHOULD be specified in the Agent Card.
*   **Input Validation & Sanitization:** Agents SHOULD validate and sanitize all inputs from clients to prevent prompt injection, denial-of-service, and other attacks.
*   **Output Sanitization:** Agents SHOULD sanitize outputs to prevent the generation of malicious content or exposure of sensitive information.
*   **Resource Limits:** Agents SHOULD implement resource limits (CPU, memory, time) for processing requests to prevent abuse.
*   **Rate Limiting:** Agents SHOULD implement rate limiting based on `pubkey`, IP address (if applicable), or other factors. Details MAY be in the Agent Card.
*   **Encryption:** For sensitive data, communication SHOULD utilize end-to-end encryption (e.g., [NIP-04](./04.md)/[NIP-17](./17.md)/[NIP-44](./44.md) between client and agent for the content of `request` and `result` tags if not already encrypted within the payload).
*   **Permissions:** Agents that can perform actions (e.g., call tools, interact with other services) SHOULD operate under the principle of least privilege.
*   **Client-Side Caution:** Clients SHOULD be cautious when interacting with unknown or untrusted AI Agents. Verify Agent Cards and look for community trust signals.
*   **Session Security:** Session IDs (`t` tag) are not inherently secret. Do not embed sensitive capability-granting tokens directly in them. Use established authentication methods for sensitive operations within a session.

## Privacy Considerations

*   **Data Minimization:** Agents SHOULD only request and store data necessary for providing the service.
*   **Transparency:** Agents SHOULD clearly state their data handling practices in their privacy policy, linked from the Agent Card.
*   **Data Deletion:** Clients SHOULD have a way to request deletion of their data, and agents SHOULD comply as per their privacy policy.
*   **Anonymization/Pseudonymization:** Agents SHOULD consider anonymizing or pseudonymizing data used for logging or analytics.

## Removed Features (from [NIP-90](./90.md) context)

*   **Job Chaining:** Removed to simplify the protocol. Complex workflows can be orchestrated by clients by making sequential requests, linked by standard tags, `session_id`s, and timestamps.
*   **Bid System:** Removed. Pricing is made explicit via Agent Cards and the `cost` tag, or negotiated through contracts. This reduces complexity and latency. Simple overpayments MAY be used to incentivize agents to complete tasks during high demand.

## Extensibility

This NIP is designed to be extensible:
*   New tags can be proposed for future needs.
*   The JSON structures within `request`, `result`, `error`, `contract`, and `cost` tags can evolve, ideally with backward compatibility or clear versioning in Agent Cards.
*   Agent Cards themselves are versioned and can be extended with new fields.

## Example Flow (Summarization Task)

1.  **Client Discovers Agent:** Client finds an agent supporting `kind ZZZZ` via [NIP-89](./89.md) or a directory, and fetches its Agent Card.
2.  **Client Constructs Request:**
    ```json
    // Nostr Event
    {
      "kind": "ZZZZ",
      "pubkey": "<client_pubkey>",
      "created_at": 1678886400,
      "tags": [
        ["p", "<agent_pubkey>"],
        ["t", "session-uuid-123"],
        ["request", "{\"messages\":[{\"role\":\"user\",\"content\":\"Please summarize this article for me.\"}], \"model\":\"text-davinci-003\", \"parameters\":{\"max_tokens\":150}}"],
        ["output_format", "text/markdown"],
        ["nip_version", "20250520"]
      ],
      "content": "Nostr is a simple, open protocol that enables global, decentralized, and censorship-resistant social media. ... (long article text) ...",
      "id": "<request_event_id>",
      "sig": "..."
    }
    ```
3.  **Agent Processes and Responds:**
    ```json
    // Nostr Event
    {
      "kind": "ZZZZ",
      "pubkey": "<agent_pubkey>",
      "created_at": 1678886405,
      "tags": [
        ["p", "<client_pubkey>"],
        ["e", "<request_event_id>"],
        ["t", "session-uuid-123"],
        ["result", "{\"id\":\"comp-xyz\",\"object\":\"text_completion\",\"created\":1678886405,\"model\":\"text-davinci-003\",\"choices\":[{\"text\":\"Nostr is a simple, open protocol for decentralized social media.\",\"index\":0,\"finish_reason\":\"length\"}],\"usage\":{\"prompt_tokens\":500,\"completion_tokens\":150,\"total_tokens\":650}}"],
        ["cost", "{\"input_tokens\":500,\"output_tokens\":150,\"price_sats\":65,\"currency\":\"sats\"}"],
        ["nip_version", "20250520"]
      ],
      "content": "", // Result is in the 'result' tag
      "id": "<result_event_id>",
      "sig": "..."
    }
    ```

## References

*   [NIP-01](./01.md): Basic protocol flow
*   [NIP-04](./04.md): Encrypted Direct Message
*   [NIP-05](./05.md): Mapping Nostr keys to DNS-based internet identifiers
*   [NIP-17](./17.md): Encrypted Direct Messages v2
*   [NIP-44](./44.md): Encrypted Direct Messages v3
*   [NIP-89](./89.md): Recommended Application Handlers
*   [NIP-90](./90.md): Data Vending Machines
*   [NIP-98](./98.md): HTTP Auth
*   [Agent Protocol (LangChain)](https://github.com/langchain-ai/agent-protocol)
*   [Open Agentic Schema Framework (OASF)](https://github.com/agntcy/oasf)
*   [Agents JSON](https://github.com/wild-card-ai/agents-json)
*   [Mostro (Lightning Escrow)](https://github.com/MostroP2P)
*   [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
*   [JSON Schema](https://json-schema.org/)
