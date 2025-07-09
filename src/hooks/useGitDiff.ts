import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-utils";

interface UseGitDiffProps {
  gitManager: GitManager;
  options: { file?: string; commitHash?: string; staged?: boolean };
  execute?: boolean;
}

/**
 * Hook for fetching the diff for a file or commit with smart caching.
 * - Commit diffs are cached long-term (commits are immutable)
 * - File diffs are cached short-term with revalidation
 */
export function useGitDiff({ gitManager, options, execute = true }: UseGitDiffProps) {
  const { file, commitHash, staged } = options;

  const {
    data: rawDiff,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (file, commitHash, staged, repoPath) => {
      return await gitManager.getDiff({ file, commitHash, staged });
    },
    [file, commitHash, staged, gitManager.repoPath],
    {
      execute,
      // Commit diffs never change, cache them longer
      keepPreviousData: true,
      // For file diffs, revalidate more frequently
      initialData: "",
      onError: (error) => {
        console.error("Failed to fetch diff:", error);
      },
    },
  );

  // Format the diff with markdown syntax
  const diff = rawDiff ? "```diff\n" + rawDiff + "\n```" : execute ? "No changes to display" : "";

  return {
    diff,
    isLoading,
    error,
    revalidate,
  };
}
