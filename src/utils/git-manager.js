"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitManager = void 0;
const simple_git_1 = require("simple-git");
const api_1 = require("@raycast/api");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const fs_2 = require("fs");
const utils_1 = require("@raycast/utils");
const child_process_1 = require("child_process");
const environment_utils_1 = require("./environment-utils");
/**
 * Manager for Git operations within a repository.
 * Provides a high-level API for all Git operations.
 */
class GitManager {
    git;
    repoPath;
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.git = (0, simple_git_1.simpleGit)(repoPath, {
            errors: (error, _result) => {
                if (error) {
                    (0, utils_1.showFailureToast)(error, { title: `Error running command` });
                }
                return error;
            }
        });
        // for (const [key, value] of Object.entries(shellEnvironmentVariables)) {
        this.git = this.git.env(environment_utils_1.shellEnvironmentVariables);
        // }
        // Global logging of all git commands for debugging
        this.setupGlobalLogging();
    }
    /**
     * Gets the repository name from the path.
     */
    get repoName() {
        return (0, path_1.basename)(this.repoPath) || "Unknown Repository";
    }
    static validateDirectory(repoPath) {
        if (!(0, fs_1.existsSync)(repoPath)) {
            throw new Error(`Directory does not exist: ${repoPath}`);
        }
        const gitPath = (0, path_1.join)(repoPath, ".git");
        if (!(0, fs_1.existsSync)(gitPath)) {
            throw new Error(`Not a Git repository: ${repoPath}`);
        }
    }
    /**
     * Sets up global logging of git commands and streaming output.
     */
    setupGlobalLogging() {
        this.git.outputHandler((command, stdout, stderr, args) => {
            const ignoredCommands = [
                'ls-files',
                'ls-remote',
                'remote'
            ];
            // Skip logging for ls-files command
            if (ignoredCommands.some(command => args.includes(command))) {
                return;
            }
            const command_description = `${command} ${args.join(" ")}`;
            // Log the full command for debugging
            console.log(`[GIT] ${command_description}`);
            (0, api_1.showToast)({ style: api_1.Toast.Style.Animated, title: command_description, message: "Running..." });
            let lastOutput = "";
            // Process stdout (standard output)
            stdout.on("data", (data) => {
                const output = data.toString().trim();
                if (output) {
                    lastOutput = output;
                }
            });
            // Process stderr (errors)
            stderr.on("data", (data) => {
                const error = data.toString().trim();
                if (error) {
                    lastOutput = error;
                    (0, api_1.showToast)({ style: api_1.Toast.Style.Animated, title: error });
                    console.warn(`[GIT STDERR] ${error}.\nCommand: ${command_description}`);
                }
            });
            // Show the final result on completion
            stdout.on("end", () => {
                if (lastOutput) {
                    (0, api_1.showToast)({ style: api_1.Toast.Style.Success, title: command_description, message: lastOutput });
                }
            });
        });
    }
    /**
     * Gets the branches state including current branch, detached HEAD, local and remote branches.
     */
    async getBranches() {
        const summary = await this.git.branch(["--all", "-vv", "--sort=-committerdate"]);
        const parseBranchInfo = (label) => {
            // Single regex to parse all possible branch info patterns with named groups
            // Handles: no upstream, [upstream], [upstream: ahead X], [upstream: behind Y], [upstream: ahead X, behind Y], [upstream: gone]
            const match = label.match(/(?:\[(?<upstream>.*?)(?:: (?:ahead (?<ahead>\d+))?(?:, )?(?:behind (?<behind>\d+))?(?<gone>gone)?)?\])?/);
            if (!match?.groups) {
                return { ahead: 0, behind: 0 };
            }
            return {
                ahead: match.groups.ahead ? parseInt(match.groups.ahead, 10) : 0,
                behind: match.groups.behind ? parseInt(match.groups.behind, 10) : 0,
                upstream: match.groups.upstream,
                isGone: !!match.groups.gone,
            };
        };
        let currentBranchName = summary.current;
        if (summary.current && summary.current.startsWith("(no")) {
            const headNamePath = (0, path_1.join)(this.repoPath, ".git", "rebase-merge", "head-name");
            const headNameContent = await fs_2.promises.readFile(headNamePath, "utf-8");
            currentBranchName = headNameContent.trim().replace(/^refs\/heads\//, "");
        }
        let currentBranch;
        let detachedHead;
        const localBranches = [];
        const remoteBranches = {};
        // Handle detached HEAD state
        if (summary.detached === true) {
            // In detached HEAD, summary.current contains the commit hash
            const commitHash = summary.current || "unknown";
            // Get current commit info for detached HEAD
            const currentCommitInfo = await this.git.show(["--format=%s|%cd", "--no-patch", "HEAD"]);
            const [message, dateStr] = currentCommitInfo.split("|");
            detachedHead = {
                commitHash,
                shortCommitHash: commitHash,
                commitMessage: message?.trim() || "No commit message",
                commitDate: dateStr ? new Date(dateStr) : new Date(),
            };
        }
        else if (summary.current) {
            // Current Branch
            const currentBranchDetails = summary.branches[summary.current];
            if (currentBranchDetails) {
                const { ahead, behind, upstream, isGone } = parseBranchInfo(currentBranchDetails.label);
                currentBranch = {
                    name: currentBranchName,
                    displayName: currentBranchName,
                    type: "current",
                    ahead,
                    behind,
                    upstream,
                    isGone,
                    lastCommitMessage: this.extractCommitMessage(currentBranchDetails.label),
                    lastCommitHash: currentBranchDetails.commit,
                };
            }
        }
        const maxBranchesToLoad = parseInt((0, api_1.getPreferenceValues)().maxBranchesToLoad);
        // Local Branches
        Object.values(summary.branches).forEach((branch) => {
            if (!branch.name.startsWith("remotes/") && !branch.current) {
                if (localBranches.length >= maxBranchesToLoad)
                    return;
                const { ahead, behind, upstream, isGone } = parseBranchInfo(branch.label);
                localBranches.push({
                    name: branch.name,
                    displayName: branch.name,
                    type: "local",
                    ahead,
                    behind,
                    upstream,
                    isGone,
                    lastCommitMessage: this.extractCommitMessage(branch.label),
                    lastCommitHash: branch.commit,
                });
            }
        });
        // Remote Branches
        Object.values(summary.branches).forEach((branch) => {
            if (branch.name.startsWith("remotes/")) {
                const remoteNameParts = branch.name.replace("remotes/", "").split("/");
                const remote = remoteNameParts.shift();
                if (!remote)
                    return;
                const branchName = remoteNameParts.join("/");
                // Avoid adding remote HEAD pointers
                if (branchName === "HEAD" || !branchName)
                    return;
                if (!remoteBranches[remote]) {
                    remoteBranches[remote] = [];
                }
                if (remoteBranches[remote].length >= maxBranchesToLoad)
                    return;
                remoteBranches[remote].push({
                    name: branchName,
                    displayName: `${remote}/${branchName}`,
                    type: "remote",
                    remote,
                    upstream: branch.name, // The full remote name is the upstream ref
                    lastCommitMessage: this.extractCommitMessage(branch.label),
                    lastCommitHash: branch.commit,
                });
            }
        });
        return {
            currentBranch,
            detachedHead,
            localBranches,
            remoteBranches,
        };
    }
    /**
     * Gets the status of files in the repository using detailed FileStatusResult.
     */
    async getStatus() {
        const status = await this.git.status();
        const files = [];
        // Process each file using detailed status information
        for (const fileStatus of status.files) {
            const fileEntries = this.parseFileStatus(fileStatus);
            files.push(...fileEntries);
        }
        const rebaseMergePath = (0, path_1.join)(this.repoPath, ".git", "rebase-merge");
        const mergeHeadPath = (0, path_1.join)(this.repoPath, ".git", "MERGE_HEAD");
        const squashMessagePath = (0, path_1.join)(this.repoPath, ".git", "SQUASH_MSG");
        let conflict;
        if ((0, fs_1.existsSync)(rebaseMergePath)) {
            const msgNumContent = await fs_2.promises.readFile((0, path_1.join)(rebaseMergePath, "msgnum"), "utf-8");
            const endContent = await fs_2.promises.readFile((0, path_1.join)(rebaseMergePath, "end"), "utf-8");
            conflict = {
                type: "rebase",
                current: parseInt(msgNumContent.trim()) || 0,
                total: parseInt(endContent.trim()) || 0,
            };
        }
        else if ((0, fs_1.existsSync)(mergeHeadPath)) {
            conflict = { type: "merge", current: 0, total: 1, };
        }
        else if ((0, fs_1.existsSync)(squashMessagePath)) {
            conflict = { type: "squash", current: 0, total: 1, };
        }
        return { branch: status.current, files, conflict };
    }
    /**
     * Parses a FileStatusResult into one or more FileStatus entries.
     * A single file can appear in both staged and unstaged states.
     *
     * Git status format:
     * - index (first char): status in staged area
     * - working_dir (second char): status in working directory
     *
     * Common combinations:
     * - ' M' = modified in working directory only (unstaged)
     * - 'M ' = modified in index only (staged)
     * - 'MM' = modified in both index and working directory (staged + unstaged)
     * - 'A ' = added to index (staged)
     * - ' A' = added to working directory (unstaged, untracked)
     * - 'D ' = deleted from index (staged)
     * - ' D' = deleted from working directory (unstaged)
     * - 'R ' = renamed in index (staged)
     * - 'C ' = copied in index (staged)
     * - 'UU' = unmerged, both modified (conflicted)
     * - '??' = untracked file (unstaged)
     */
    parseFileStatus(fileStatus) {
        const results = [];
        const { index, working_dir, path, from } = fileStatus;
        // Helper function to create file status object
        const createFileStatus = (status, type) => ({
            path: this.getAbsolutePath(path),
            relativePath: path,
            status,
            type,
            oldPath: from ? this.getAbsolutePath(from) : undefined,
        });
        // Explicit handling of all possible index + working_dir combinations
        const combination = `${index}${working_dir}`;
        switch (combination) {
            // ============================================================================
            // CONFLICT STATES (unmerged files)
            // ============================================================================
            case "DD": // unmerged, both deleted
                results.push(createFileStatus("staged", "conflicted"));
                results.push(createFileStatus("unstaged", "conflicted"));
                break;
            case "AU": // unmerged, added by us
                results.push(createFileStatus("staged", "conflicted"));
                results.push(createFileStatus("unstaged", "conflicted"));
                break;
            case "UD": // unmerged, deleted by them
                results.push(createFileStatus("staged", "conflicted"));
                results.push(createFileStatus("unstaged", "conflicted"));
                break;
            case "UA": // unmerged, added by them
                results.push(createFileStatus("staged", "conflicted"));
                results.push(createFileStatus("unstaged", "conflicted"));
                break;
            case "DU": // unmerged, deleted by us
                results.push(createFileStatus("staged", "conflicted"));
                results.push(createFileStatus("unstaged", "conflicted"));
                break;
            case "AA": // unmerged, both added
                results.push(createFileStatus("staged", "conflicted"));
                results.push(createFileStatus("unstaged", "conflicted"));
                break;
            case "UU": // unmerged, both modified
                results.push(createFileStatus("staged", "conflicted"));
                results.push(createFileStatus("unstaged", "conflicted"));
                break;
            // ============================================================================
            // NORMAL STATES - STAGED ONLY
            // ============================================================================
            case "A ": // added to index
                results.push(createFileStatus("staged", "added"));
                break;
            case "M ": // modified in index
                results.push(createFileStatus("staged", "modified"));
                break;
            case "D ": // deleted from index
                results.push(createFileStatus("staged", "deleted"));
                break;
            case "R ": // renamed in index
                results.push(createFileStatus("staged", "renamed"));
                break;
            case "C ": // copied in index
                results.push(createFileStatus("staged", "copied"));
                break;
            case "T ": // file type changed in index
                results.push(createFileStatus("staged", "modified"));
                break;
            // ============================================================================
            // NORMAL STATES - UNSTAGED ONLY
            // ============================================================================
            case " M": // modified in working directory
                results.push(createFileStatus("unstaged", "modified"));
                break;
            case " D": // deleted in working directory
                results.push(createFileStatus("unstaged", "deleted"));
                break;
            case " T": // file type changed in working directory
                results.push(createFileStatus("unstaged", "modified"));
                break;
            case "??": // untracked file
                results.push(createFileStatus("untracked", "added"));
                break;
            case "!!": // ignored file (should not normally appear in status)
                // Skip ignored files
                break;
            // ============================================================================
            // NORMAL STATES - BOTH STAGED AND UNSTAGED
            // ============================================================================
            case "MM": // modified in both index and working directory
                results.push(createFileStatus("staged", "modified"));
                results.push(createFileStatus("unstaged", "modified"));
                break;
            case "AM": // added in index, modified in working directory
                results.push(createFileStatus("staged", "added"));
                results.push(createFileStatus("unstaged", "modified"));
                break;
            case "AD": // added in index, deleted in working directory
                results.push(createFileStatus("staged", "added"));
                results.push(createFileStatus("unstaged", "deleted"));
                break;
            case "MD": // modified in index, deleted in working directory
                results.push(createFileStatus("staged", "modified"));
                results.push(createFileStatus("unstaged", "deleted"));
                break;
            case "RM": // renamed in index, modified in working directory
                results.push(createFileStatus("staged", "renamed"));
                results.push(createFileStatus("unstaged", "modified"));
                break;
            case "RD": // renamed in index, deleted in working directory
                results.push(createFileStatus("staged", "renamed"));
                results.push(createFileStatus("unstaged", "deleted"));
                break;
            case "CM": // copied in index, modified in working directory
                results.push(createFileStatus("staged", "copied"));
                results.push(createFileStatus("unstaged", "modified"));
                break;
            case "CD": // copied in index, deleted in working directory
                results.push(createFileStatus("staged", "copied"));
                results.push(createFileStatus("unstaged", "deleted"));
                break;
            // ============================================================================
            // EDGE CASES AND UNKNOWN COMBINATIONS
            // ============================================================================
            default:
                // Log unexpected combinations for debugging
                console.error(`Unknown Git status combination: "${combination}" for file: ${path}`);
                break;
        }
        return results;
    }
    /**
     * Extracts commit message from branch label.
     * Branch label can contain upstream info like "[origin/main: ahead 2] commit message"
     * or just the commit message without upstream info.
     */
    extractCommitMessage(label) {
        // The label format from git branch -vv is usually:
        // "commit_message" or "[upstream: ahead/behind info] commit_message"
        // Remove upstream information in brackets [upstream: ahead/behind info]
        const cleanLabel = label.replace(/^\[.*?\]\s*/, "").trim();
        // If there's still content, it's the commit message, otherwise use a default
        return cleanLabel || "No commit message";
    }
    /**
     * Parses git commit refs string into categorized ref types.
     */
    parseCommitRefs(refsString) {
        const result = {
            localBranches: [],
            remoteBranches: [],
            tags: [],
            currentBranchName: undefined,
        };
        if (!refsString || !refsString.trim()) {
            return result;
        }
        const refs = refsString.split(", ").map((ref) => ref.trim());
        for (const ref of refs) {
            if (ref.startsWith("tag:")) {
                // Extract tag name: "tag: v1.0.0" -> "v1.0.0"
                const tagName = ref.replace(/^tag:\s*refs\/tags\//, "").trim();
                if (tagName) {
                    result.tags.push(tagName);
                }
            }
            else if (ref.includes("HEAD ->")) {
                // Current branch: "HEAD -> main" or "origin/HEAD -> origin/main"
                const match = ref.match(/HEAD\s*->\s*refs\/heads\/(.+)/);
                if (!match)
                    continue;
                const branchName = match[1].trim();
                result.currentBranchName = branchName;
            }
            else if (!ref.startsWith("HEAD")) {
                if (ref.startsWith("refs/remotes/")) {
                    // Extract subpath from ref without "refs/remotes/"
                    const remoteBranch = ref.replace(/^refs\/remotes\//, "");
                    result.remoteBranches.push(remoteBranch);
                }
                else if (ref.startsWith("refs/heads/")) {
                    const localBranch = ref.replace(/^refs\/heads\//, "");
                    result.localBranches.push(localBranch);
                }
            }
        }
        return result;
    }
    /**
     * Gets the last commit from the repository.
     */
    async getLastCommit() {
        const log = await this.git.log(["--max-count=1", "--name-status", "--decorate=full"]);
        if (!log.latest) {
            return null;
        }
        const commit = log.latest;
        const changedFiles = this.parseCommitChangedFiles(commit.diff);
        const parsedRefs = this.parseCommitRefs(commit.refs);
        return {
            hash: commit.hash,
            shortHash: commit.hash.substring(0, 7),
            message: commit.message,
            body: commit.body,
            author: commit.author_name,
            authorEmail: commit.author_email,
            date: new Date(commit.date),
            localBranches: parsedRefs.localBranches,
            remoteBranches: parsedRefs.remoteBranches,
            tags: parsedRefs.tags,
            currentBranchName: parsedRefs.currentBranchName,
            changedFiles,
        };
    }
    /**
     * Gets the commit history with optional offset for pagination.
     * @param branch Branch name to get commits from (optional)
     * @param page Page number for pagination (optional, default 0)
     */
    async getCommits(branch, page = 0) {
        const commitsPerPage = parseInt((0, api_1.getPreferenceValues)().commitsPerPage);
        const log = await this.git.log([
            `--max-count=${commitsPerPage}`,
            `--skip=${page * commitsPerPage}`,
            "--name-status",
            "--first-parent",
            ...(branch ? [branch] : ["--all"]),
            '--decorate=full',
        ]);
        return log.all.map((commit) => {
            const changedFiles = this.parseCommitChangedFiles(commit.diff);
            const parsedRefs = this.parseCommitRefs(commit.refs);
            return {
                hash: commit.hash,
                shortHash: commit.hash.substring(0, 7),
                message: commit.message,
                body: commit.body,
                author: commit.author_name,
                authorEmail: commit.author_email,
                date: new Date(commit.date),
                localBranches: parsedRefs.localBranches,
                remoteBranches: parsedRefs.remoteBranches,
                tags: parsedRefs.tags,
                currentBranchName: parsedRefs.currentBranchName,
                changedFiles,
            };
        });
    }
    /**
     * Returns the first parent hash of a given commit or null if none (root commit).
     */
    async getFirstParentOfCommit(commitHash) {
        const output = await this.git.raw(["rev-list", "--parents", "-n", "1", commitHash]);
        const parts = output.trim().split(/\s+/);
        // Format: <child> <parent1> [parent2 ...]
        if (parts.length >= 2) {
            return parts[1];
        }
        return null;
    }
    /**
     * Gets commits in chronological order from the specified start commit (inclusive) up to HEAD.
     */
    async getCommitsSince(startHash) {
        const parent = await this.getFirstParentOfCommit(startHash);
        const options = [
            "--reverse",
            "--name-status",
            "--decorate=full",
        ];
        if (parent) {
            options.push(`${parent}..HEAD`);
        }
        else {
            // Root commit selected: include full history to HEAD
            options.push("--all");
        }
        const log = await this.git.log(options);
        return log.all.map((commit) => {
            const changedFiles = this.parseCommitChangedFiles(commit.diff);
            const parsedRefs = this.parseCommitRefs(commit.refs);
            return {
                hash: commit.hash,
                shortHash: commit.hash.substring(0, 7),
                message: commit.message,
                body: commit.body,
                author: commit.author_name,
                authorEmail: commit.author_email,
                date: new Date(commit.date),
                localBranches: parsedRefs.localBranches,
                remoteBranches: parsedRefs.remoteBranches,
                tags: parsedRefs.tags,
                currentBranchName: parsedRefs.currentBranchName,
                changedFiles,
            };
        });
    }
    /**
     * Performs an interactive rebase with a prepared plan. The plan order defines the new history order.
     * For reword, the new message will be applied using an exec amend step.
     */
    async interactiveRebase(startHash, plan) {
        // Build rebase todo content based on plan
        const todoLines = [];
        for (const item of plan) {
            const action = item.action;
            const hash = item.hash;
            switch (action) {
                case "pick":
                    todoLines.push(`pick ${hash}`);
                    break;
                case "drop":
                    todoLines.push(`drop ${hash}`);
                    break;
                case "edit":
                    todoLines.push(`edit ${hash}`);
                    break;
                case "squash":
                    todoLines.push(`squash ${hash}`);
                    break;
                case "fixup":
                    todoLines.push(`fixup ${hash}`);
                    break;
                case "reword":
                    // Use pick + exec amend to set message non-interactively
                    todoLines.push(`pick ${hash}`);
                    if (item.newMessage) {
                        // Escape double quotes and backslashes for safe shell embedding
                        const escaped = item.newMessage.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                        todoLines.push(`exec git commit --amend -m "${escaped}"`);
                    }
                    else {
                        throw new Error("No new message provided for reword action in interactive rebase plan");
                    }
                    break;
            }
        }
        // Create temporary sequence editor script that writes our todo
        const tempDirectory = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "raycast-git-"));
        const editorPath = (0, path_1.join)(tempDirectory, "sequence-editor.sh");
        // Используем многострочный шаблонный литерал для генерации shell-скрипта sequence editor
        const script = `#!/bin/sh
TODO_FILE="$1"
/bin/cat > "$TODO_FILE" <<'__REBASE_TODO__'
${todoLines.join("\n")}
__REBASE_TODO__
`;
        (0, fs_1.writeFileSync)(editorPath, script, { encoding: "utf-8" });
        // Set executable permissions for the script: 0o755 means rwxr-xr-x (owner can read/write/execute, group and others can read/execute)
        (0, fs_1.chmodSync)(editorPath, 0o755);
        try {
            const parentCommit = await this.getFirstParentOfCommit(startHash);
            const options = [
                "-c", `sequence.editor=${editorPath}`,
                "rebase", "--interactive"
            ];
            if (parentCommit) {
                options.push(parentCommit);
            }
            else {
                options.push("--root");
            }
            await this.git.raw(options);
        }
        finally {
            try {
                (0, fs_1.rmSync)(tempDirectory, { recursive: true, force: true });
            }
            catch (error) { /* ignore */ }
        }
    }
    /**
     * Parses the changed files from git log --name-status diff output.
     */
    parseCommitChangedFiles(diff) {
        // Helper function to map DiffNameStatus to typed status names
        function mapDiffNameStatusToTypedStatus(status) {
            switch (status) {
                case simple_git_1.DiffNameStatus.ADDED:
                    return "added";
                case simple_git_1.DiffNameStatus.MODIFIED:
                    return "modified";
                case simple_git_1.DiffNameStatus.DELETED:
                    return "deleted";
                case simple_git_1.DiffNameStatus.RENAMED:
                    return "renamed";
                case simple_git_1.DiffNameStatus.COPIED:
                    return "copied";
                case simple_git_1.DiffNameStatus.CHANGED:
                    return "changed";
                default:
                    // Fallback for any unexpected status
                    return "modified";
            }
        }
        if (!diff || !diff.files) {
            return [];
        }
        return diff.files.map((file) => {
            if ("status" in file && file.status) {
                return {
                    status: mapDiffNameStatusToTypedStatus(file.status),
                    path: file.file,
                    oldPath: file.from,
                };
            }
            throw new Error("Failed to parse commit changed files: unknown diff format");
        });
    }
    /**
     * Returns per-file change statistics (insertions & deletions) for the specified commit.
     */
    async getCommitFileStats(commitHash) {
        const summary = await this.git.diffSummary([`${commitHash}^`, commitHash]);
        const stats = {};
        for (const file of summary.files) {
            // Skip binary files as they don't have insertions/deletions counts
            if ("binary" in file && file.binary === true) {
                continue;
            }
            const filePath = file.file;
            const insertions = file.insertions || 0;
            const deletions = file.deletions || 0;
            if (insertions === 0 && deletions === 0) {
                continue;
            }
            stats[filePath] = { insertions, deletions };
        }
        return stats;
    }
    /**
     * Checks out the specified branch.
     */
    async checkoutLocalBranch(branchName) {
        await this.git.checkout(branchName);
    }
    async checkoutRemoteBranch(branchName, upstream) {
        await this.git.checkout(["--track", "-B", branchName, upstream]);
    }
    /**
     * Checks out a specific commit (creates detached HEAD state).
     */
    async checkoutCommit(commitHash) {
        await this.git.checkout(commitHash);
    }
    /**
     * Creates a new branch.
     */
    async createBranch(name) {
        await this.git.checkoutLocalBranch(name);
    }
    /**
     * Deletes a local branch.
     */
    async deleteBranch(name, force = false) {
        await this.git.deleteLocalBranch(name, true);
    }
    /**
     * Deletes a remote branch.
     */
    async deleteRemoteBranch(remote, branchName) {
        await this.git.push(remote, branchName, ["--delete"]);
    }
    async deleteUpstreamBranch(upstream) {
        const [remote, ...branchParts] = upstream.split("/");
        await this.deleteRemoteBranch(remote, branchParts.join("/"));
    }
    /**
     * Adds a file to the staging area.
     */
    async stageFile(file) {
        await this.git.add(file);
    }
    /**
     * Removes a file from the staging area.
     */
    async unstageFile(file) {
        await this.git.reset(["HEAD", file]);
    }
    /**
     * Discards changes in a file.
     */
    async discardChanges(file) {
        await this.git.checkout(["--", file]);
    }
    /**
     * Discards all unstaged changes in the repository.
     */
    async discardAllChanges() {
        // Discard all changes in tracked files
        await this.git.reset(simple_git_1.ResetMode.HARD);
        // Remove all untracked files and directories
        await this.git.clean(simple_git_1.CleanOptions.FORCE, ["-d"]);
    }
    /**
     * Cherry-picks a commit.
     */
    async cherryPick(commitHash) {
        await this.git.raw(["cherry-pick", commitHash]);
    }
    /**
     * Reverts a commit.
     */
    async revert(commitHash) {
        await this.git.raw(["revert", "--no-edit", commitHash]);
    }
    /**
     * Resets to the specified commit.
     */
    async reset(commitHash, mode) {
        await this.git.reset(mode, [commitHash]);
    }
    /**
     * Creates a commit with a message.
     */
    async commit(message, amend = false) {
        if (amend) {
            await this.git.raw(["commit", "--amend", "-m", message]);
        }
        else {
            await this.git.commit(message);
        }
    }
    /**
     * Creates a merge commit.
     */
    async commitMerge() {
        await this.git.raw(["commit", "--no-edit"]);
    }
    /**
     * Pushes changes to a specific remote.
     */
    async push(force = false, branch, remote) {
        const options = [];
        if (force) {
            options.push("--force-with-lease");
        }
        // automatically set upstream for new branch or detached branch
        if (!branch.upstream || branch.isGone) {
            options.push("--set-upstream");
        }
        try {
            await this.git.push(remote, branch?.name, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (!force) {
                const confirmed = await (0, api_1.confirmAlert)({
                    title: "Push rejected",
                    message: "Reason: " + errorMessage,
                    primaryAction: {
                        title: "Force Push",
                        style: api_1.Alert.ActionStyle.Destructive,
                    },
                });
                if (confirmed) {
                    await this.push(true, branch, remote);
                }
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Pulls changes.
     */
    async pull(rebase = false) {
        const pullArgs = ["--prune", "--tags"];
        if (rebase) {
            pullArgs.push("--rebase");
        }
        await this.git.pull(undefined, undefined, pullArgs);
    }
    /**
     * Fetches changes.
     */
    async fetch(remote) {
        await this.git.fetch([
            remote ? remote : "--all",
            "--prune",
            "--tags"
        ]);
    }
    /**
     * Creates a stash with an optional message.
     */
    async stash(message) {
        if (message) {
            await this.git.stash(["push", "-m", message]);
        }
        else {
            await this.git.stash();
        }
    }
    /**
     * Applies a stash by index.
     */
    async applyStash(index = 0) {
        await this.git.stash(["apply", `stash@{${index}}`]);
    }
    /**
     * Applies and removes a stash (pop).
     */
    async popStash(index = 0) {
        await this.git.stash(["pop", `stash@{${index}}`]);
    }
    /**
     * Drops a stash by index.
     */
    async dropStash(index = 0) {
        await this.git.stash(["drop", `stash@{${index}}`]);
    }
    /**
     * Gets a list of all stashes.
     */
    async getStashes() {
        const stashList = await this.git.stashList();
        return stashList.all.map((stash) => ({
            message: stash.message.replace(/^On [^:]+: /, ""),
            hash: stash.hash,
            date: new Date(stash.date),
            author: stash.author_name,
            authorEmail: stash.author_email,
        }));
    }
    /**
     * Creates a tag.
     */
    async createTag(tagName, commitHash, message) {
        if (message) {
            this.git.raw(`tag -a ${tagName} -m ${message} ${commitHash}`);
        }
        else {
            this.git.raw(`tag ${tagName} ${commitHash}`);
        }
    }
    /**
     * Returns detailed list of local tags with commit hashes and optional messages.
     */
    async getLocalTagsDetailed() {
        const tags = await this.git.tags();
        const result = [];
        await Promise.all(tags.all.map(async (name) => {
            try {
                const commitHash = (await this.git.raw(["rev-list", "-n", "1", name])).trim();
                let message = undefined;
                try {
                    // subject of annotated tag or commit message if lightweight
                    message = (await this.git.raw(["show", "-s", "--format=%s", name])).trim();
                }
                catch {
                    // ignore
                }
                result.push({ name, commitHash, message });
            }
            catch {
                // ignore broken tag
            }
        }));
        // keep stable order by name
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Lists remote tags for a given remote using `git ls-remote --tags`.
     */
    async getRemoteTags(remote) {
        const output = await this.git.listRemote(["--tags", remote]);
        const lines = output.trim().split(/\r?\n/).filter(Boolean);
        // Prefer ^{} dereferenced commit hashes when present
        const derefMap = new Map();
        const directMap = new Map();
        for (const line of lines) {
            const [hash, ref] = line.split(/\s+/);
            if (!hash || !ref)
                continue;
            const match = ref.match(/^refs\/tags\/(.+?)(\^\{\})?$/);
            if (!match)
                continue;
            const tagName = match[1];
            const isDeref = Boolean(match[2]);
            if (isDeref) {
                derefMap.set(tagName, hash);
            }
            else {
                directMap.set(tagName, hash);
            }
        }
        const names = new Set([...derefMap.keys(), ...directMap.keys()]);
        const result = [];
        for (const name of names) {
            const commitHash = derefMap.get(name) || directMap.get(name);
            if (!commitHash)
                continue;
            result.push({ name, commitHash });
        }
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Renames a local tag by creating a new one pointing to the same commit, then deleting the old.
     */
    async renameTag(oldName, newName) {
        const commitHash = (await this.git.raw(["rev-list", "-n", "1", oldName])).trim();
        await this.git.raw(["tag", newName, commitHash]);
        await this.git.raw(["tag", "-d", oldName]);
    }
    /**
     * Checks out a tag (detached HEAD).
     */
    async checkoutTag(tagName) {
        await this.git.checkout([tagName]);
    }
    /**
     * Returns a single commit by ref (hash, tag or branch).
     */
    async getCommitByRef(ref) {
        const log = await this.git.log(["--max-count=1", "--name-status", "--decorate=full", ref]);
        const commit = log.latest;
        if (!commit)
            return null;
        const changedFiles = this.parseCommitChangedFiles(commit.diff);
        const parsedRefs = this.parseCommitRefs(commit.refs);
        return {
            hash: commit.hash,
            shortHash: commit.hash.substring(0, 7),
            message: commit.message,
            body: commit.body,
            author: commit.author_name,
            authorEmail: commit.author_email,
            date: new Date(commit.date),
            localBranches: parsedRefs.localBranches,
            remoteBranches: parsedRefs.remoteBranches,
            tags: parsedRefs.tags,
            currentBranchName: parsedRefs.currentBranchName,
            changedFiles,
        };
    }
    /**
     * Gets the absolute path to a file.
     */
    getAbsolutePath(relativePath) {
        return (0, path_1.join)(this.repoPath, relativePath);
    }
    /**
     * Gets the diff for a file or commit.
     */
    async getDiff(options) {
        // If no commitHash and no status, return diff of all staged changes
        if (!options) {
            return await this.git.diff(["--staged"]);
        }
        if (options.status === "untracked") {
            const filePath = this.getAbsolutePath(options.file);
            return (0, fs_1.readFileSync)(filePath, "utf-8").replace(/^/gm, "+");
        }
        const diffOptions = [];
        if (options.commitHash) {
            diffOptions.push(`${options.commitHash}^`, options.commitHash);
        }
        else if (options.status === "staged") {
            diffOptions.push("--staged");
        }
        diffOptions.push("--", options.file);
        const cleanGitDiff = (diff) => {
            const lines = diff.split("\n");
            // Найти первую строку с @@ (начало хунка изменений)
            const firstChunkIndex = lines.findIndex((line) => line.startsWith("@@"));
            if (firstChunkIndex === -1) {
                // Если нет @@, значит нет изменений контента
                return "";
            }
            // Взять всё начиная с первой @@
            return lines.slice(firstChunkIndex).join("\n");
        };
        const diff = await this.git.diff(diffOptions);
        return cleanGitDiff(diff);
    }
    /**
     * Merges a branch into the current branch.
     */
    async mergeBranch(branchName, mode) {
        await this.git.merge([branchName, `--${mode}`]);
    }
    /**
     * Rebases the current branch onto the specified branch.
     */
    async rebase(targetBranch) {
        await this.git.rebase([targetBranch]);
    }
    /**
     * Aborts an ongoing rebase.
     */
    async abortRebase() {
        await this.git.rebase(["--abort"]);
    }
    /**
     * Aborts an ongoing merge.
     */
    async abortMerge() {
        await this.git.merge(["--abort"]);
    }
    /**
     * Continues an ongoing rebase.
     */
    async continueRebase() {
        await this.git
            .env("GIT_EDITOR", "true")
            .rebase(["--continue"]);
    }
    /**
     * Gets a list of all remotes.
     */
    async getRemotes() {
        const remotes = await this.git.getRemotes(true);
        return remotes.map((remote) => ({
            name: remote.name,
            fetchUrl: remote.refs.fetch,
            pushUrl: remote.refs.push,
        }));
    }
    /**
     * Checks connectivity to a given remote using `git ls-remote`.
     */
    async checkRemoteConnectivity(remoteName) {
        await this.git.listRemote(["--heads", remoteName, "HEAD", "--quiet"]);
    }
    /**
     * Adds a new remote.
     */
    async addRemote(name, fetchUrl, pushUrl) {
        await this.git.addRemote(name, fetchUrl);
        if (pushUrl) {
            await this.git.raw(["remote", "set-url", "--push", name, pushUrl]);
        }
    }
    async updateRemote(name, fetchUrl, pushUrl) {
        await this.git.raw(["remote", "set-url", name, fetchUrl]);
        if (pushUrl) {
            await this.git.raw(["remote", "set-url", "--push", name, pushUrl]);
        }
    }
    /**
     * Removes a remote.
     */
    async removeRemote(name) {
        await this.git.removeRemote(name);
    }
    /**
     * Gets a list of all tags.
     */
    async getTags() {
        const tags = await this.git.tags();
        return tags.all;
    }
    /**
     * Deletes a tag.
     */
    async deleteTag(tagName) {
        await this.git.raw(["tag", "-d", tagName]);
    }
    /**
     * Pushes tags to remote with optional delete flag.
     */
    async pushTag(tagName, remote, deleteTag = false) {
        // Use provided remote name or get the default remote
        if (deleteTag) {
            // Delete tag from remote using --delete flag
            await this.git.push(remote, tagName, ["--delete"]);
        }
        else {
            // Push specific tag to remote
            await this.git.push(remote, tagName);
        }
    }
    /**
     * Fetches a single tag from remote without updating local branches.
     */
    async fetchTag(remote, tagName) {
        await this.git.fetch([remote, `refs/tags/${tagName}:refs/tags/${tagName}`]);
    }
    /**
     * Gets the current branch name.
     */
    async getCurrentBranch() {
        try {
            const status = await this.git.status();
            return status.current || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Renames a local branch. If oldName is not provided, renames the current branch.
     */
    async renameBranch(newName, oldName, upstream) {
        await this.git.raw(["branch", "-m", oldName, newName]);
        if (upstream) {
            let [remote, ...branchParts] = upstream.split("/");
            let oldRemoteBranchName = branchParts.join("/");
            await this.git.push(remote, undefined, [`${newName}`, `:${oldRemoteBranchName}`]);
            await this.git.branch([
                '--set-upstream-to',
                `${remote}/${newName}`,
                newName
            ]);
        }
    }
    /**
     * Stage all modified files.
     */
    async stageAll() {
        await this.git.add(".");
    }
    /**
     * Unstage all staged files.
     */
    async unstageAll() {
        await this.git.reset(["HEAD"]);
    }
    /**
     * Returns list of tracked file paths.
     */
    async getTrackedFilePaths() {
        return (await this.git.raw(["ls-files"]))
            .trim()
            .split("\n");
    }
    /**
     * Returns commit history for a specific file (follows renames).
     */
    async getFileHistory(relativePath) {
        const log = await this.git.log([
            "--name-status",
            "--decorate=full",
            "--follow",
            "--",
            relativePath,
        ]);
        return log.all.map((commit) => {
            const changedFiles = this.parseCommitChangedFiles(commit.diff);
            const parsedRefs = this.parseCommitRefs(commit.refs);
            return {
                hash: commit.hash,
                shortHash: commit.hash.substring(0, 7),
                message: commit.message,
                body: commit.body,
                author: commit.author_name,
                authorEmail: commit.author_email,
                date: new Date(commit.date),
                localBranches: parsedRefs.localBranches,
                remoteBranches: parsedRefs.remoteBranches,
                tags: parsedRefs.tags,
                currentBranchName: parsedRefs.currentBranchName,
                changedFiles,
            };
        });
    }
    /**
     * Restores a file content to the state from a given commit (kept in working tree and staged area unchanged).
     */
    async restoreFileToCommit(filePath, commitHash) {
        await this.git.raw(["restore", "--source", commitHash, "--", filePath]);
    }
    /**
     * Creates a unified diff patch file for changes in the working tree.
     * Returns the absolute path to the created patch file.
     */
    async createPatch(outputDirectoryPath, scope) {
        // Collect untracked files to include in diff
        const status = await this.git.status();
        const untrackedFiles = (status.not_added || []).filter((p) => !!p);
        // Temporarily mark untracked files with intent-to-add so git diff will include them
        if (untrackedFiles.length > 0) {
            await this.git.add(["-N", "--", ...untrackedFiles]);
        }
        try {
            // Generate patch content for all unstaged changes, include binary diffs as well
            let patchContent;
            switch (scope) {
                case "staged":
                    patchContent = await this.git.diff(["--binary", "--staged"]);
                    break;
                case "unstaged":
                    patchContent = await this.git.diff(["--binary"]);
                    break;
                case "all":
                default:
                    patchContent = await this.git.diff(["--binary", "HEAD"]);
                    break;
            }
            // Compose unique patch file name
            const currentDateString = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${this.repoName}_${currentDateString}.patch`;
            const targetPath = (0, path_1.join)(outputDirectoryPath, fileName);
            await fs_2.promises.writeFile(targetPath, patchContent, { encoding: "utf-8" });
            return targetPath;
        }
        finally {
            // Revert intent-to-add marks to avoid changing repo state
            for (const file of untrackedFiles) {
                await this.git.reset(["HEAD", file]);
            }
        }
    }
    /**
     * Creates a patch file for a specific commit.
     * Returns the absolute path to the created patch file.
     */
    async createPatchFromCommit(commitHash, outputDirectoryPath) {
        // Generate a patch using format-patch which properly includes commit metadata and binary files
        const shortHash = commitHash.substring(0, 8);
        const fileName = `${this.repoName}_commit_${shortHash}.patch`;
        const targetPath = (0, path_1.join)(outputDirectoryPath, fileName);
        // Use format-patch with -1 to create patch for a single commit
        // --binary ensures binary files are included
        // --stdout redirects output to be captured instead of written to file
        const patchContent = await this.git.raw(["format-patch", "-1", commitHash, "--binary", "--stdout"]);
        await fs_2.promises.writeFile(targetPath, patchContent, { encoding: "utf-8" });
        return targetPath;
    }
    /**
     * Applies a patch file to the repository.
     * @param patchFilePath - Absolute path to the patch file
     * @throws Will throw an error if the patch cannot be applied
     */
    async applyPatch(patchFilePath) {
        if (!(0, fs_1.existsSync)(patchFilePath)) {
            throw new Error(`Patch file not found: ${patchFilePath}`);
        }
        await this.git.applyPatch(patchFilePath, ["--binary", "--allow-binary-replacement", "--3way"]);
    }
    /**
     * Starts repository cloning as a detached background process using init + fetch approach.
     * Initialization (git init, add remote) is performed via simple-git; the long-running fetch
     * with progress runs in a detached bash script so the Raycast process is not blocked.
     */
    static async startCloneRepository(url, targetPath) {
        if (!(0, fs_1.existsSync)(targetPath)) {
            await fs_2.promises.mkdir(targetPath, { recursive: true });
        }
        // Prepare simple-git instance bound to repo directory
        let gitManager = new GitManager(targetPath);
        // Initialize repository and add remote using simple-git
        await gitManager.initRepository(url);
        // Create temp tracking directory and files outside of the repo dir
        const tempDir = await fs_2.promises.mkdtemp((0, path_1.join)((0, os_1.tmpdir)(), "raycast-git-clone-"));
        // const tempDir = await join("/Users/ernest0n/Downloads", "raycast-git-clone");
        await fs_2.promises.mkdir(tempDir, { recursive: true });
        const stderrPath = (0, path_1.join)(tempDir, ".git-clone-stderr.log");
        const pidPath = (0, path_1.join)(tempDir, ".git-clone-pid.tmp");
        const exitCodePath = (0, path_1.join)(tempDir, ".git-clone-exit.tmp");
        const scriptPath = (0, path_1.join)(tempDir, ".git-clone-script.zsh");
        await fs_2.promises.writeFile(stderrPath, "");
        await fs_2.promises.writeFile(pidPath, "");
        // Detached bash script: fetch with progress, set default branch, checkout
        const bashScript = `#!/bin/zsh

echo $$ > "${pidPath}"
export PATH="${environment_utils_1.shellEnvironmentVariables.PATH}"
cd "${targetPath}"

# Fetch with progress (shallow to speed up initial clone)
git fetch --depth 1 --progress origin 2> "${stderrPath}"

# Set default remote HEAD
git remote set-head origin -a 2>> "${stderrPath}"

# Detect default branch name (e.g., origin/main)
default_branch=$(git rev-parse --abbrev-ref origin/HEAD)

if [ -n "$default_branch" ]; then
  git checkout -b "$default_branch" "$default_branch" 2>> "${stderrPath}"
fi

echo $? > "${exitCodePath}"
rm -f "${scriptPath}"
`;
        await fs_2.promises.writeFile(scriptPath, bashScript, { encoding: "utf-8" });
        // Set executable permissions for the script: 0o755 means rwxr-xr-x (owner can read/write/execute, group and others can read/execute)
        (0, fs_1.chmodSync)(scriptPath, 0o755);
        // Run script detached so it survives the parent process
        (0, child_process_1.exec)(`nohup "${scriptPath}" > /dev/null 2>&1 &`, { shell: "/bin/zsh" });
        return { url, stderrPath, pidPath, exitCodePath, scriptPath };
    }
    /**
     * Initializes a repository and adds a remote.
     */
    async initRepository(url) {
        await this.git.init();
        await this.git.addRemote("origin", url);
    }
    /**
     * Gets the progress of the cloning process.
     */
    getClonningState(cloningProcess) {
        if (!(0, fs_1.existsSync)(cloningProcess.pidPath)) {
            return undefined;
        }
        const pid = parseInt((0, fs_1.readFileSync)(cloningProcess.pidPath, "utf8").trim(), 10);
        const output = (0, fs_1.readFileSync)(cloningProcess.stderrPath, "utf8")
            .replace(/\r/g, '\n')
            .split('\n')
            .filter(Boolean)
            .pop()
            || "";
        const exitCode = (0, fs_1.existsSync)(cloningProcess.exitCodePath) ? parseInt((0, fs_1.readFileSync)(cloningProcess.exitCodePath, "utf8").trim(), 10) : undefined;
        return {
            pid,
            output: output.trim(),
            exitCode,
        };
    }
    /**
     * Cleans up the cloning process.
     */
    cleanupCloningProcess(cloningProcess) {
        if ((0, fs_1.existsSync)(cloningProcess.stderrPath)) {
            (0, fs_1.rmSync)(cloningProcess.stderrPath);
        }
        if ((0, fs_1.existsSync)(cloningProcess.pidPath)) {
            (0, fs_1.rmSync)(cloningProcess.pidPath);
        }
        if ((0, fs_1.existsSync)(cloningProcess.exitCodePath)) {
            (0, fs_1.rmSync)(cloningProcess.exitCodePath);
        }
        if ((0, fs_1.existsSync)(cloningProcess.scriptPath)) {
            (0, fs_1.rmSync)(cloningProcess.scriptPath);
        }
    }
    /**
     * Kills the cloning process.
     */
    async killCloningProcess(cloningProcess) {
        const progress = this.getClonningState(cloningProcess);
        if (!progress)
            return;
        // Kill the cloning process and all its children
        (0, child_process_1.exec)(`pkill -TERM -P ${progress.pid}; kill -TERM ${progress.pid};`);
    }
}
exports.GitManager = GitManager;
