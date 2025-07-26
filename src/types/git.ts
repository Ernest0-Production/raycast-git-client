/**
 * Represents a Git branch with status information.
 */
export interface Branch {
  /** The name of the branch. */
  name: string;
  /** The type of the branch: current, local, or remote. */
  type: "current" | "local" | "remote";
  /** The upstream branch, if any. */
  upstream?: string;
  /** The number of commits ahead of upstream. */
  ahead?: number;
  /** The number of commits behind upstream. */
  behind?: number;
  /** The name of the remote (for remote branches). */
  remote?: string;
  /** The message of the last commit on this branch (first line only). */
  lastCommitMessage?: string;
  /** The short hash of the last commit on this branch. */
  lastCommitHash?: string;
  /** Whether this branch has uncommitted changes (only for current branch). */
  hasUncommittedChanges?: boolean;
}

/**
 * Represents a detached HEAD state.
 */
export interface DetachedHead {
  /** The commit hash that HEAD is pointing to. */
  commitHash: string;
  /** The short commit hash. */
  shortCommitHash: string;
  /** The commit message. */
  commitMessage: string;
  /** The date of the commit. */
  commitDate: Date;
  /** Whether there are uncommitted changes. */
  hasUncommittedChanges: boolean;
}

/**
 * Represents the current state of branches in the repository.
 */
export interface BranchesState {
  /** Current branch if checked out to a branch. */
  currentBranch?: Branch;
  /** Detached HEAD state if not on a branch. */
  detachedHead?: DetachedHead;
  /** All local branches. */
  localBranches: Branch[];
  /** All remote branches. */
  remoteBranches: Branch[];
}

/**
 * Represents the status of a file in a Git repository.
 */
export interface FileStatus {
  /** The full path to the file. */
  path: string;
  /** The relative path from the repository root. */
  relativePath: string;
  /** The status of the file in the working area. */
  status: "staged" | "unstaged" | "untracked";
  /** The type of change to the file. */
  type: "added" | "modified" | "deleted" | "renamed" | "copied" | "conflicted";
  /** The old path (for renamed files). */
  oldPath?: string;
}

/**
 * Represents a changed file in a commit with git name-status information.
 */
export interface CommitFileChange {
  /** The status of the file change. */
  status: "added" | "modified" | "deleted" | "renamed" | "copied" | "changed";
  /** The file path. */
  path: string;
  /** The old file path (for renamed/copied files). */
  oldPath?: string;
}

/**
 * Represents a Git commit.
 */
export interface Commit {
  /** The full hash of the commit. */
  hash: string;
  /** The short hash of the commit. */
  shortHash: string;
  /** The commit message. */
  message: string;
  /** The body of the commit. */
  body: string;
  /** The author's name. */
  author: string;
  /** The author's email. */
  authorEmail: string;
  /** The date the commit was created. */
  date: Date;
  /** The commit's branch (if applicable). */
  branch?: string;
  /** A list of tags and branches associated with the commit. */
  refs?: string[];
  /** List of files changed in this commit with their status. */
  changedFiles?: CommitFileChange[];
}

/**
 * Represents an entry in the stash (staged changes).
 */
export interface Stash {
  /** The message associated with the stash. */
  message: string;
  /** The hash of the commit on which the stash was created. */
  hash: string;
  /** The date the stash was created. */
  date: Date;
  /** The author of the stash. */
  author: string;
  /** The author's email. */
  authorEmail: string;
}

/**
 * Represents a Git remote repository.
 */
export interface Remote {
  /** The name of the remote (e.g., 'origin'). */
  name: string;
  /** The URL of the remote repository. */
  url: string;
}

/**
 * Represents a Git tag.
 */
export interface Tag {
  /** The name of the tag. */
  name: string;
  /** The message associated with the tag (if any). */
  message?: string;
  /** The commit hash the tag points to. */
  commitHash: string;
  /** The date the tag was created. */
  date?: Date;
}

/**
 * Git operation result types for better error handling.
 */
export type GitOperationResult<T = void> = Promise<T>;

/**
 * Git reset modes.
 */
export type GitResetMode = "--soft" | "--mixed" | "--hard";

/**
 * Git merge strategies.
 */
export type GitMergeStrategy = "resolve" | "recursive" | "octopus" | "ours" | "subtree";

/**
 * Configuration for Git diff operations.
 */
export interface GitDiffOptions {
  /** Path to specific file to diff. */
  file?: string;
  /** Commit hash to diff. */
  commitHash?: string;
  /** Whether to show staged changes. */
  staged?: boolean;
  /** Number of context lines. */
  context?: number;
}

/**
 * Configuration for Git log operations.
 */
export interface GitLogOptions {
  /** Maximum number of commits to retrieve. */
  maxCount?: number;
  /** Starting commit hash or branch. */
  from?: string;
  /** Ending commit hash or branch. */
  to?: string;
  /** Include only commits from specific author. */
  author?: string;
  /** Include only commits with messages containing this text. */
  grep?: string;
}

/**
 * Git repository status information.
 */
export interface GitRepositoryStatus {
  /** Current branch name. */
  currentBranch: string | null;
  /** Whether the repository is in a clean state. */
  isClean: boolean;
  /** Whether there are uncommitted changes. */
  hasUncommittedChanges: boolean;
  /** Whether there are untracked files. */
  hasUntrackedFiles: boolean;
  /** Whether the repository is ahead of remote. */
  isAhead: boolean;
  /** Whether the repository is behind remote. */
  isBehind: boolean;
  /** Number of commits ahead of remote. */
  aheadCount: number;
  /** Number of commits behind remote. */
  behindCount: number;
}
