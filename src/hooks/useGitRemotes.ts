import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { Remote } from "../types";
import { remoteHostParser } from "../utils/remote-host-parser";

export type RemotesHosts = Record<string, Remote>;

/**
 * Hook for fetching Git remotes metadata.
 * Returns a dictionary keyed by remote name.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitRemotes(gitManager: GitManager): { data: RemotesHosts; isLoading: boolean; revalidate: () => void | Promise<unknown> } {
  const { data: remotes = [], isLoading, revalidate } = useCachedPromise(
    async (repoPath: string) => gitManager.getRemotes(),
    [gitManager.repoPath]
  );

  const remotesRecords = remotes.reduce<RemotesHosts>((dictionary, remote) => {
    const primaryUrl = remote.fetchUrl || remote.pushUrl || "";
    const parser = remoteHostParser(primaryUrl);

    const info: Remote = {
      name: remote.name,
      fetchUrl: remote.fetchUrl,
      pushUrl: remote.pushUrl,
      type: detectRemoteProtocol(primaryUrl),
      organizationName: parser.organizationName,
      repositoryName: parser.repositoryName,
      provider: parser.provider,
      pages: {
        get mainPage() { return parser.repositoryWebUrl; },
        get pullRequests() { return parser.pullRequestsListUrl; },
        commitPage: parser.commitUrl,
        createPullRequestForm: parser.createPullRequestUrl,
      }
    };
    dictionary[remote.name] = info;

    return dictionary;
  }, {} as RemotesHosts);

  return {
    data: remotesRecords,
    isLoading,
    revalidate
  };
}

function detectRemoteProtocol(url: string): "ssh" | "http" {
  const lower = url.toLowerCase();

  if (lower.startsWith("ssh://") || /^[^@\s]+@[^:]+:/.test(url)) {
    return "ssh";
  }

  return "http";
}

