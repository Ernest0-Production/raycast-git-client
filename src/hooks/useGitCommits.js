"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitCommits = useGitCommits;
const utils_1 = require("@raycast/utils");
const react_1 = require("react");
/**
 * Hook for fetching the commit history of a Git repository.
 * Repository path and branch are included in cache dependencies to ensure separate cache per repository and branch.
 */
function useGitCommits(gitManager, branchesState) {
    const [branchFilter, setBranchFilter] = (0, utils_1.useCachedState)(`${gitManager.repoPath}:selected-commits-filter`, { kind: 'current' });
    const selectedBranch = (0, react_1.useMemo)(() => {
        if (!branchesState) {
            return undefined;
        }
        switch (branchFilter.kind) {
            case 'all':
                return undefined; // undefined means all branches
            case 'current':
                if (branchesState.detachedHead) {
                    return branchesState.detachedHead;
                }
                else {
                    return branchesState.currentBranch;
                }
            case 'branch':
                switch (branchFilter.value.type) {
                    case 'current':
                    case 'local':
                        return branchesState.localBranches.find((branch) => branch.name === branchFilter.value.name);
                    case 'remote':
                        if (!branchesState.remoteBranches[branchFilter.value.remote]) {
                            return undefined;
                        }
                        return branchesState.remoteBranches[branchFilter.value.remote].find((branch) => branch.name === branchFilter.value.name);
                }
        }
    }, [branchFilter, branchesState]);
    const commitsPromise = (0, utils_1.useCachedPromise)((repoPath, branchFilter, selectedBranch, detachedHead) => async (options) => {
        const selectedSourceName = evaluateBranchName(branchFilter, branchesState);
        const commits = await gitManager.getCommits(selectedSourceName, options.page);
        return {
            data: commits,
            hasMore: commits.length > 0
        };
    }, [gitManager.repoPath, branchFilter, branchesState?.currentBranch, branchesState?.detachedHead], // Include both repository path and branch for proper cache isolation
    {
        execute: branchesState !== undefined,
        initialData: []
    });
    return {
        ...commitsPromise,
        selectedBranch,
        filter: branchFilter,
        setFilter: setBranchFilter
    };
}
function evaluateBranchName(branchFilter, branchesState) {
    switch (branchFilter.kind) {
        case 'all':
            return undefined; // undefined means all branches
        case 'current':
            if (branchesState.detachedHead) {
                return branchesState.detachedHead.commitHash;
            }
            else if (branchesState.currentBranch) {
                return branchesState.currentBranch.name;
            }
            else {
                console.error("No current branch found");
                return undefined;
            }
        case 'branch':
            switch (branchFilter.value.type) {
                case 'current':
                case 'local':
                    return branchFilter.value.name;
                case 'remote':
                    return `${branchFilter.value.remote}/${branchFilter.value.name}`;
            }
    }
}
