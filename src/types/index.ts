// Export all types from modules
export * from "./repository";
export * from "./git";
export * from "./ui";

/**
 * User preferences for the Git Client extension.
 */
export interface Preferences {
  /** Default editor for opening files. */
  defaultEditor: string;
  /** Maximum number of files to display in status view. */
  maxFilesToShow: string;
  /** Maximum number of branches to display. */
  maxBranchesToShow: string;
  /** Number of commits to load per pagination page. */
  commitsPerPage: string;
  /** System prompt for AI-generated commit messages. */
  aiCommitPrompt: string;
}

/**
 * Configuration for URL tracking feature.
 */
export interface UrlTrackerConfig {
  /** Title of the URL tracker (e.g., "Jira Ticket", "GitHub Issue"). */
  title: string;
  /** Regular expression pattern to extract components from commit messages. */
  regex: string;
  /** URL template where @key will be replaced with the regex match. */
  url_placeholder: string;
}
