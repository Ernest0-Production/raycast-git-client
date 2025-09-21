import { useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { Branch, BranchesState } from "../types";

/**
 * Special constant for the "All Branches" filter
 */
export const ALL_BRANCHES_FILTER = "ALL_BRANCHES";

/**
 * Special constant for the "Current Branch" filter
 */
export const CURRENT_BRANCH_FILTER = "CURRENT_BRANCH";

/**
 * Hook for caching the selected branch for the commits filter.
 * The cache is specific to a repository using useCachedState.
 */
export function useCommitsBranchFilter(repositoryPath: string, branchesState?: BranchesState) {
  const cacheKey = `commits-branch-filter-${Buffer.from(repositoryPath).toString("base64")}`;

  const [branchFilter, setBranchFilter] = useCachedState<string>(cacheKey, ALL_BRANCHES_FILTER);

  // Validate cached branch when branches change
  useEffect(() => {
    if (branchesState && branchFilter !== ALL_BRANCHES_FILTER && branchFilter !== CURRENT_BRANCH_FILTER) {

      if (branchesState.detachedHead) {
        return;
      }

      if (branchesState.currentBranch && branchesState.currentBranch.name === branchFilter) {
        return;
      }

      if (branchesState.localBranches.some((branch) => branch.name === branchFilter)) {
        return;
      }

      if (Object.values(branchesState.remoteBranches).some((branches) => branches.some((branch) => `${branch.remote}/${branch.name}` === branchFilter))) {
        return;
      }

      setBranchFilter(ALL_BRANCHES_FILTER);
    }
  }, [branchesState, branchFilter, setBranchFilter]);

  // Get the actual filter to pass to the commits hook
  const selectedBranch: string | undefined = useMemo(() => {
    if (branchFilter === ALL_BRANCHES_FILTER) {
      return undefined; // undefined means all branches
    }
    if (branchFilter === CURRENT_BRANCH_FILTER) {
      if (branchesState?.detachedHead) {
        return branchesState.detachedHead.commitHash;
      } else {
        return branchesState?.currentBranch?.name;
      }
    }
    return branchFilter;
  }, [branchFilter, branchesState]);

  return {
    branchFilter,
    selectedBranch,
    setBranchFilter,
  };
}
