import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-utils";

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
    [gitManager.repoPath] // Include repository path for separate cache per repository
  );
}
