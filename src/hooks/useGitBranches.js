"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitBranches = useGitBranches;
const utils_1 = require("@raycast/utils");
/**
 * Hook for fetching and managing Git branches state.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
function useGitBranches(gitManager) {
    return (0, utils_1.useCachedPromise)(async (repoPath) => {
        return await gitManager.getBranches();
    }, [gitManager.repoPath], // Include repository path for separate cache per repository
    {
        initialData: {
            currentBranch: undefined,
            detachedHead: undefined,
            localBranches: [],
            remoteBranches: {},
        }
    });
}
