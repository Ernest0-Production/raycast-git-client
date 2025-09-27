import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RemoteMetadata } from "../types";

/**
 * Hook for fetching Git remotes metadata.
 * Returns a dictionary keyed by remote name.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitRemotes(gitManager: GitManager) {
  return useCachedPromise(
    async (repoPath: string) => {
      const list = await gitManager.getRemotesMetadata();
      return list.reduce<Record<string, RemoteMetadata>>((acc, remote) => {
        acc[remote.name] = remote;
        return acc;
      }, {});
    },
    [gitManager.repoPath],
    {
      failureToastOptions: {
        title: "Failed to load remotes",
      },
    }
  );
}

