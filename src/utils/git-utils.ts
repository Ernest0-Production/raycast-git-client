import {
  DiffNameStatus,
  DiffResult,
  DiffResultBinaryFile,
  DiffResultNameStatusFile,
  DiffResultTextFile,
  FileStatusResult,
  simpleGit,
  SimpleGit,
} from "simple-git";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { join } from "path";
import { readFileSync } from "fs";
import {
  Branch,
  FileStatus,
  Commit,
  Stash,
  BranchesState,
  DetachedHead,
  CommitFileChange,
  Preferences,
} from "../types";

/**
 * Manager for Git operations within a repository.
 * Provides a high-level API for all Git operations.
 */
export class GitManager {
  private git: SimpleGit;
  public readonly repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);

    // Global logging of all git commands for debugging
    this.setupGlobalLogging();
  }

  /**
   * Gets user preferences with parsed numeric values.
   */
  private getPreferences() {
    const preferences = getPreferenceValues<Preferences>();
    return {
      maxFilesToShow: parseInt(preferences.maxFilesToShow, 10) || 500,
      maxBranchesToShow: parseInt(preferences.maxBranchesToShow, 10) || 200,
      commitsPerPage: parseInt(preferences.commitsPerPage, 10) || 20,
    };
  }

  /**
   * Gets the repository name from the path.
   */
  get repoName(): string {
    return this.repoPath.split("/").pop() || "Unknown Repository";
  }

  /**
   * Sets up global logging of git commands and streaming output.
   */
  private setupGlobalLogging(): void {
    this.git.outputHandler((command, stdout, stderr, args) => {
      const command_description = `${command} ${args.join(" ")}`;

      // Log the full command for debugging
      console.log(`[GIT] ${command_description}`);

      showToast({ style: Toast.Style.Animated, title: command_description, message: "Running..." });

      let lastOutput = "";
      let hasError = false;

      // Process stdout (standard output)
      stdout.on("data", (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          lastOutput = output;
          // console.log(`[GIT STDOUT] ${output}`);
        }
      });

      // Process stderr (errors)
      stderr.on("data", (data: Buffer) => {
        const error = data.toString().trim();
        if (error) {
          hasError = true;
          lastOutput = error;
          // showToast({ style: Toast.Style.Failure, title: `Error running command: ${command_description}`, message: error });
          console.error(`[GIT STDERR] ${error}`);
        }
      });

      // Show the final result on completion
      stdout.on("end", () => {
        if (!hasError) {
          showToast({ style: Toast.Style.Success, title: command_description, message: lastOutput });
          if (lastOutput) {
            showToast({ style: Toast.Style.Success, title: command_description, message: lastOutput });
          } else {
            showToast({ style: Toast.Style.Success, title: command_description, message: "Command executed successfully" });
          }
        } else {
          showToast({ style: Toast.Style.Failure, title: `Error running command: ${command_description}`, message: lastOutput });
        }
      });
    });
  }

  /**
   * Gets the branches state including current branch, detached HEAD, local and remote branches.
   */
  async getBranches(): Promise<BranchesState> {
    const summary = await this.git.branch(["--all", "-vv", "--sort=-committerdate"]);

    // Get uncommitted changes status for current branch
    const hasUncommittedChanges = await this.hasUncommittedChanges();

    const parseBranchInfo = (label: string): { ahead: number; behind: number; upstream?: string } => {
      const aheadMatch = label.match(/ahead (\d+)/);
      const behindMatch = label.match(/behind (\d+)/);
      const upstreamMatch = label.match(/\[(.*?)(: ahead \d+| behind \d+)*\]/);

      return {
        ahead: aheadMatch ? parseInt(aheadMatch[1], 10) : 0,
        behind: behindMatch ? parseInt(behindMatch[1], 10) : 0,
        upstream: upstreamMatch ? upstreamMatch[1] : undefined,
      };
    };

    let currentBranch: Branch | undefined;
    let detachedHead: DetachedHead | undefined;
    const localBranches: Branch[] = [];
    const remoteBranches: Branch[] = [];

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
        hasUncommittedChanges,
      };
    } else if (summary.current) {
      // Current Branch
      const currentBranchDetails = summary.branches[summary.current];
      if (currentBranchDetails) {
        const { ahead, behind, upstream } = parseBranchInfo(currentBranchDetails.label);

        currentBranch = {
          name: currentBranchDetails.name,
          type: "current",
          ahead,
          behind,
          upstream,
          hasUncommittedChanges,
          lastCommitMessage: this.extractCommitMessage(currentBranchDetails.label),
          lastCommitHash: currentBranchDetails.commit,
        };
      }
    }

    // Local Branches
    Object.values(summary.branches).forEach((branch) => {
      if (!branch.name.startsWith("remotes/") && !branch.current) {
        const { ahead, behind, upstream } = parseBranchInfo(branch.label);

        localBranches.push({
          name: branch.name,
          type: "local",
          ahead,
          behind,
          upstream,
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
        const branchName = remoteNameParts.join("/");

        // Avoid adding remote HEAD pointers
        if (branchName === "HEAD" || !branchName) return;

        remoteBranches.push({
          name: branchName,
          type: "remote",
          remote: remote,
          upstream: branch.name, // The full remote name is the upstream ref
          lastCommitMessage: this.extractCommitMessage(branch.label),
          lastCommitHash: branch.commit,
        });
      }
    });

    // Apply performance limits
    const { maxBranchesToShow } = this.getPreferences();
    const totalBranches = localBranches.length + remoteBranches.length + (currentBranch ? 1 : 0);
    if (totalBranches > maxBranchesToShow) {
      const limitPerType = Math.floor(maxBranchesToShow / 2);
      return {
        currentBranch,
        detachedHead,
        localBranches: localBranches.slice(0, limitPerType),
        remoteBranches: remoteBranches.slice(0, limitPerType),
      };
    }

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
  async getStatus(): Promise<FileStatus[]> {
    const status = await this.git.status();
    const files: FileStatus[] = [];

    // Process each file using detailed status information
    for (const fileStatus of status.files) {
      const fileEntries = this.parseFileStatus(fileStatus);
      files.push(...fileEntries);
    }

    // Limit the number of files for performance
    const { maxFilesToShow } = this.getPreferences();
    if (files.length > maxFilesToShow) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Performance Optimization",
        message: `Showing ${maxFilesToShow} of ${files.length} files for better performance`,
      });
      return files.slice(0, maxFilesToShow);
    }

    return files;
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
  private parseFileStatus(fileStatus: FileStatusResult): FileStatus[] {
    const results: FileStatus[] = [];
    const { index, working_dir, path, from } = fileStatus;

    // Helper function to create file status object
    const createFileStatus = (status: FileStatus["status"], type: FileStatus["type"]): FileStatus => ({
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
  private extractCommitMessage(label: string): string {
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
  private parseCommitRefs(refsString: string | undefined): {
    localBranches: string[];
    remoteBranches: string[];
    tags: string[];
    currentBranchName?: string;
  } {
    const result = {
      localBranches: [] as string[],
      remoteBranches: [] as string[],
      tags: [] as string[],
      currentBranchName: undefined as string | undefined,
    };

    if (!refsString || !refsString.trim()) {
      return result;
    }

    const refs = refsString.split(", ").map((ref) => ref.trim());

    for (const ref of refs) {
      if (ref.startsWith("tag:")) {
        // Extract tag name: "tag: v1.0.0" -> "v1.0.0"
        const tagName = ref.replace(/^tag:\s*/, "").trim();
        if (tagName) {
          result.tags.push(tagName);
        }
      } else if (ref.includes("HEAD ->")) {
        // Current branch: "HEAD -> main" or "origin/HEAD -> origin/main"
        const match = ref.match(/HEAD\s*->\s*(.+)/);
        if (!match) continue;

        const branchName = match[1].trim();
        result.currentBranchName = branchName;
      } else if (ref.includes("/") && !ref.startsWith("HEAD")) {
        // Remote branch: "origin/main", "upstream/feature"
        const parts = ref.split("/");
        if (parts.length >= 2) {
          if (!result.remoteBranches.includes(ref)) {
            result.remoteBranches.push(ref);
          }
        }
      } else if (ref && !ref.includes("HEAD")) {
        // Local branch
        if (!result.localBranches.includes(ref)) {
          result.localBranches.push(ref);
        }
      }
    }

    return result;
  }

  /**
   * Gets the last commit from the repository.
   */
  async getLastCommit(): Promise<Commit | null> {
    try {
      const log = await this.git.log([
        "--max-count=1",
        "--name-status",
      ]);

      if (!log.latest) {
        return null;
      }

      const commit = log.latest;
      const changedFiles = this.parseCommitChangedFiles(commit.diff!);
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
    } catch (error) {
      return null;
    }
  }

  /**
   * Gets the commit history with optional offset for pagination.
   * @param branch Branch name to get commits from (optional)
   * @param page Page number for pagination (optional, default 0)
   */
  async getCommits(branch?: string, page: number = 0): Promise<Commit[]> {
    const { commitsPerPage } = this.getPreferences();
    const log = await this.git.log([
      `--max-count=${commitsPerPage}`,
      `--skip=${page * commitsPerPage}`,
      "--name-status",
      ...(branch ? [branch] : []),
    ]);

    return log.all.map(
      (commit: {
        hash: string;
        message: string;
        body: string;
        author_name: string;
        author_email: string;
        date: string;
        refs?: string;
        diff?: DiffResult;
      }) => {
        const changedFiles = this.parseCommitChangedFiles(commit.diff!);
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
      },
    );
  }

  /**
   * Parses the changed files from git log --name-status diff output.
   */
  private parseCommitChangedFiles(diff: DiffResult): CommitFileChange[] {
    // Helper function to map DiffNameStatus to typed status names
    function mapDiffNameStatusToTypedStatus(status: DiffNameStatus): CommitFileChange["status"] {
      switch (status) {
        case DiffNameStatus.ADDED:
          return "added";
        case DiffNameStatus.MODIFIED:
          return "modified";
        case DiffNameStatus.DELETED:
          return "deleted";
        case DiffNameStatus.RENAMED:
          return "renamed";
        case DiffNameStatus.COPIED:
          return "copied";
        case DiffNameStatus.CHANGED:
          return "changed";
        default:
          // Fallback for any unexpected status
          return "modified";
      }
    }

    if (!diff || !diff.files) {
      return [];
    }

    return diff.files.map((file: DiffResultTextFile | DiffResultBinaryFile | DiffResultNameStatusFile) => {
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
   * Checks out the specified branch.
   */
  async checkoutBranch(branchName: string): Promise<void> {
    if (!branchName || typeof branchName !== "string" || branchName.trim().length === 0) {
      throw new Error("Invalid branch name");
    }
    if (branchName.includes("..") || branchName.includes(" ")) {
      throw new Error("Branch name contains invalid characters");
    }
    await this.git.checkout(branchName.trim());
  }

  /**
   * Checks out a specific commit (creates detached HEAD state).
   */
  async checkoutCommit(commitHash: string): Promise<void> {
    if (!commitHash || typeof commitHash !== "string" || commitHash.trim().length === 0) {
      throw new Error("Invalid commit hash");
    }

    await this.git.checkout(commitHash.trim());
  }

  /**
   * Creates a new branch.
   */
  async createBranch(name: string): Promise<void> {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Invalid branch name");
    }
    if (name.includes("..") || name.includes(" ") || name.startsWith("-")) {
      throw new Error("Branch name contains invalid characters");
    }
    await this.git.checkoutLocalBranch(name.trim());
  }

  /**
   * Deletes a local branch.
   */
  async deleteBranch(name: string, force = false): Promise<void> {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Invalid branch name");
    }
    if (name.includes("..") || name.includes(" ")) {
      throw new Error("Branch name contains invalid characters");
    }
    await this.git.deleteLocalBranch(name.trim(), force);
  }

  /**
   * Deletes a remote branch.
   */
  async deleteRemoteBranch(remote: string, branchName: string): Promise<void> {
    if (!remote || !branchName) {
      throw new Error("Invalid remote or branch name");
    }
    await this.git.push(remote, branchName, ["--delete"]);
  }

  /**
   * Adds a file to the staging area.
   */
  async stageFile(file: string): Promise<void> {
    if (!file || typeof file !== "string" || file.trim().length === 0) {
      throw new Error("Invalid file path");
    }
    await this.git.add(file.trim());
  }

  /**
   * Removes a file from the staging area.
   */
  async unstageFile(file: string): Promise<void> {
    if (!file || typeof file !== "string" || file.trim().length === 0) {
      throw new Error("Invalid file path");
    }
    await this.git.reset(["HEAD", file.trim()]);
  }

  /**
   * Discards changes in a file.
   */
  async discardChanges(file: string): Promise<void> {
    if (!file || typeof file !== "string" || file.trim().length === 0) {
      throw new Error("Invalid file path");
    }
    await this.git.checkout(["--", file.trim()]);
  }

  /**
   * Discards all unstaged changes in the repository.
   */
  async discardAllChanges(): Promise<void> {
    await this.git.checkout(["--", "."]);
  }

  /**
   * Cherry-picks a commit.
   */
  async cherryPick(commitHash: string): Promise<void> {
    if (!commitHash || typeof commitHash !== "string" || !/^[a-f0-9]{7,40}$/i.test(commitHash.trim())) {
      throw new Error("Invalid commit hash");
    }
    await this.git.raw(["cherry-pick", commitHash.trim()]);
  }

  /**
   * Reverts a commit.
   */
  async revert(commitHash: string): Promise<void> {
    if (!commitHash || typeof commitHash !== "string" || !/^[a-f0-9]{7,40}$/i.test(commitHash.trim())) {
      throw new Error("Invalid commit hash");
    }
    await this.git.raw(["revert", "--no-edit", commitHash.trim()]);
  }

  /**
   * Resets to the specified commit.
   */
  async reset(commitHash: string, mode = "--hard"): Promise<void> {
    if (!commitHash || typeof commitHash !== "string" || !/^[a-f0-9]{7,40}$/i.test(commitHash.trim())) {
      throw new Error("Invalid commit hash");
    }
    const allowedModes = ["--soft", "--mixed", "--hard"];
    if (!allowedModes.includes(mode)) {
      throw new Error("Invalid reset mode");
    }
    await this.git.raw(["reset", mode, commitHash.trim()]);
  }

  /**
   * Creates a commit with a message.
   */
  async commit(message: string, amend = false): Promise<void> {
    if (amend) {
      await this.git.raw(["commit", "--amend", "-m", message]);
    } else {
      await this.git.commit(message);
    }
  }

  /**
   * Pushes changes.
   */
  async push(force = false): Promise<void> {
    const options = force ? ["--force-with-lease"] : [];
    await this.git.push(undefined, undefined, options);
  }

  /**
   * Pulls changes.
   */
  async pull(rebase = false): Promise<void> {
    const pullArgs = ["--prune", "--tags"];
    if (rebase) {
      pullArgs.push("--rebase");
    }
    await this.git.pull(undefined, undefined, pullArgs);
  }

  /**
   * Fetches changes.
   */
  async fetch(): Promise<void> {
    await this.git.fetch(["--all", "--prune", "--tags"]);
  }

  /**
   * Creates a stash with an optional message.
   */
  async stash(message?: string): Promise<void> {
    if (message) {
      await this.git.stash(["push", "-m", message]);
    } else {
      await this.git.stash();
    }
  }

  /**
   * Creates a stash for a specific file with an optional message.
   */
  async stashFile(filePath: string, message?: string): Promise<void> {
    const args = ["push"];
    if (message) {
      args.push("-m", message);
    }
    args.push("--", filePath);
    await this.git.stash(args);
  }

  /**
   * Applies a stash by index.
   */
  async applyStash(index = 0): Promise<void> {
    await this.git.stash(["apply", `stash@{${index}}`]);
  }

  /**
   * Applies and removes a stash (pop).
   */
  async popStash(index = 0): Promise<void> {
    await this.git.stash(["pop", `stash@{${index}}`]);
  }

  /**
   * Drops a stash by index.
   */
  async dropStash(index = 0): Promise<void> {
    await this.git.stash(["drop", `stash@{${index}}`]);
  }

  /**
   * Gets a list of all stashes.
   */
  async getStashes(): Promise<Stash[]> {
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
  async createTag(tagName: string, commitHash: string, message?: string): Promise<void> {
    if (!tagName || typeof tagName !== "string" || tagName.trim().length === 0) {
      throw new Error("Invalid tag name");
    }
    if (!commitHash || typeof commitHash !== "string" || !/^[a-f0-9]{7,40}$/i.test(commitHash.trim())) {
      throw new Error("Invalid commit hash");
    }

    const args = ["tag"];
    if (message && message.trim()) {
      args.push("-a", tagName.trim(), "-m", message.trim(), commitHash.trim());
    } else {
      args.push(tagName.trim(), commitHash.trim());
    }

    await this.git.raw(args);
  }

  /**
   * Gets the absolute path to a file.
   */
  private getAbsolutePath(relativePath: string): string {
    return join(this.repoPath, relativePath);
  }

  /**
   * Gets the diff for a file or commit.
   */
  async getDiff(options?: { file: string; commitHash?: string; status?: FileStatus["status"] }): Promise<string> {
    // If no commitHash and no status, return diff of all staged changes
    if (!options) {
      return await this.git.diff(["--staged"]);
    }

    if (options.status === "untracked") {
      const filePath = this.getAbsolutePath(options.file);
      return readFileSync(filePath, 'utf-8').replace(/^/gm, '+');
    }

    const diffOptions: string[] = [];
    if (options.commitHash) {
      diffOptions.push(`${options.commitHash}^`, options.commitHash);
    } else if (options.status === "staged") {
      diffOptions.push("--staged");
    }

    diffOptions.push("--", options.file);

    const cleanGitDiff = (diff: string): string => {
      const lines = diff.split('\n');

      // Найти первую строку с @@ (начало хунка изменений)
      const firstChunkIndex = lines.findIndex(line => line.startsWith('@@'));

      if (firstChunkIndex === -1) {
        // Если нет @@, значит нет изменений контента
        return '';
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
  async mergeBranch(branchName: string, noFF = false): Promise<void> {
    if (!branchName || typeof branchName !== "string" || branchName.trim().length === 0) {
      throw new Error("Invalid branch name");
    }
    const options = noFF ? ["--no-ff"] : [];
    await this.git.merge([branchName.trim(), ...options]);
  }

  /**
   * Rebases the current branch onto the specified branch.
   */
  async rebase(targetBranch: string, interactive = false): Promise<void> {
    if (!targetBranch || typeof targetBranch !== "string" || targetBranch.trim().length === 0) {
      throw new Error("Invalid target branch name");
    }
    const options = interactive ? ["--interactive"] : [];
    await this.git.rebase([targetBranch.trim(), ...options]);
  }

  /**
   * Aborts an ongoing rebase.
   */
  async abortRebase(): Promise<void> {
    await this.git.rebase(["--abort"]);
  }

  /**
   * Continues an ongoing rebase.
   */
  async continueRebase(): Promise<void> {
    await this.git.rebase(["--continue"]);
  }

  /**
   * Gets a list of all remotes.
   */
  async getRemotes(): Promise<{ name: string; url: string }[]> {
    const remotes = await this.git.getRemotes(true);
    return remotes.map((remote) => ({
      name: remote.name,
      url: remote.refs.fetch || remote.refs.push || "",
    }));
  }

  /**
   * Gets the default remote name (usually 'origin', but can be the first available remote).
   */
  async getDefaultRemote(): Promise<string> {
    try {
      const remotes = await this.getRemotes();

      if (remotes.length === 0) {
        throw new Error("No remotes found");
      }

      // Prefer 'origin' if it exists
      const originRemote = remotes.find((remote) => remote.name === "origin");
      if (originRemote) {
        return originRemote.name;
      }

      // Otherwise, return the first available remote
      return remotes[0].name;
    } catch (error) {
      throw new Error("Failed to get default remote");
    }
  }

  /**
   * Adds a new remote.
   */
  async addRemote(name: string, url: string): Promise<void> {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Invalid remote name");
    }
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      throw new Error("Invalid remote URL");
    }
    await this.git.addRemote(name.trim(), url.trim());
  }

  /**
   * Removes a remote.
   */
  async removeRemote(name: string): Promise<void> {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Invalid remote name");
    }
    await this.git.removeRemote(name.trim());
  }

  /**
   * Gets a list of all tags.
   */
  async getTags(): Promise<string[]> {
    const tags = await this.git.tags();
    return tags.all;
  }

  /**
   * Deletes a tag.
   */
  async deleteTag(tagName: string): Promise<void> {
    if (!tagName || typeof tagName !== "string" || tagName.trim().length === 0) {
      throw new Error("Invalid tag name");
    }
    await this.git.raw(["tag", "-d", tagName.trim()]);
  }

  /**
 * Pushes tags to remote with optional delete flag.
 */
  async pushTag(tagName: string, remoteName?: string, deleteTag: boolean = false): Promise<void> {
    if (!tagName || typeof tagName !== "string" || tagName.trim().length === 0) {
      throw new Error("Invalid tag name");
    }

    // Use provided remote name or get the default remote
    const targetRemote = remoteName || (await this.getDefaultRemote());

    if (deleteTag) {
      // Delete tag from remote using --delete flag
      await this.git.push(targetRemote, tagName, ['--delete']);
    } else {
      // Push specific tag to remote
      await this.git.push(targetRemote, tagName);
    }
  }

  /**
   * Checks if the repository has any uncommitted changes.
   */
  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return status.files.length > 0;
  }

  /**
   * Checks if the repository has any unresolved conflicts.
   */
  async hasConflicts(): Promise<boolean> {
    const status = await this.git.status();
    return status.conflicted.length > 0;
  }

  /**
   * Gets the current branch name.
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const status = await this.git.status();
      return status.current || null;
    } catch {
      return null;
    }
  }

  /**
   * Stage all modified files.
   */
  async stageAll(): Promise<void> {
    await this.git.add(".");
  }

  /**
   * Unstage all staged files.
   */
  async unstageAll(): Promise<void> {
    await this.git.reset(["HEAD"]);
  }
}
