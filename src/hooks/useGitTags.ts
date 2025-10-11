import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";
import { Tag } from "../types";

export type TagsState = {
  local: Tag[];
  remotes: Record<string, Tag[]>;
};

/**
 * Hook for fetching and managing Git tags state (local and per-remote grouped).
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitTags(gitManager: GitManager, remotes?: RepositoryContext["remotes"]["data"]): {
  data: TagsState;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} {
  return useCachedPromise(
    async (repoPath: string, remotesNames: string[]) => {
      const [local, ...remotesLists] = await Promise.all<unknown>([
        gitManager.getLocalTags(),
        ...remotesNames.map((name) => gitManager.getRemoteTags(name)),
      ]) as [Tag[], ...Tag[][]];

      const groupedRemotes = remotesNames.reduce<Record<string, Tag[]>>((acc, name, index) => {
        acc[name] = remotesLists[index] || [];
        return acc;
      }, {});

      return {
        local,
        remotes: groupedRemotes,
      } as TagsState;
    },
    [gitManager.repoPath, JSON.stringify(Object.keys(remotes || {}))],
    {
      initialData: { local: [], remotes: {} },
    }
  ) as unknown as { data: TagsState; isLoading: boolean; error: Error | undefined; revalidate: () => void };
}
