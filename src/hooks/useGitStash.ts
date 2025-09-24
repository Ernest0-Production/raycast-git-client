import { usePromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";

/**
 * Hook for fetching the list of stashes in a repository.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 *
 * @param gitManager The GitManager instance for the repository.
 * @returns An object with stash data, loading state, and a revalidation function.
 */
export function useGitStash(gitManager: GitManager) {
  const {
    data: stashes,
    isLoading,
    revalidate,
  } = usePromise(
    async (repoPath: string) => {
      const stashList = await gitManager.getStashes();
      return stashList;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
  );

  return {
    stashes,
    isLoading,
    revalidate,
  };
}
