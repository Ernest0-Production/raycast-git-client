import { Application } from "@raycast/api";

// Export all types from modules
export * from "./repository";
export * from "./git";
export * from "./ui";

/**
 * User preferences for the Git Client extension.
 */
export interface Preferences {
  /** Default editor for opening files. */
  defaultEditor: Application;
  /** Default terminal for opening repository directory. */
  defaultTerminal: Application;
  /** External git client for git commands. */
  externalGitClient?: Application;
  /** Specifies the PATH environment variable for Git operations. */
  environmentPath: "parent" | "homebrew";
  /** Number of commits to load per pagination page. */
  commitsPerPage: string;
  /** Maximum number of branches to load per pagination page. */
  maxBranchesToLoad: string;
  /** System prompt for AI-generated commit messages. */
  aiCommitPrompt: string;
  /** Automatically generate a commit message using AI when opening the commit view. */
  autoGenerateCommitMessage: boolean;
}

/**
 * Configuration for URL tracking feature.
 */
export interface UrlTrackerConfig {
  /** Unique identifier for the configuration. */
  id: string;
  /** Title of the URL tracker (e.g., "Jira Ticket", "GitHub Issue"). */
  title: string;
  /** Regular expression pattern to extract components from commit messages. */
  regex: string;
  /** URL template where @key will be replaced with the regex match. */
  urlPlaceholder: string;
}
