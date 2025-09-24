import { useMemo } from "react";
import { GitManager } from "../utils/git-manager";
import { validateGitRepository, resolveTildePath } from "../utils/validation";

/**
 * Hook for working with a Git repository.
 * Validates the path synchronously and creates a GitManager to perform operations.
 * Supports tilde (~) paths.
 */
export function useGitRepository(repositoryPath: string): { data: GitManager | undefined; error: Error | undefined } {
  // Synchronous validation and GitManager creation
  const { gitManager, error } = useMemo(() => {
    const validation = validateGitRepository(repositoryPath);

    if (!validation.isValid) {
      return { gitManager: undefined, error: new Error(validation.error) };
    }

    // Resolve tilde path for GitManager creation
    const resolvedPath = resolveTildePath(repositoryPath);
    return { gitManager: new GitManager(resolvedPath), error: undefined };
  }, [repositoryPath]);

  return {
    data: gitManager,
    error,
  };
}
