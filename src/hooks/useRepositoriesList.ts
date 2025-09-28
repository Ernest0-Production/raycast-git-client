import { useCachedState } from "@raycast/utils";
import { useCallback, useEffect } from "react";
import { LanguageStats, Repository } from "../types";
import { resolveTildePath } from "../utils/validation";
import { detectRepositoryLanguages } from "../utils/language-detector";

/**
 * Hook for managing the list of repositories.
 * Repositories are sorted by last visit - most recent first.
 * Supports tilde (~) paths.
 */
export function useRepositoriesList() {
  // Cache the list of repositories between sessions
  const [repositories, setRepositories] = useCachedState<Repository[]>("recent-repositories-list", []);

  /**
   * Adds a repository to the recent list.
   * Moves the repository to the top of the list (most recent position).
   * Resolves tilde (~) paths to absolute paths.
   */
  const addRepository = useCallback(
    async (path: string) => {
      const resolvedPath = resolveTildePath(path).replace(/\/+$/, "");
      const stats = await detectRepositoryLanguages(resolvedPath);

      setRepositories((currentRepositories) => {
        if (currentRepositories.some((repo) => repo.path === resolvedPath)) return currentRepositories;

        const newRepo: Repository = {
          id: Buffer.from(resolvedPath).toString("base64"),
          name: resolvedPath.split("/").pop() || resolvedPath,
          path: resolvedPath,
          lastOpenedAt: Date.now(),
          languageStats: stats
        };

        return [...currentRepositories, newRepo];
      });
    },
    [setRepositories],
  );

  const visitRepository = useCallback(
    async (repositoryPath: string) => {
      const resolvedPath = resolveTildePath(repositoryPath).replace(/\/+$/, "");
      const stats = await detectRepositoryLanguages(repositoryPath);

      setRepositories((currentRepositories) => {
        return currentRepositories.map((repo) => {
          if (repo.path !== resolvedPath) return repo;

          return {
            ...repo,
            lastOpenedAt: Date.now(),
            languageStats: stats
          }
        })
      });
    },
    [setRepositories],
  );

  /**
   * Removes a specific repository from the recent list.
   */
  const removeRepository = useCallback(
    (repositoryPath: string) => {
      const resolvedPath = resolveTildePath(repositoryPath).replace(/\/+$/, "");

      setRepositories((currentRepositories) => currentRepositories.filter((repo) => repo.path !== resolvedPath));
    },
    [setRepositories],
  );

  return {
    repositories,
    addRepository,
    visitRepository,
    removeRepository,
  };
}
