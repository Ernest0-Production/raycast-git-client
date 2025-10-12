# Git Client for Raycast

Manage local Git repositories from Raycast with an intuitive UI: view status, branches, commits, and tags; clone repositories; perform quick actions (open in Terminal or an external Git client); link commit messages with URL trackers; and use AI prompt presets for commit message generation.

![PLACEHOLDER — Hero: extension overview / repositories list](PLACEHOLDER)

Best practice reference: [Obsidian for Raycast](https://www.raycast.com/marcjulian/obsidian).

## Features

- **Repository management**: `manage-repositories` lists local repositories with quick actions.
- **Open repository**: `open-repository` opens a detailed management interface by `path`.
- **Clone by URL**: `clone-repository` clones a repository from a remote `url`.
- **URL Trackers**: `configure-url-trackers` configures rules to auto-link patterns in commit messages.
- **AI Message Prompts**: `manage-ai-message-prompts` manages prompt presets for AI‑generated commit messages.
- **Quick actions**: open a repository in your preferred Terminal or external Git client.
- **Performance**: commit pagination and limits for branches/tags (configurable via Preferences).

## Screenshots (placeholders)

- ![PLACEHOLDER — Manage Repositories: list and quick actions](PLACEHOLDER)
- ![PLACEHOLDER — Open Repository: repository header/overview](PLACEHOLDER)
- ![PLACEHOLDER — Status: changed files and actions](PLACEHOLDER)
- ![PLACEHOLDER — Branches: local/remote branches](PLACEHOLDER)
- ![PLACEHOLDER — Commits: pagination, details, copy SHA](PLACEHOLDER)
- ![PLACEHOLDER — Tags: tags list](PLACEHOLDER)
- ![PLACEHOLDER — URL Trackers: rule configuration](PLACEHOLDER)
- ![PLACEHOLDER — AI Message Prompts: presets](PLACEHOLDER)

## Installation

### From Raycast Store
- [PLACEHOLDER — extension page link in Raycast Store](PLACEHOLDER)

### From source

Requirements:
- macOS with Raycast and Git (2.38+)
- Node.js 18+ (for development)

Steps:

```bash
git clone PLACEHOLDER_YOUR_REPO_URL.git
cd git-client
npm install
npm run dev
```

`npm run dev` starts Raycast development mode for this extension.

## Commands

### Manage Git Repositories (`manage-repositories`)
- Browse local repositories.
- Quick actions: open in Terminal (see `Default Terminal` preference) or in an external Git client.
- Open the detailed repository view with a single action.

![PLACEHOLDER — Manage Repositories: list](PLACEHOLDER)

### Clone Git Repository (`clone-repository`)
- Required argument `url` — paste an HTTPS/SSH repository URL.
- After cloning, open the repository directly from the success toast/view.

![PLACEHOLDER — Clone: URL input and progress](PLACEHOLDER)

### Open Git Repository (`open-repository`)
- Required argument `path` — absolute path to a local repository directory.
- Interface sections:
  - **Status**: changed files with quick actions (view/copy paths, etc.).
  - **Branches**: local and remote branches, checkout, create, etc.
  - **Commits**: history, commit details, copy SHA, pagination (`commitsPerPage`).
  - **Tags**: tags list (`maxTagsToLoad`).

![PLACEHOLDER — Open Repository: Status/Branches/Commits/Tags](PLACEHOLDER)

### Configure URL Trackers (`configure-url-trackers`)
- Define rules that turn matched patterns into clickable links (e.g., `ABC-123` → your issue tracker).

![PLACEHOLDER — URL Trackers: rules](PLACEHOLDER)

### Manage AI Message Prompts (`manage-ai-message-prompts`)
- Create and edit prompt presets for commit message generation.
- When `Auto Generate Commit Message` is enabled, the commit view can suggest an AI variant automatically.

![PLACEHOLDER — AI Prompts: presets](PLACEHOLDER)

## Preferences

| Name | Key | Type | Default | Description |
|---|---|---|---|---|
| Default Terminal (Shift + Cmd + T) | `defaultTerminal` | App Picker | `com.apple.Terminal` | Terminal app used to open the repository directory (e.g., Terminal, Warp). |
| External Git Client (Shift + Cmd + G) | `externalGitClient` | App Picker | `com.apple.Terminal` | External Git client used for Git operations (e.g., GitKraken). |
| Max Commits to Load | `commitsPerPage` | Textfield | `30` | Number of commits per pagination page. Smaller values scroll smoother; larger values load slower initially. |
| Max Branches to Load | `maxBranchesToLoad` | Textfield | `80` | Maximum number of branches loaded in local and remote sections. |
| Max Tags to Load | `maxTagsToLoad` | Textfield | `80` | Maximum number of tags loaded in the tags list. |
| Auto Generate Commit Message | `autoGenerateCommitMessage` | Checkbox | `false` | Automatically generate a commit message using AI when opening the commit view. |

> Tip: If lists are large or the UI feels sluggish, lower `commitsPerPage`, `maxBranchesToLoad`, and/or `maxTagsToLoad`.

## Scripts

```bash
npm run dev     # ray develop
npm run build   # ray build
npm run lint    # ray lint
npm run fix-lint
```

## Troubleshooting

- **Raycast CLI not found**: Install Raycast and run development mode (`npm run dev`).
- **Git operations fail**: Ensure the path points to a valid repository and you have file permissions.
- **Cannot open in Terminal/external client**: Check your Preferences.
- **Performance issues**: Decrease `commitsPerPage`, `maxBranchesToLoad`, and/or `maxTagsToLoad`.

## Privacy

All Git operations run locally via `simple-git`. No repository data is sent to third parties. Network calls occur only for Git operations (e.g., `fetch`, `push`, `pull`) according to your remote configuration.

## License

MIT — see `LICENSE`.

## Credits & Links

- [Raycast — Developer Docs](https://developers.raycast.com/)
- [`simple-git` — Git for Node.js](https://github.com/steveukx/git-js)
- [Obsidian for Raycast (best practice reference)](https://www.raycast.com/marcjulian/obsidian)

