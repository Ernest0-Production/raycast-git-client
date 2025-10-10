"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitDetailsView = CommitDetailsView;
exports.CommitDetailsByRefView = CommitDetailsByRefView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const useGitDiff_1 = require("../../hooks/useGitDiff");
const FileActions_1 = require("../../components/actions/FileActions");
const StatusIcons_1 = require("../../components/icons/StatusIcons");
const react_1 = require("react");
const utils_1 = require("@raycast/utils");
const fs_1 = require("fs");
const path_1 = require("path");
const WorkspaceNavigationActions_1 = require("../../components/actions/WorkspaceNavigationActions");
const StatusActions_1 = require("../../components/actions/StatusActions");
const FileHistoryView_1 = require("./FileHistoryView");
const ToggleDetailAction_1 = require("../../components/actions/ToggleDetailAction");
function CommitDetailsView(context) {
    const [currentIndex, setCurrentIndex] = (0, react_1.useState)(context.index);
    const toggleController = (0, ToggleDetailAction_1.useToggleDetail)("Commit Details", "Diff", false);
    const switchToCommit = async (direction) => {
        let nextIndex = currentIndex;
        switch (direction) {
            case "parent":
                nextIndex = currentIndex + 1;
                break;
            case "child":
                nextIndex = currentIndex - 1;
                break;
        }
        if (nextIndex < 0) {
            (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "No more commits",
                message: "This is the last commit in the repository.",
            });
            return;
        }
        if (nextIndex >= context.commits.data.length) {
            context.commits.pagination?.onLoadMore();
            if (!context.commits.pagination?.hasMore) {
                (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "No more commits",
                    message: "This is the last commit in the repository.",
                });
                return;
            }
            switchToCommit(direction);
            return;
        }
        setCurrentIndex(nextIndex);
        context.onMoveToCommit(context.commits.data[nextIndex].hash);
    };
    return ((0, jsx_runtime_1.jsx)(ConcreteCommitView, { ...context, commit: context.commits.data[currentIndex], toggleController: toggleController, onMoveToCommit: switchToCommit }));
}
function CommitDetailsByRefView(context) {
    const toggleController = (0, ToggleDetailAction_1.useToggleDetail)("Commit Details", "Diff", false);
    const { data: commit, isLoading } = (0, utils_1.usePromise)(async (ref) => await context.gitManager.getCommitByRef(ref), [context.refName]);
    if (!commit) {
        return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoading, navigationTitle: `Commit ${context.refName}`, children: (0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "Loading commit", icon: api_1.Icon.Hourglass }) }));
    }
    return ((0, jsx_runtime_1.jsx)(ConcreteCommitView, { ...context, commit: commit, toggleController: toggleController, onMoveToCommit: () => { } }));
}
function ConcreteCommitView(context) {
    const [selectedFilePath, setSelectedFilePath] = (0, react_1.useState)(null);
    const { data: statsMap, isLoading } = (0, utils_1.usePromise)(async (repoPath, commitHash) => {
        return await context.gitManager.getCommitFileStats(commitHash);
    }, [context.gitManager.repoPath, context.commit.hash]);
    return ((0, jsx_runtime_1.jsx)(api_1.List, { navigationTitle: "Commit Changes", searchBarPlaceholder: "Search files by name, path...", onSelectionChange: (id) => setSelectedFilePath(id), filtering: { keepSectionOrder: true }, isShowingDetail: context.toggleController.isShowingDetail, isLoading: isLoading, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: context.toggleController }), (0, jsx_runtime_1.jsx)(CommitNavigationActions, { onMoveToCommit: context.onMoveToCommit }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }), children: !context.commit.changedFiles || context.commit.changedFiles.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No file changes", description: "This commit has no file changes.", icon: api_1.Icon.Document, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(CommitNavigationActions, { onMoveToCommit: context.onMoveToCommit }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) })) : ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: context.commit.message, children: context.commit.changedFiles.map((file) => ((0, jsx_runtime_1.jsx)(FileListItem, { file: file, selectedFilePath: selectedFilePath, statsMap: statsMap, ...context }, file.path))) })) }));
}
function FileListItem(context) {
    // Create a unique identifier for each file item
    const fileId = `${context.file.path}-${context.commit.hash}`;
    // Only load diff if this file is selected and detail view is showing
    const shouldLoadDiff = context.toggleController.isShowingDetail && context.selectedFilePath === fileId;
    const { diff, isLoading, error } = (0, useGitDiff_1.useGitDiff)({
        gitManager: context.gitManager,
        options: { file: context.file.path, commitHash: context.commit.hash },
        execute: shouldLoadDiff,
    });
    const absolutePath = (0, path_1.join)(context.gitManager.repoPath, context.file.path);
    const fileExists = (0, fs_1.existsSync)(absolutePath);
    const accessories = (0, react_1.useMemo)(() => {
        const accessories = [];
        const stats = context.statsMap?.[context.file.path];
        if (stats) {
            if (stats.insertions > 0) {
                accessories.push({ tag: { value: `+${stats.insertions}`, color: api_1.Color.Green }, tooltip: "Insertions" });
            }
            if (stats.deletions > 0) {
                accessories.push({ tag: { value: `-${stats.deletions}`, color: api_1.Color.Red }, tooltip: "Deletions" });
            }
        }
        return accessories;
    }, [context.statsMap, context.file.path]);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: fileId, title: (0, path_1.basename)(context.file.path), subtitle: context.toggleController.isShowingDetail ? undefined : {
            value: context.file.path,
            tooltip: context.file.path
        }, icon: (0, StatusIcons_1.CommitFileIcon)(context.file), accessories: accessories, keywords: [context.file.path, context.file.oldPath].filter((keyword) => Boolean(keyword)), detail: context.toggleController.isShowingDetail ? ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail, { isLoading: isLoading, markdown: `${context.file.path}:\n\n${error ? `Error loading diff: ${error.message}` : (diff ?? "")}` })) : undefined, quickLook: fileExists ? { path: absolutePath, name: context.file.path } : undefined, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: (0, path_1.basename)(context.file.path), children: [(0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: context.toggleController }), (0, jsx_runtime_1.jsx)(FileActions_1.FileManagerActions, { filePath: absolutePath }), (0, jsx_runtime_1.jsx)(FileHistoryView_1.FileHistoryAction, { filePath: absolutePath, ...context }), (0, jsx_runtime_1.jsx)(StatusActions_1.FileRestoreAction, { filePath: absolutePath, before: false, ...context }), (0, jsx_runtime_1.jsx)(StatusActions_1.FileRestoreAction, { before: true, filePath: absolutePath, ...context })] }), (0, jsx_runtime_1.jsx)(CommitNavigationActions, { onMoveToCommit: context.onMoveToCommit }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) }));
}
function CommitNavigationActions({ onMoveToCommit }) {
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "History", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Move to Child Commit", icon: api_1.Icon.ChevronUp, onAction: () => onMoveToCommit("child"), shortcut: { modifiers: ["cmd"], key: "]" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Move to Parent Commit", icon: api_1.Icon.ChevronDown, onAction: () => onMoveToCommit("parent"), shortcut: { modifiers: ["cmd"], key: "[" } })] }));
}
