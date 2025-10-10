"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRepositoriesList = useRepositoriesList;
const utils_1 = require("@raycast/utils");
const react_1 = require("react");
const language_detector_1 = require("../utils/language-detector");
const path_utils_1 = require("../utils/path-utils");
const git_manager_1 = require("../utils/git-manager");
const path_1 = require("path");
/**
 * Hook for managing the list of repositories.
 * Repositories are sorted by last visit - most recent first.
 * Supports tilde (~) paths.
 */
function useRepositoriesList() {
    // Cache the list of repositories between sessions
    const [repositories, setRepositories] = (0, utils_1.useCachedState)("managed-repositories-list", []);
    // Revalidate all repositories in the list: remove if not valid, update languageStats if missing
    (0, react_1.useEffect)(() => {
        const invalidRepositories = repositories.filter((repo) => {
            // Check if the directory exists and is a git repository
            try {
                git_manager_1.GitManager.validateDirectory(repo.path);
                return false;
            }
            catch {
                return true;
            }
        });
        setRepositories((current) => current.filter((r) => !invalidRepositories.includes(r)));
    }, []);
    /**
     * Adds a repository to the recent list.
     * Moves the repository to the top of the list (most recent position).
     * Resolves tilde (~) paths to absolute paths.
     */
    const addRepository = (0, react_1.useCallback)(async (path, cloning) => {
        const resolvedPath = (0, path_utils_1.resolveTildePath)(path).replace(/\/+$/, "");
        const stats = await (0, language_detector_1.detectRepositoryLanguages)(resolvedPath);
        setRepositories((currentRepositories) => {
            if (currentRepositories.some((repo) => repo.path === resolvedPath))
                return currentRepositories;
            const newRepo = {
                id: Buffer.from(resolvedPath).toString("base64"),
                name: (0, path_1.basename)(resolvedPath),
                path: resolvedPath,
                lastOpenedAt: Date.now(),
                languageStats: stats,
                cloning,
            };
            return [...currentRepositories, newRepo];
        });
    }, [setRepositories]);
    const visitRepository = (0, react_1.useCallback)(async (repositoryPath) => {
        const stats = await (0, language_detector_1.detectRepositoryLanguages)(repositoryPath);
        setRepositories((currentRepositories) => {
            return currentRepositories.map((repo) => {
                if (repo.path !== repositoryPath)
                    return repo;
                return {
                    ...repo,
                    lastOpenedAt: Date.now(),
                    languageStats: stats
                };
            });
        });
    }, [setRepositories]);
    /**
     * Removes a specific repository from the recent list.
     */
    const removeRepository = (0, react_1.useCallback)((repositoryPath) => {
        setRepositories((currentRepositories) => currentRepositories.filter((repo) => repo.path !== repositoryPath));
    }, [setRepositories]);
    /**
    /**
     * Updates the cloning state of a repository.
     */
    const updateCloningState = (0, react_1.useCallback)(async (repositoryPath, cloningProcess) => {
        const stats = await (0, language_detector_1.detectRepositoryLanguages)(repositoryPath);
        setRepositories((currentRepositories) => currentRepositories.map((repo) => {
            if (repo.path !== repositoryPath)
                return repo;
            return {
                ...repo,
                languageStats: stats,
                cloning: cloningProcess,
            };
        }));
    }, [setRepositories]);
    return {
        repositories,
        addRepository,
        visitRepository,
        removeRepository,
        updateCloningState
    };
}
