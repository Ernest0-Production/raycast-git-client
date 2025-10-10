"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileHistoryAction = FileHistoryAction;
exports.default = FileHistoryView;
const react_1 = require("react");
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_2 = require("react");
const utils_1 = require("@raycast/utils");
const useGitDiff_1 = require("../../hooks/useGitDiff");
const FileActions_1 = require("../../components/actions/FileActions");
const StatusActions_1 = require("../../components/actions/StatusActions");
const StatusIcons_1 = require("../../components/icons/StatusIcons");
const path_1 = require("path");
const CommitActions_1 = require("../../components/actions/CommitActions");
const fs_1 = require("fs");
const RemoteActions_1 = require("../../components/actions/RemoteActions");
const ToggleDetailAction_1 = require("../../components/actions/ToggleDetailAction");
function FileHistoryAction(context) {
    if (!(0, fs_1.existsSync)(context.filePath))
        return null;
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Show File History", icon: api_1.Icon.Clock, onPush: context.onOpen, target: (0, jsx_runtime_1.jsx)(FileHistoryView, { ...context }), shortcut: { modifiers: ["cmd", "shift"], key: "h" } }));
}
function FileHistoryView(context) {
    const toggleDetailController = (0, ToggleDetailAction_1.useToggleDetail)("FileHistory-Detail", "Detail", false);
    const toggleMetadataController = (0, ToggleDetailAction_1.useToggleDetail)("FileHistory-Metadata", "Metadata", true);
    const [selectedCommitId, setSelectedCommitId] = (0, react_2.useState)(null);
    const { data: commits, isLoading, revalidate: revalidateHistory, error } = (0, utils_1.usePromise)(async (filePath, repoPath) => {
        return await context.gitManager.getFileHistory(filePath);
    }, [context.filePath, context.gitManager.repoPath]);
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoading, navigationTitle: `File History`, searchBarPlaceholder: "Search commits by message, sha, author...", onSelectionChange: setSelectedCommitId, isShowingDetail: toggleDetailController.isShowingDetail, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(RefreshHistoryAction, { revalidate: revalidateHistory }) }), children: error ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "Error loading history", description: error.message, icon: api_1.Icon.ExclamationMark, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(RefreshHistoryAction, { revalidate: revalidateHistory }) }) })) : !commits || commits.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No history", description: "No commits have modified this file.", icon: api_1.Icon.Document })) : ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: (0, path_1.basename)(context.filePath), subtitle: `${commits.length} commits`, children: commits.map((commit) => ((0, react_1.createElement)(CommitListItem, { ...context, key: commit.hash, commit: commit, file: commit.changedFiles[0], toggleDetailController: toggleDetailController, toggleMetadataController: toggleMetadataController, selectedCommitId: selectedCommitId, onRevalidateHistory: revalidateHistory }))) })) }));
}
function CommitListItem(context) {
    // Only load diff if this commit is selected and detail is visible
    const shouldLoadDiff = context.toggleDetailController.isShowingDetail && context.selectedCommitId === context.commit.hash;
    const { diff, isLoading, error } = (0, useGitDiff_1.useGitDiff)({
        gitManager: context.gitManager,
        options: { file: context.file.path, commitHash: context.commit.hash },
        execute: shouldLoadDiff,
    });
    const accessories = (0, react_2.useMemo)(() => {
        if (context.toggleDetailController.isShowingDetail) {
            return undefined;
        }
        return [
            { text: { value: context.commit.author }, tooltip: context.commit.authorEmail },
            { text: context.commit.date.toRelativeDateString() },
        ];
    }, [context.commit.author, context.commit.authorEmail, context.commit.date, context.toggleDetailController.isShowingDetail]);
    const absolutePath = (0, path_1.join)(context.gitManager.repoPath, context.file.path);
    const fileExists = (0, fs_1.existsSync)(absolutePath);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: context.commit.hash, title: context.commit.message, icon: (0, StatusIcons_1.CommitFileIcon)(context.file), accessories: accessories, keywords: [
            context.commit.hash,
            context.commit.shortHash,
            context.commit.author,
            context.commit.authorEmail
        ], detail: context.toggleDetailController.isShowingDetail ? ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail, { isLoading: isLoading, markdown: `${context.file.path}:\n\n${error ? `Error loading diff: ${error.message}` : (diff ?? "")}`, metadata: context.toggleMetadataController.isShowingDetail ? ((0, jsx_runtime_1.jsxs)(api_1.List.Item.Detail.Metadata, { children: [(0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Author", text: context.commit.author }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Email", text: context.commit.authorEmail }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Date", text: context.commit.date.toLocaleString() }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Hash", text: context.commit.hash })] })) : undefined })) : undefined, quickLook: fileExists ? { path: absolutePath, name: absolutePath } : undefined, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: context.toggleDetailController }), context.toggleDetailController.isShowingDetail && ((0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: context.toggleMetadataController, shortcut: { modifiers: ["shift", "cmd"], key: "i" } })), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: (0, path_1.basename)(context.file.path), children: [(0, jsx_runtime_1.jsx)(FileActions_1.FileManagerActions, { filePath: absolutePath }), (0, jsx_runtime_1.jsx)(StatusActions_1.FileRestoreAction, { filePath: absolutePath, before: false, ...context }), (0, jsx_runtime_1.jsx)(StatusActions_1.FileRestoreAction, { filePath: absolutePath, before: true, ...context })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Commit", children: [(0, jsx_runtime_1.jsx)(CommitActions_1.CommitCopyMessageAction, { commit: context.commit }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCopyAuthorAction, { commit: context.commit }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCopyHashAction, { commit: context.commit }), Object.keys(context.remotes.data).map((remote) => ((0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteOpenCommitAction, { remote: context.remotes.data[remote], commit: context.commit.hash }, `${remote}-open-commit`)))] }), (0, jsx_runtime_1.jsx)(RefreshHistoryAction, { revalidate: context.onRevalidateHistory })] }) }));
}
function RefreshHistoryAction({ revalidate }) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", onAction: revalidate, icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" } }));
}
