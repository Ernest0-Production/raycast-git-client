import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RemoteMetadata } from "../types";

/**
 * Alias type for dictionary of remote metadata
 */
export type RemotesHosts = Record<string, RemoteMetadata>;

/**
 * Hook for fetching Git remotes metadata.
 * Returns a dictionary keyed by remote name.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitRemotes(gitManager: GitManager) {
  return useCachedPromise(
    async (repoPath: string) => {
      const remotes = await gitManager.getRemotesMetadata();

      const remotesRecords = remotes.reduce<RemotesHosts>((dictionary, remote) => {
        dictionary[remote.name] = remote;
        return dictionary;
      }, {});

      return remotesRecords;
    },
    [gitManager.repoPath]
  );
}

