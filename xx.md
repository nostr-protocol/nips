NIP-XX
======

LLM Stuff
---------

`draft` `optional`

This NIP defines kinds related to LLM stuff.

# Prompt diffs
 a way to publish LLM prompts that describe modifications to software projects. Where code diffs usually expire in a couple of releases and require constant upkeep,tThese "prompt diffs" enable way longer-lasting, shareable software modifications.

## Abstract

A prompt diff is a Nostr event that contains instructions for an LLM to modify a codebase. Prompt diffs describe the intent and let LLMs handle the implementation details.

## Event Structure

```json
{
   "kind": 496,
   "content": "<human-readable-description>",
   "tags": [
       ["title", "<modification-title>"],
       ["description", "<prompt>"],
       ["r", "<git-repository-url>"],
       ["t", "<tag>"],
       ["model", "<suggested-llm-model>"],
   ]
}
Required Tags

title - Short title describing the modification
r - Git repository URL this applies to
prompt - The actual prompt containing modification instructions

## Optional Tags

t - Hashtags for categorization (#security, #performance, #feature-removal, etc.)
model - Suggested LLM model that successfully applies this modification

Example: Remove Edit Functionality from Amethyst
json{
    "kind": 496,
    "pubkey": "...",
    "created_at": 1234567890,
    "content": "Removes the ability to edit kind:1 text notes in Amethyst",
    "tags": [
        ["title", "Remove Kind:1 Edit Functionality"],
        ["description", "Remove all edit functionality for kind:1 events from the Amethyst Android app. This includes:\n\n1. Find and remove the edit button/icon from the note options menu (three dots menu) for kind:1 events\n2. Remove any edit action handlers, click listeners, or menu item cases related to editing kind:1 notes\n3. Remove or disable any UI components like EditPostView or EditPostDialog that are used for editing existing posts\n4. Keep the edit functionality for other event kinds if they exist (like kind:30023 long-form content)\n5. Remove any edit-related permissions checks or business logic specific to kind:1 events\n6. Clean up any unused imports or resources that were only used for kind:1 editing\n7. Do not remove the ability to create new kind:1 posts, only the ability to edit existing ones\n8. Look for edit functionality in:\n   - Note composition screens\n   - Note option menus  \n   - ViewModels handling note actions\n   - Any files with names containing 'Edit' and 'Note' or 'Post'\n\nMake sure the app still compiles and runs after these changes. The diff should be clean with no leftover dead code."],
        ["r", "https://github.com/vitorpamplona/amethyst"],
        ["t", "noedits"],
        ["t", "amethyst"],
        ["model", "claude-3.5-sonnet"],
    ],
    "sig": "..."
}

# Implementation Guidelines
### For Prompt Authors

Write clear, specific prompts that describe intent rather than implementation
Include context about why changes should be made in certain locations
Specify what should NOT be changed to prevent over-modification
Add test commands to verify the modification works
Test prompts against the current main branch of the repository

# Security Considerations

* Always review LLM-generated changes before applying
* Prompt Injection Protection: Clients MUST sanitize repository file contents before passing to LLMs to prevent malicious code comments or documentation from hijacking the modification intent
