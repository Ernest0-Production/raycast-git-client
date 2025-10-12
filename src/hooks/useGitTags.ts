import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";

/**
 * Hook for fetching and managing Git tags state.
 */
export function useGitTags(gitManager: GitManager): RepositoryContext["tags"] {
  return useCachedPromise(
    async (repoPath: string) => {
      const tags = gitManager.getTags()
      return tags
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      initialData: [],
    }
  ) as RepositoryContext["tags"];
}
