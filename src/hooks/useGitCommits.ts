import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { GitManager } from "../utils/git-utils";
import { Commit, Preferences } from "../types";

/**
 * Hook for fetching the commit history of a Git repository.
 * Repository path and branch are included in cache dependencies to ensure separate cache per repository and branch.
 */
export function useGitCommits(gitManager: GitManager, branch?: string) {
  const preferences = getPreferenceValues<Preferences>();
  return useCachedPromise(
    async (repoPath: string, selectedBranch?: string) => {
      return gitManager.getCommits(selectedBranch);
    },
    [gitManager.repoPath, branch], // Include both repository path and branch for proper cache isolation
    {
      initialData: [] as Commit[],
      failureToastOptions: {
        title: "Failed to load commits",
      },
    },
  );
}
