import { usePromise } from "@raycast/utils";
import { GitManager } from "../utils/git-utils";

/**
 * Hook for fetching and managing Git branches state.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitBranches(gitManager: GitManager) {
  return usePromise(
    async (repoPath: string) => {
      const branchesState = await gitManager.getBranches();
      return branchesState;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      failureToastOptions: {
        title: "Failed to load branches state",
      },
    },
  );
}
