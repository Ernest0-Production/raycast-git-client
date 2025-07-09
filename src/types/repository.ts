/**
 * Represents a Git repository with access information.
 */
export interface Repository {
  /** Unique identifier for the repository. */
  id: string;
  /** The name of the repository (usually the folder name). */
  name: string;
  /** The full path to the repository. */
  path: string;
}
