"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitRepository = useGitRepository;
const react_1 = require("react");
const git_manager_1 = require("../utils/git-manager");
const path_utils_1 = require("../utils/path-utils");
/**
 * Hook for working with a Git repository.
 * Validates the path synchronously and creates a GitManager to perform operations.
 * Supports tilde (~) paths.
 */
function useGitRepository(repositoryPath) {
    return (0, react_1.useMemo)(() => {
        try {
            git_manager_1.GitManager.validateDirectory(repositoryPath);
            const resolvedPath = (0, path_utils_1.resolveTildePath)(repositoryPath);
            return {
                gitManager: new git_manager_1.GitManager(resolvedPath),
                error: undefined
            };
        }
        catch (error) {
            return {
                gitManager: undefined,
                error: new Error(error instanceof Error ? error.message : "Unknown error")
            };
        }
    }, [repositoryPath]);
}
