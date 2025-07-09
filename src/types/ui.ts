/**
 * Git repository view types.
 */
export type GitView = "branches" | "status" | "commits" | "stashes";

/**
 * Repository view state.
 */
export interface ViewState {
  /** The currently active view. */
  currentView: GitView;
  /** The path to the repository. */
  repositoryPath: string;
  /** The name of the repository. */
  repositoryName: string;
}

/**
 * Extension preferences.
 */
export interface Preferences {
  /** The default editor for opening files. */
  defaultEditor: string;
}
