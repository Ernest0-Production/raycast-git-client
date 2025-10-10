"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitTags = useGitTags;
const utils_1 = require("@raycast/utils");
/**
 * Hook for fetching and managing Git tags state (local and remotes).
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
function useGitTags(gitManager) {
    const localPromise = (0, utils_1.useCachedPromise)(async (repoPath) => {
        return await gitManager.getLocalTagsDetailed();
    }, [gitManager.repoPath], { initialData: [] });
    const remotesPromise = (0, utils_1.useCachedPromise)(async (repoPath) => {
        const remotes = await gitManager.getRemotes();
        const entries = await Promise.all(remotes.map(async (r) => [r.name, await gitManager.getRemoteTags(r.name)]));
        return Object.fromEntries(entries);
    }, [gitManager.repoPath], { initialData: {} });
    return {
        data: {
            local: localPromise.data || [],
            remotes: remotesPromise.data || {},
        },
        isLoading: localPromise.isLoading || remotesPromise.isLoading,
        error: localPromise.error || remotesPromise.error,
        revalidate: () => {
            localPromise.revalidate();
            remotesPromise.revalidate();
        }
    };
}
