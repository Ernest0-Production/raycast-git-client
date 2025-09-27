
/**
 * Represents a Git repository with access information.
 */
import { Color } from "@raycast/api";

export interface Repository {
  /** Unique identifier for the repository. */
  id: string;
  /** The name of the repository (usually the folder name). */
  name: string;
  /** The full path to the repository. */
  path: string;
  /** Unix timestamp (ms) of the last time the repository was opened. */
  lastOpenedAt: number;
  /** Cached language detection stats for the repository. */
  languageStats?: LanguageStats[];
}

/**
 * Primary programming language statistics for a repository.
 */
export interface LanguageStats {
  /** Human-friendly language name. */
  name: string;
  /** Percentage of tracked files belonging to this language. */
  percentage: number;
  /** Optional UI color to display for the language. */
  color?: Color;
}


/**
 * Represents a Git branch with status information.
 */
export interface Branch {
  /** The name of the branch. */
  name: string;
  /** The display name of the branch. */
  displayName: string;
  /** The type of the branch: current, local, or remote. */
  type: "current" | "local" | "remote";
  /** The upstream branch, if any. */
  upstream?: string;
  /** The number of commits ahead of upstream. */
  ahead?: number;
  /** The number of commits behind upstream. */
  behind?: number;
  /** Whether this branch is gone from remote. */
  isGone?: boolean;
  /** The name of the remote (for remote branches). */
  remote?: string;
  /** The message of the last commit on this branch (first line only). */
  lastCommitMessage?: string;
  /** The short hash of the last commit on this branch. */
  lastCommitHash?: string;
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
  /** All remote branches grouped by remote name. */
  remoteBranches: Record<string, Branch[]>;
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
  /** Local branches that contain this commit. */
  localBranches: string[];
  /** Remote branches that contain this commit. */
  remoteBranches: string[];
  /** Tags pointing to this commit. */
  tags: string[];
  /** Name of the current branch if commit is on it. */
  currentBranchName?: string;
  /** List of files changed in this commit with their status. */
  changedFiles?: CommitFileChange[];
}

/**
 * Action for a single commit in interactive rebase plan.
 */
export type RebaseAction = "pick" | "reword" | "edit" | "drop" | "squash" | "fixup";

/**
 * Describes plan item for interactive rebase execution.
 */
export interface RebasePlanItem {
  /** Commit full hash. */
  hash: string;
  /** Selected action. */
  action: RebaseAction;
  /** Optional new message for reword action (single line). */
  newMessage?: string;
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
 * Known Git hosting providers.
 */
export type RemoteProvider =
  | "github"
  | "gitlab"
  | "bitbucket"
  | "azure-devops"
  | "gitea"
  | undefined;

/**
 * Connection protocol type for a remote URL.
 */
export type RemoteProtocol = "ssh" | "http";

/**
 * Detailed metadata for a Git remote.
 */
export interface RemoteMetadata {
  /** The remote name (e.g., origin). */
  name: string;
  /** Fetch and push URLs for the remote if present. */
  urls: {
    fetch?: string;
    push?: string;
  };
  /** Connection protocol detected from URL (ssh or http). */
  type: RemoteProtocol;
  /** Detected hosting provider or undefined if unknown. */
  provider: RemoteProvider;
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
 * Represents per-file change statistics (insertions/deletions).
 */
export interface FileChangeStats {
  /** Number of inserted lines in the file. */
  insertions: number;
  /** Number of deleted lines in the file. */
  deletions: number;
}

/**
 * Represents the state of a git conflict.
 */
export interface ConflictState {
  type: "rebase" | "merge" | "squash" | undefined;
  /** The current step of the conflict resolution. */
  current: number;
  /** The total number of steps in the conflict resolution. */
  total: number;
}

/**
 * Represents the status of the repository.
 */
export interface StatusState {
  /** The current branch name, or null if in a detached HEAD state. */
  branch: string | null;
  /** An array of file statuses. */
  files: FileStatus[];
  /** Information about an ongoing conflict, if any. */
  conflict?: ConflictState;
}

/**
 * Represents the mode of a merge.
 */
export enum MergeMode {
  FAST_FORWARD = "ff",
  NO_FF = "no-ff",
  SQUASH = "squash",
  NO_COMMIT = "no-commit",
}

export enum PatchScope {
  ALL = "all",
  STAGED = "staged",
  UNSTAGED = "unstaged",
}
