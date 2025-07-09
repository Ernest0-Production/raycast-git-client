import { useCachedState } from "@raycast/utils";
import { useCallback } from "react";
import { Repository } from "../types";
import { resolveTildePath } from "../utils/validation";

/**
 * Hook for managing the list of recent repositories.
 * Repositories are sorted by last visit - most recent first.
 * Supports tilde (~) paths.
 */
export function useRecentRepositories() {
  // Cache the list of repositories between sessions
  const [repositories, setRepositories] = useCachedState<Repository[]>("recent-repositories-list", []);

  /**
   * Adds a repository to the recent list.
   * Moves the repository to the top of the list (most recent position).
   * Resolves tilde (~) paths to absolute paths.
   */
  const addToRecent = useCallback(
    (path: string) => {
      // Resolve tilde path
      let resolvedPath = resolveTildePath(path)
        // Trim '/' from last component
        .replace(/\/+$/, "");

      const name = resolvedPath.split("/").pop() || resolvedPath;
      const id = Buffer.from(resolvedPath).toString("base64");
      const newRepo: Repository = { id, name, path: resolvedPath };

      setRepositories((currentRepositories) => {
        // Remove the repository if it already exists in the list
        const filteredRepos = currentRepositories.filter((repo) => repo.path !== resolvedPath);

        // Add the repository to the beginning of the list (most recent position)
        return [newRepo, ...filteredRepos];
      });
    },
    [setRepositories],
  );

  /**
   * Clears all recent repositories.
   */
  const clearRecentRepositories = useCallback(() => {
    setRepositories([]);
  }, [setRepositories]);

  return {
    repositories,
    addToRecent,
    clearRecentRepositories,
  };
}
