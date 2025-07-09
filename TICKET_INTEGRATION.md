# Ticket Integration Feature

This document describes the new ticket integration feature added to the Git Client Raycast extension.

## Overview

The ticket integration feature allows users to automatically extract ticket numbers from git commit messages and quickly open corresponding links in their task tracking system (e.g., JIRA, GitHub Issues, Linear, etc.).

## Configuration

### Preferences Settings

Two new preference parameters have been added to the extension:

#### 1. Ticket Regex Pattern
- **Name**: `ticketRegex`
- **Type**: Text field
- **Required**: No
- **Default**: Empty
- **Placeholder**: `([A-Z]+-\\d+)`
- **Description**: Regular expression to extract ticket numbers from commit messages

**Examples:**
- JIRA tickets: `([A-Z]+-\\d+)` → matches `PROJ-123`, `TASK-456`
- GitHub issues: `#(\\d+)` → matches `#123`, `#456`
- Linear tickets: `([A-Z]{3}-\\d+)` → matches `ABC-123`, `XYZ-456`

#### 2. Ticket URL Template
- **Name**: `ticketUrlTemplate`
- **Type**: Text field
- **Required**: No
- **Default**: Empty
- **Placeholder**: `https://company.atlassian.net/browse/@key`
- **Description**: URL template for ticket links. Use `@key` as placeholder for the extracted ticket number

**Examples:**
- JIRA: `https://company.atlassian.net/browse/@key`
- GitHub: `https://github.com/owner/repo/issues/@key`
- Linear: `https://linear.app/company/issue/@key`

## Usage

### Setup
1. Open Raycast preferences for the Git Client extension
2. Configure the "Ticket Regex Pattern" to match your ticket format
3. Configure the "Ticket URL Template" with your task tracker URL format

### In Action
1. Navigate to any repository's commit view
2. For commits that contain ticket references matching your regex pattern, you'll see an additional action
3. The action appears as "Open Ticket [TICKET-KEY]" with a bug icon
4. Press `Cmd+T` or click the action to open the ticket URL in your default browser

## Implementation Details

### Files Modified
- `package.json` - Added new preference parameters
- `src/types/index.ts` - Updated Preferences interface
- `src/utils/ticket-utils.ts` - New utility functions for ticket extraction
- `src/commands/views/CommitsView.tsx` - Added ticket action to commit items

### Key Functions

#### `extractTicketFromMessage(message: string): string | null`
Extracts ticket number from commit message using the configured regex pattern.

#### `generateTicketUrl(ticketKey: string): string | null`
Generates the full ticket URL by replacing `@key` placeholder in the template.

#### `getTicketInfoFromCommit(message: string): {ticketKey: string, ticketUrl: string} | null`
Combined function that extracts ticket and generates URL if both regex and template are configured.

### Error Handling
- Invalid regex patterns are handled gracefully (silent failure)
- Missing or empty configurations result in no ticket actions being shown
- Malformed URL templates are handled safely

## Examples

### JIRA Integration
**Regex**: `([A-Z]+-\\d+)`
**URL Template**: `https://mycompany.atlassian.net/browse/@key`

Commit message: `"Fix authentication bug PROJ-123"`
→ Action: "Open Ticket PROJ-123"
→ Opens: `https://mycompany.atlassian.net/browse/PROJ-123`

### GitHub Issues Integration
**Regex**: `#(\\d+)`
**URL Template**: `https://github.com/myorg/myrepo/issues/@key`

Commit message: `"Implement new feature, closes #456"`
→ Action: "Open Ticket 456"
→ Opens: `https://github.com/myorg/myrepo/issues/456`

### Linear Integration
**Regex**: `([A-Z]{2,4}-\\d+)`
**URL Template**: `https://linear.app/mycompany/issue/@key`

Commit message: `"Update dependencies ABC-789"`
→ Action: "Open Ticket ABC-789"
→ Opens: `https://linear.app/mycompany/issue/ABC-789`

## Benefits

1. **Quick Access**: Instantly navigate from commit to related ticket
2. **Context Switching**: Reduce time spent searching for tickets
3. **Flexible Configuration**: Works with any task tracking system that uses URL patterns
4. **Non-Intrusive**: Only appears when tickets are detected and configuration is complete
5. **Keyboard Shortcut**: Fast access via `Cmd+T` shortcut

## Troubleshooting

### Action Not Appearing
- Check that both regex pattern and URL template are configured
- Verify that your regex pattern matches the ticket format in commit messages
- Test your regex pattern with a regex tester tool

### Wrong Tickets Opening
- Double-check your regex pattern captures the correct part of the ticket reference
- Ensure your URL template is correctly formatted for your task tracker

### Invalid Regex
- If your regex pattern is invalid, the feature will silently fail
- Test your regex pattern before configuring it in preferences