import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-utils";

/**
 * Hook for fetching the commit history of a Git repository.
 * Repository path and branch are included in cache dependencies to ensure separate cache per repository and branch.
 */
export function useGitCommits(gitManager: GitManager, branch?: string, execute = true) {
  return useCachedPromise(
    (repoPath: string, selectedBranch?: string) => async (options: { page: number }) => {
      const commits = await gitManager.getCommits(selectedBranch, options.page);
      return { data: commits, hasMore: commits.length > 0 };
    },
    [gitManager.repoPath, branch], // Include both repository path and branch for proper cache isolation
    {
      execute,
      failureToastOptions: {
        title: "Failed to load commits",
      },
    },
  );
}
