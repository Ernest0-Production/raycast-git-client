import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-utils";
import { FileStatus } from "../types";

/**
 * Hook for fetching the file status in a Git repository.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitStatus(gitManager: GitManager) {
  return useCachedPromise(
    async (repoPath: string) => {
      const status = await gitManager.getStatus();
      return status;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      initialData: [] as FileStatus[],
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
