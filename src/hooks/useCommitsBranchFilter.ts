import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { Branch, DetachedHead } from "../types";

/**
 * Special constant for the "All Branches" filter
 */
export const ALL_BRANCHES_FILTER = "ALL_BRANCHES";

/**
 * Special constant for the "Current Branch" filter
 */
export const CURRENT_BRANCH_FILTER = "CURRENT_BRANCH";

/**
 * Special constant for the "Detached HEAD" filter
 */
export const DETACHED_HEAD_FILTER = "DETACHED_HEAD";

/**
 * Hook for caching the selected branch for the commits filter.
 * The cache is specific to a repository using useCachedState.
 */
export function useCommitsBranchFilter(repositoryPath: string, branches: Branch[] = [], detachedHead?: DetachedHead) {
  const cacheKey = `commits-branch-filter-${Buffer.from(repositoryPath).toString("base64")}`;

  const [selectedBranch, setSelectedBranch] = useCachedState<string>(cacheKey, ALL_BRANCHES_FILTER);

  // Validate cached branch when branches change
  useEffect(() => {
    if ((branches.length > 0 || detachedHead) && selectedBranch !== ALL_BRANCHES_FILTER && selectedBranch !== CURRENT_BRANCH_FILTER) {
      // Check if selected branch is valid
      const isValidBranch = branches.some((branch) => {
        // For remote branches, check against the full name (remote/name)
        if (branch.type === "remote") {
          return `${branch.remote}/${branch.name}` === selectedBranch;
        }
        // For local and current branches, check against just the name
        return branch.name === selectedBranch;
      });
      const isDetachedHead = selectedBranch === DETACHED_HEAD_FILTER && detachedHead;

      if (!isValidBranch && !isDetachedHead) {
        // If the cached branch doesn't exist, reset to ALL_BRANCHES
        setSelectedBranch(ALL_BRANCHES_FILTER);
      }
    }
  }, [branches, detachedHead, selectedBranch, setSelectedBranch]);

  // Update the selected branch
  const updateSelectedBranch = (branchName: string) => {
    setSelectedBranch(branchName);
  };

  // Get the actual filter to pass to the commits hook
  const getActualBranchFilter = (): string | undefined => {
    if (selectedBranch === ALL_BRANCHES_FILTER) {
      return undefined; // undefined means all branches
    }
    if (selectedBranch === DETACHED_HEAD_FILTER && detachedHead) {
      return "HEAD"; // HEAD means detached HEAD state
    }
    if (selectedBranch === CURRENT_BRANCH_FILTER) {
      return branches.find((branch) => branch.type === "current")?.name;
    }
    return selectedBranch;
  };

  return {
    selectedBranch,
    updateSelectedBranch,
    getActualBranchFilter,
  };
}
