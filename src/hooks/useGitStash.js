"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitStash = useGitStash;
const utils_1 = require("@raycast/utils");
/**
 * Hook for fetching the list of stashes in a repository.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 *
 * @param gitManager The GitManager instance for the repository.
 * @returns An object with stash data, loading state, and a revalidation function.
 */
function useGitStash(gitManager) {
    return (0, utils_1.useCachedPromise)(async (repoPath) => {
        const stashList = await gitManager.getStashes();
        return stashList;
    }, [gitManager.repoPath], // Include repository path for separate cache per repository
    {
        initialData: []
    });
}
