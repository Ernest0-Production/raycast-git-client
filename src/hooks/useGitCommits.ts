import { useCachedPromise, useCachedState } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { BranchFilter, RepositoryContext } from "../open-repository";
import { Branch, BranchesState, DetachedHead } from "../types";
import { useMemo } from "react";

/**
 * Hook for fetching the commit history of a Git repository.
 * Repository path and branch are included in cache dependencies to ensure separate cache per repository and branch.
 */
export function useGitCommits(
  gitManager: GitManager,
  branchesState?: BranchesState
): RepositoryContext["commits"] {
  const [branchFilter, setBranchFilter] = useCachedState<BranchFilter>(
    `${gitManager.repoPath}:selected-commits-filter`,
    { kind: 'current', upstream: false }
  );

  const selectedBranch: Branch | DetachedHead | undefined = useMemo(() => {
    if (!branchesState) {
      return undefined;
    }

    switch (branchFilter.kind) {
      case 'all':
        return undefined; // undefined means all branches

      case 'current':
        if (branchesState.detachedHead) {
          return branchesState.detachedHead;
        } else {
          if (branchFilter.upstream && branchesState.currentBranch?.upstream) {
            const remoteName = branchesState.currentBranch.upstream.remote;
            return branchesState.remoteBranches[remoteName]?.find((branch) => branch.displayName === branchesState.currentBranch?.upstream?.fullName);
          } else {
            return branchesState.currentBranch;
          }
        }

      case 'branch':
        switch (branchFilter.value.type) {
          case 'current':
          case 'local':
            return branchesState.localBranches.find((branch) => branch.name === branchFilter.value.name);
          case 'remote':
            if (!branchesState.remoteBranches[branchFilter.value.remote!]) {
              return undefined;
            }

            return branchesState.remoteBranches[branchFilter.value.remote!].find((branch) => branch.name === branchFilter.value.name);
        }
    }
  }, [branchFilter, branchesState]);

  const commitsPromise = useCachedPromise(
    (repoPath: string, branchFilter: BranchFilter, selectedBranch?: Branch, detachedHead?: DetachedHead) => async (options: { page: number }) => {
      const selectedSourceName = evaluateBranchName(branchFilter, branchesState!);
      const commits = await gitManager.getCommits(selectedSourceName, options.page);

      return {
        data: commits,
        hasMore: commits.length > 0
      };
    },
    [gitManager.repoPath, branchFilter, branchesState?.currentBranch, branchesState?.detachedHead], // Include both repository path and branch for proper cache isolation
    {
      execute: branchesState !== undefined,
      initialData: []
    }
  );

  return {
    ...commitsPromise,
    selectedBranch,
    filter: branchFilter,
    setFilter: setBranchFilter
  } as RepositoryContext["commits"];
}

function evaluateBranchName(branchFilter: BranchFilter, branchesState: BranchesState): string | undefined {
  switch (branchFilter.kind) {
    case 'all':
      return undefined; // undefined means all branches

    case 'current':
      if (branchesState.detachedHead) {
        return branchesState.detachedHead.commitHash;
      } else if (branchesState.currentBranch) {
        return branchesState.currentBranch.name;
      } else {
        console.warn("No current branch found");
        return undefined;
      }

    case 'branch':
      switch (branchFilter.value.type) {
        case 'current':
        case 'local':
          return branchFilter.value.name

        case 'remote':
          return `${branchFilter.value.remote}/${branchFilter.value.name}`;
      }
  }
}
