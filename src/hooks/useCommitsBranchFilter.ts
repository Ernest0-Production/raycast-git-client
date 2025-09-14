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
 * Hook for caching the selected branch for the commits filter.
 * The cache is specific to a repository using useCachedState.
 */
export function useCommitsBranchFilter(repositoryPath: string, branches: Branch[] = [], detachedHead?: DetachedHead) {
  const cacheKey = `commits-branch-filter-${Buffer.from(repositoryPath).toString("base64")}`;

  const [branchFilter, setBranchFilter] = useCachedState<string>(cacheKey, ALL_BRANCHES_FILTER);

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

      if (!isValidBranch && !detachedHead) {
        // If the cached branch doesn't exist, reset to ALL_BRANCHES
        setBranchFilter(ALL_BRANCHES_FILTER);
      }
    }
  }, [branches, detachedHead, branchFilter, setBranchFilter]);

  // Get the actual filter to pass to the commits hook
  /**
   * Вычисляет актуальный фильтр для коммитов на основе выбранной ветки.
   * Мемоизация через useMemo для предотвращения лишних вычислений.
   */
  const selectedBranch: string | undefined = (() => {
    if (branchFilter === ALL_BRANCHES_FILTER) {
      return undefined; // undefined означает все ветки
    }
    if (branchFilter === CURRENT_BRANCH_FILTER) {
      if (detachedHead) {
        return detachedHead.commitHash;
      } else {
        return branches.find((branch) => branch.type === "current")?.name;
      }
    }
    return branchFilter;
  })();

  return {
    branchFilter,
    selectedBranch,
    setBranchFilter,
  };
}
