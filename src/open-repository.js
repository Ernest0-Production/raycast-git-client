"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OpenRepository;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const utils_1 = require("@raycast/utils");
const useGitRepository_1 = require("./hooks/useGitRepository");
const useRepositoriesList_1 = require("./hooks/useRepositoriesList");
const BranchesView_1 = require("./commands/views/BranchesView");
const StatusView_1 = require("./commands/views/StatusView");
const CommitsView_1 = require("./commands/views/CommitsView");
const StashesView_1 = require("./commands/views/StashesView");
const FilesView_1 = __importDefault(require("./commands/views/FilesView"));
const react_1 = require("react");
const useGitBranches_1 = require("./hooks/useGitBranches");
const useGitCommits_1 = require("./hooks/useGitCommits");
const useGitStash_1 = require("./hooks/useGitStash");
const useGitStatus_1 = require("./hooks/useGitStatus");
const useGitRemotes_1 = require("./hooks/useGitRemotes");
const RemotesView_1 = __importDefault(require("./commands/views/RemotesView"));
const useGitTags_1 = require("./hooks/useGitTags");
const TagsView_1 = __importDefault(require("./commands/views/TagsView"));
function OpenRepository({ arguments: args }) {
    const [currentView, setCurrentView] = (0, utils_1.useCachedState)("git-current-view", "branches");
    const repositoryPath = args.path;
    // Hook for working with a Git repository (synchronous validation)
    const { gitManager, error } = (0, useGitRepository_1.useGitRepository)(repositoryPath);
    // Hook for managing recent repositories
    const { visitRepository } = (0, useRepositoriesList_1.useRepositoriesList)();
    // Add repository to recent cache when successfully opened
    (0, react_1.useEffect)(() => {
        if (gitManager && repositoryPath) {
            visitRepository(repositoryPath);
        }
    }, [gitManager, repositoryPath, visitRepository]);
    // Validation error state
    if (error || !gitManager) {
        return ((0, jsx_runtime_1.jsx)(api_1.List, { navigationTitle: "Git Repository", children: (0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "Error opening repository", description: error?.message || "Unknown error", icon: api_1.Icon.ExclamationMark }) }));
    }
    // Shared data hooks lifted to the top-level to persist across view switches
    const remotesContext = (0, useGitRemotes_1.useGitRemotes)(gitManager);
    const branchesContext = (0, useGitBranches_1.useGitBranches)(gitManager);
    const commitsContext = (0, useGitCommits_1.useGitCommits)(gitManager, branchesContext.data);
    const stashesContext = (0, useGitStash_1.useGitStash)(gitManager);
    const statusContext = (0, useGitStatus_1.useGitStatus)(gitManager);
    const tagsContext = (0, useGitTags_1.useGitTags)(gitManager);
    const rootContext = {
        gitManager,
        remotes: remotesContext,
        branches: branchesContext,
        commits: commitsContext,
        stashes: stashesContext,
        status: statusContext,
        tags: tagsContext,
        currentView,
        navigateTo: setCurrentView,
    };
    // Render the corresponding view
    switch (currentView) {
        case "status":
            return ((0, jsx_runtime_1.jsx)(StatusView_1.StatusView, { ...rootContext }));
        case "commits":
            return ((0, jsx_runtime_1.jsx)(CommitsView_1.CommitsView, { ...rootContext }));
        case "branches":
            return ((0, jsx_runtime_1.jsx)(BranchesView_1.BranchesView, { ...rootContext }));
        case "remotes":
            return ((0, jsx_runtime_1.jsx)(RemotesView_1.default, { ...rootContext }));
        case "tags":
            return ((0, jsx_runtime_1.jsx)(TagsView_1.default, { ...rootContext }));
        case "files":
            return ((0, jsx_runtime_1.jsx)(FilesView_1.default, { ...rootContext }));
        case "stashes":
            return ((0, jsx_runtime_1.jsx)(StashesView_1.StashesView, { ...rootContext }));
        default:
            setCurrentView("branches");
    }
}
