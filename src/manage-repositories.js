"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ManageRepositories;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const useRepositoriesList_1 = require("./hooks/useRepositoriesList");
const RepositoryDirectoryActions_1 = require("./components/actions/RepositoryDirectoryActions");
const open_repository_1 = __importDefault(require("./open-repository"));
const useRepositoriesView_1 = require("./hooks/useRepositoriesView");
const useGitRemotes_1 = require("./hooks/useGitRemotes");
const RemoteHostIcons_1 = require("./components/icons/RemoteHostIcons");
const useGitRepository_1 = require("./hooks/useGitRepository");
const RemoteActions_1 = require("./components/actions/RemoteActions");
const git_manager_1 = require("./utils/git-manager");
const useInterval_1 = require("./hooks/useInterval");
const fs_1 = require("fs");
const path_1 = require("path");
function ManageRepositories() {
    const { repositories: allRepositories, addRepository, visitRepository, removeRepository, updateCloningState, } = (0, useRepositoriesList_1.useRepositoriesList)();
    // Separate cloning repositories from regular ones
    const cloningRepositories = (0, react_1.useMemo)(() => allRepositories.filter((repo) => repo.cloning), [allRepositories]);
    const currentRepositories = (0, react_1.useMemo)(() => allRepositories.filter((repo) => !repo.cloning), [allRepositories]);
    // Use view hook only for regular repositories
    const { currentView: displayView, setCurrentView: setDisplayView, displayedRepositories } = (0, useRepositoriesView_1.useRepositoriesView)(currentRepositories);
    const groupActions = ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "View", children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: "Sort by", icon: api_1.Icon.NumberList, children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Visit Date", icon: displayView.order === "visit-date" ? { source: api_1.Icon.Checkmark, tintColor: api_1.Color.Green } : api_1.Icon.Clock, onAction: () => setDisplayView({ ...displayView, order: "visit-date" }) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Alphabetically", icon: displayView.order === "alphabetical" ? { source: api_1.Icon.Checkmark, tintColor: api_1.Color.Green } : api_1.Icon.Lowercase, onAction: () => setDisplayView({ ...displayView, order: "alphabetical" }) })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: "Group by", icon: api_1.Icon.List, children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "None", icon: displayView.group === "none" ? { source: api_1.Icon.Checkmark, tintColor: api_1.Color.Green } : undefined, onAction: () => setDisplayView({ ...displayView, group: "none" }) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Language", icon: displayView.group === "language" ? { source: api_1.Icon.Checkmark, tintColor: api_1.Color.Green } : api_1.Icon.Code, onAction: () => setDisplayView({ ...displayView, group: "language" }) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Directory", icon: displayView.group === "parent" ? { source: api_1.Icon.Checkmark, tintColor: api_1.Color.Green } : api_1.Icon.Folder, onAction: () => setDisplayView({ ...displayView, group: "parent" }) })] })] }));
    const handleRemove = async (repoName, repoPath) => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Remove from recent?",
            message: `Are you sure you want to remove "${repoName}" from the recent repositories list?`,
            primaryAction: {
                title: "Remove",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            await removeRepository(repoPath);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Repository removed",
                message: `"${repoName}" removed from recent list`,
            });
        }
    };
    const handleKillClone = async (repoPath) => {
        await removeRepository(repoPath);
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.List, { searchBarPlaceholder: "Search by name, path", actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add Repository", target: (0, jsx_runtime_1.jsx)(AddRepositoryForm, { onAddRepository: addRepository }), icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" } }), groupActions] }), children: [cloningRepositories.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Cloning in background", children: cloningRepositories.map((repo) => ((0, jsx_runtime_1.jsx)(CloningRepositoryListItem, { repo: repo, groupActions: groupActions, onFinish: () => updateCloningState(repo.path, undefined), onKill: () => handleKillClone(repo.path), onRetry: (cloningProcess) => updateCloningState(repo.path, cloningProcess), onOpen: () => visitRepository(repo.path), onRemove: () => removeRepository(repo.path) }, repo.id))) })), currentRepositories.length === 0 && cloningRepositories.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No recent repositories", description: "Add new repositories using the 'Add Repository' action", icon: { source: `git-project.svg`, tintColor: api_1.Color.SecondaryText } })) : (displayedRepositories.map((group) => ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: group.groupTitle, children: group.repositories.map((repo) => ((0, jsx_runtime_1.jsx)(RepositoryListItem, { repo: repo, onOpen: () => visitRepository(repo.path), onRemove: () => handleRemove(repo.name, repo.path), onAddRepository: addRepository, groupActions: groupActions }, repo.id))) }, group.groupTitle))))] }));
}
function RepositoryListItem({ repo, onOpen, onRemove, onAddRepository, groupActions, }) {
    const { gitManager } = (0, useGitRepository_1.useGitRepository)(repo.path);
    if (!gitManager)
        return null;
    const { data: remotes } = (0, useGitRemotes_1.useGitRemotes)(gitManager);
    const accessories = (0, react_1.useMemo)(() => {
        const result = [];
        if (remotes && Object.keys(remotes).length > 0) {
            result.push(...Object.keys(remotes).map((remote) => ({
                tag: { value: `${remotes[remote].organizationName}/${remotes[remote].repositoryName}` },
                icon: (0, RemoteHostIcons_1.RemoteHostIcon)(remotes[remote].provider),
                tooltip: `Hosted on ${remotes[remote].provider} at ${remotes[remote].organizationName}/${remotes[remote].repositoryName}`,
            })));
        }
        return result;
    }, [repo.languageStats, remotes]);
    const icon = (0, react_1.useMemo)(() => {
        if (repo.languageStats && repo.languageStats.length > 0 && repo.languageStats[0].color) {
            return repo.languageStats[0].color;
        }
        return { source: `git-project.svg`, tintColor: api_1.Color.SecondaryText };
    }, [repo.languageStats]);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: repo.id, icon: icon, title: repo.name, subtitle: {
            value: repo.path,
            tooltip: repo.path
        }, keywords: [
            repo.path,
            ...(repo.languageStats?.map((lang) => lang.name) || [])
        ].filter((keyword) => Boolean(keyword)), accessories: accessories, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Show Repository", target: (0, jsx_runtime_1.jsx)(open_repository_1.default, { arguments: { path: repo.path } }), icon: api_1.Icon.Book, onPush: onOpen }), (0, jsx_runtime_1.jsx)(api_1.Action.CreateQuicklink, { title: "Create Quicklink", quicklink: {
                                link: `raycast://extensions/ernest0n/git-client/open-repository?arguments=${encodeURIComponent(JSON.stringify({ path: repo.path }))}`,
                                name: `Show ${repo.name} in Git`,
                            }, shortcut: { modifiers: ["shift", "cmd"], key: "l" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Remove", onAction: onRemove, icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["ctrl"], key: "x" } })] }), (0, jsx_runtime_1.jsx)(RepositoryDirectoryActions_1.RepositoryDirectoryActions, { repositoryPath: repo.path, onOpen: onOpen }), remotes && Object.keys(remotes).map((remote) => ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: `${remote} • ${remotes[remote].organizationName}/${remotes[remote].repositoryName}`, children: (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteOpenPullRequestAction, { remote: remotes[remote] }, remote) }, remote))), groupActions, (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "List", children: (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add Repository", target: (0, jsx_runtime_1.jsx)(AddRepositoryForm, { onAddRepository: onAddRepository }), icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" } }) })] }) }, repo.id));
}
function AddRepositoryForm({ onAddRepository }) {
    const { pop } = (0, api_1.useNavigation)();
    const [repositoryPaths, setRepositoryPaths] = (0, react_1.useState)([]);
    // Compute validation errors for multiple repositories
    const validateRepositories = (paths) => {
        if (paths.length === 0) {
            return "Required";
        }
        const invalidRepos = [];
        paths.forEach((path) => {
            try {
                git_manager_1.GitManager.validateDirectory(path);
            }
            catch (error) {
                const repoName = (0, path_1.basename)(path);
                invalidRepos.push(repoName);
            }
        });
        return invalidRepos.length > 0 ? `Invalid repositories: ${invalidRepos.join(", ")}` : undefined;
    };
    const handleSubmit = async (values) => {
        for (const repoPath of values.repositoryPath) {
            const repoName = (0, path_1.basename)(repoPath);
            onAddRepository(repoPath);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Animated,
                title: `${repoName} added to recent list`
            });
        }
        await (0, api_1.showToast)({
            style: api_1.Toast.Style.Success,
            title: repositoryPaths.length > 1 ? "All repositories added" : "Repository added"
        });
        pop();
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Form, { navigationTitle: "Add Git Repository", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: repositoryPaths.length > 1 ? "Add Repositories" : "Add Repository", icon: api_1.Icon.Plus, onSubmit: handleSubmit }) }), children: (0, jsx_runtime_1.jsx)(api_1.Form.FilePicker, { id: "repositoryPath", title: "Select Git Repository(s)", value: repositoryPaths, error: validateRepositories(repositoryPaths), onChange: setRepositoryPaths, allowMultipleSelection: true, canChooseDirectories: true, canChooseFiles: false }) }));
}
function CloningRepositoryListItem({ repo, groupActions, onFinish, onKill, onRetry, onRemove, onOpen, }) {
    if (repo.cloning === undefined)
        return undefined;
    const { gitManager } = (0, useGitRepository_1.useGitRepository)(repo.path);
    if (!gitManager)
        return undefined;
    const progressState = (0, useInterval_1.useInterval)(500, () => {
        const progressState = gitManager.getClonningState(repo.cloning);
        if (progressState?.exitCode === 0) {
            gitManager.cleanupCloningProcess(repo.cloning);
            onFinish();
        }
        return progressState;
    });
    const icon = (() => {
        if (progressState?.exitCode !== undefined && progressState?.exitCode !== 0) {
            return { source: api_1.Icon.XMarkCircle, tintColor: api_1.Color.Red };
        }
        return { source: api_1.Icon.CircleProgress25, tintColor: api_1.Color.Blue };
    })();
    const accessories = (() => {
        if (progressState && progressState.exitCode !== undefined && progressState.exitCode !== 0) {
            return [{
                    text: { value: "Failed to Clone", color: api_1.Color.Red },
                    tooltip: `${progressState.exitCode}: ${progressState.output}`,
                }];
        }
        else if (progressState && progressState.output.length > 0) {
            // Still cloning
            return [{
                    text: { value: progressState.output, color: api_1.Color.SecondaryText },
                }];
        }
        else {
            return [{
                    text: { value: "Prepare to clone...", color: api_1.Color.SecondaryText },
                }];
        }
    })();
    const handleKill = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Kill Clone Process",
            message: `Are you sure you want to stop cloning "${repo.name}"?`,
            primaryAction: {
                title: "Kill",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            await gitManager.killCloningProcess(repo.cloning);
            fs_1.promises.rm(repo.path, { recursive: true, force: true });
            onKill();
        }
    };
    const handleRetry = async () => {
        await fs_1.promises.rm(repo.path, { recursive: true, force: true });
        gitManager.cleanupCloningProcess(repo.cloning);
        const cloningProcess = await git_manager_1.GitManager.startCloneRepository(repo.cloning.url, repo.path);
        onRetry(cloningProcess);
    };
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: repo.id, icon: icon, title: repo.name, accessories: accessories, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [progressState && progressState.exitCode !== undefined && progressState.exitCode !== 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.Open, { title: "Show Logs", icon: api_1.Icon.Document, target: repo.cloning.stderrPath }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Retry Clone", icon: api_1.Icon.Repeat, onAction: handleRetry, shortcut: { modifiers: ["cmd"], key: "r" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Remove from List", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, onAction: onRemove, shortcut: { modifiers: ["ctrl"], key: "x" } })] })) : ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Kill Process", icon: api_1.Icon.Stop, style: api_1.Action.Style.Destructive, onAction: handleKill }) })), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Clone URL", content: repo.cloning.url }), (0, jsx_runtime_1.jsx)(RepositoryDirectoryActions_1.RepositoryDirectoryActions, { repositoryPath: repo.path, onOpen: onOpen }), groupActions] }) }));
}
