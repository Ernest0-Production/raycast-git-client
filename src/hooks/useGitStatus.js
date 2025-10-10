"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitStatus = useGitStatus;
const utils_1 = require("@raycast/utils");
/**
 * Hook for fetching the file status in a Git repository.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
function useGitStatus(gitManager) {
    return (0, utils_1.useCachedPromise)(async (repoPath) => {
        const status = await gitManager.getStatus();
        return status;
    }, [gitManager.repoPath], // Include repository path for separate cache per repository
    {
        initialData: {
            branch: null,
            files: [],
            conflict: undefined
        }
    });
}
