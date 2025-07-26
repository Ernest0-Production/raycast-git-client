import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { GitManager } from "../utils/git-utils";

/**
 * Hook for fetching the file status in a Git repository.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitStatus(gitManager: GitManager) {
  return usePromise(
    async (repoPath: string) => {
      const status = await gitManager.getStatus();
      return status;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load file status",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );
}
