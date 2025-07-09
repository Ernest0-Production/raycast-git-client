import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * The result of a Git repository validation.
 */
export interface ValidationResult {
  /** Whether the path is a valid Git repository. */
  isValid: boolean;
  /** The error message, if any. */
  error?: string;
}

/**
 * Resolves a tilde (~) path to an absolute path.
 * @param path - The path, which may start with ~.
 * @returns The absolute path.
 */
export function resolveTildePath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  if (path === "~") {
    return homedir();
  }
  return path;
}

/**
 * Validates a path as a Git repository (synchronously).
 * Checks for the existence of the directory and the .git folder/file.
 * Supports tilde (~) paths.
 */
export function validateGitRepository(path: string): ValidationResult {
  try {
    // Resolve tilde path
    const resolvedPath = resolveTildePath(path);

    // Check if the directory exists
    if (!existsSync(resolvedPath)) {
      return { isValid: false, error: "Directory does not exist" };
    }

    // Check for the presence of a .git folder or file
    const gitPath = join(resolvedPath, ".git");
    if (!existsSync(gitPath)) {
      return { isValid: false, error: "Not a Git repository" };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Git error: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
