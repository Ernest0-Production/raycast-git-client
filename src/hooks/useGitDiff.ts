import { useCachedPromise, usePromise } from "@raycast/utils";
import { GitManager } from "../utils/git-utils";
import { FileStatus } from "../types";

interface UseGitDiffProps {
  gitManager: GitManager;
  options: { file: string; commitHash?: string; status?: FileStatus["status"] };
  execute?: boolean;
}

/**
 * Hook for fetching the diff for a file or commit with smart caching.
 * - Commit diffs are cached long-term (commits are immutable)
 * - File diffs are cached short-term with revalidation
 */
export function useGitDiff({ gitManager, options, execute = true }: UseGitDiffProps) {
  const { file, commitHash, status } = options;

  const {
    data: rawDiffData,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (file, commitHash, status, repoPath) => {
      const rawDiff = await gitManager.getDiff({ file, commitHash, status });

      if (rawDiff) {
        const lines = rawDiff.split("\n");
        if (lines.length > 200) {
          return [
            "```text",
            "⚠️ Diff is too large to display (more than 200 lines).",
            "Open this file in external editor to view the full diff.",
            "```",
          ].join("\n");
        }
        return `\`\`\`diff\n${rawDiff}\n\`\`\``;
      }

      return "";
    },
    [file, commitHash, status, gitManager.repoPath],
    {
      execute,
      onError: (error) => {
        console.error("Failed to fetch diff:", error);
      },
    },
  );

  // Return loading text while diff is being fetched
  const diff = isLoading ? "Loading..." : rawDiffData;

  return {
    diff,
    isLoading,
    error,
    revalidate,
  };
}
