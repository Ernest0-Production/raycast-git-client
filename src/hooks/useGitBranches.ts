import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";

/**
 * Hook for fetching and managing Git branches state.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitBranches(gitManager: GitManager) {
  return useCachedPromise(
    async (repoPath: string) => {
      return await gitManager.getBranches();
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      failureToastOptions: {
        title: "Failed to load branches state",
      },
    },
  );
}
