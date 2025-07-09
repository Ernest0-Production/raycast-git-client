import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-utils";
import { BranchesState } from "../types";

/**
 * Hook for fetching and managing Git branches state.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitBranches(gitManager: GitManager) {
  return useCachedPromise(
    async (repoPath: string) => {
      const branchesState = await gitManager.getBranches();
      return branchesState;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      initialData: {
        currentBranch: undefined,
        detachedHead: undefined,
        localBranches: [],
        remoteBranches: [],
      } as BranchesState,
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load branches state",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );
}
