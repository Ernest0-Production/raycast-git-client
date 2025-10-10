import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";
import { Tag, TagsState } from "../types";

/**
 * Hook for fetching and managing Git tags state (local and remotes).
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitTags(gitManager: GitManager): RepositoryContext["tags"] {
  const localPromise = useCachedPromise(
    async (repoPath: string) => {
      return await gitManager.getLocalTagsDetailed();
    },
    [gitManager.repoPath],
    { initialData: [] as Tag[] }
  );

  const remotesPromise = useCachedPromise(
    async (repoPath: string) => {
      const remotes = await gitManager.getRemotes();
      const entries = await Promise.all(
        remotes.map(async (r) => [r.name, await gitManager.getRemoteTags(r.name)] as const)
      );
      return Object.fromEntries(entries) as Record<string, Tag[]>;
    },
    [gitManager.repoPath],
    { initialData: {} as Record<string, Tag[]> }
  );

  return {
    data: {
      local: localPromise.data || [],
      remotes: remotesPromise.data || {},
    } as TagsState,
    isLoading: localPromise.isLoading || remotesPromise.isLoading,
    error: localPromise.error || remotesPromise.error,
    revalidate: () => {
      localPromise.revalidate();
      remotesPromise.revalidate();
    }
  } as unknown as RepositoryContext["tags"];
}
