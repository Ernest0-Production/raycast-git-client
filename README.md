# Git Client

**Manage your Git repositories from anywhere on your Mac.**


### 🚦 Control working tree status

- List staged and unstaged files with their status (added, modified, deleted, conflicted, etc.)
- View diff of files

![Status View](./metadata/git-2.png)

### 🧰 Resolve merge/rebase **conflicts**

- Pick per-segment resolution for merge conflicts

![Merge Conflict](./media/merge-conflcit-resolve.png)

### 🔎 Search in **commits** and **files history**

- Search commit by commit hash, author, message body, creation date, etc.
- View commit history of a specific file

<p float="left">
  <img src="./metadata/git-5.png" width="49%" />
  <img src="./media/file-history.png" width="49%" />
</p>

### ↪️ Checkout, cherry-pick, rebase, reset, revert, merge on commit, branch, tag

- Absolutely all the actions you need to change history

<p float="left">
  <img src="./media/branch-actions.png" width="49%" />
  <img src="./media/commit-actions.png" width="49%" />
</p>

### 🌳 Manage **branches**, **tags** and multiple **remotes**

- Create, delete, rename branche/tag/remote/etc.

![Branches](./metadata/git-6.png)

### 📦 Save and apply **stashes** and **patches**

![Apply Stash](./media/stash-apply.png)

### 📥 Clone repositories from URL **in background**

- Fast clone repositories from URL in background

![Clone Repository](./media/clone-repository.png)

## 🎁 Extra features:

- 🔗 [**Issue Link** detection in commit messages](#-issue-link-detection) and most common **web page shortcuts of remote host** like:
  - file blame & history
  - pull requests
  - commit details and builds
  - tag release page
  - linked `#issue`
  - and more...
  ![Issue Link](./media/attached-links.png)

- ✨ [Generate **AI commit messages** with multiple presets](#-custom-ai-prompt-presents-for-commit-messages)

- 🔄 Interactive rebase editor
  ![Interactive Rebase Editor](./media/interactive-rebase.png)

## 💡 Tips

### 🎛️ Fast Navigation

Use `⌘ + N` to fast navigate between tabs (aka dropdown items) of the extension.
  - `⌘ + 1` to go to Status
  - `⌘ + 2` to go to Commits
  - `⌘ + 3` to go to Branches
  - `⌘ + 4` to go to Tags
  - `⌘ + 5` to go to Remotes
  - `⌘ + 6` to go to Stashes
  - `⌘ + 0` to go to Files

---

### ⚡ QuickLink on specific repository

You can create a QuickLink to open a specific repository without needing to select it in `Manage Git Repositories` list.

1. Run command `Manage Git Repositories` to list all your repositories.
2. Run `Create Quicklink` (or `⌘ + L`) on the repository list item.
3. Profit 🎉

---

### 💬 Custom AI Prompt Presents for commit messages

1. Run command `Manage AI Message Prompts` to add custom AI prompt presents for commit messages.
  ![AI Commit Message](./media/custom-presets-list.png)

2. Create or Duplicate existing preset and edit it for your own needs.
  ![AI Commit Message](./media/custom-preset-prompt.png)

3. Run `Generate Commit Message` (or `⌘ + shift + G`) and pick your preset from submenu.
  ![AI Commit Message](./media/custom-preset-action.png)

4. Profit 🎉

---

### 🔗 Issue Link Detection

You can parse information from commit messages to create links to specific issues in issue trackers.

1. Run command `Configure URL Trackers` to list all your URL tracker rules.
  ![Issue Link](./media/issue-trackers-list.png)

2. Run `Add New Rule` to add a new URL tracker rule and fill fielads.
  ![Issue Link](./media/issue-tracker-editor.png)
  - `Regex` should include a capture group for the issue number
  - `URL Template` should contain `@key` placeholder where the regex match should be inserted\

3. Open `commits` tab and run action `Attached Links` that opens submenu with issue links in commit messages.
  ![Issue Link](./media/issue-tracker-detection.png)

4. Profit 🎉

## ⁉️ FAQ

> Whish environment variables are used when performing git commands?

Extension loads:
- All environment variables from interactive ZSH shell.
- `SSH_AUTH_SOCK` from launchctl to access the system ssh-agent with already set up SSH keys.

## 🧑‍🚀 Future Features

- [ ] AI Tools
- [ ] More fluent commit search
- [ ] Background fetching
- [ ] Menu Bar Commands
- [ ] Submodules support
- [ ] Windows support
- [ ] Manage Hooks
- [ ] Manage Git Config

## 💸 Support for the development

[!["Buy Me A Coffee"](https://cdn.buymeacoffee.com/buttons/v2/arial-orange.png)](https://buymeacoffee.com/ernest0n)
