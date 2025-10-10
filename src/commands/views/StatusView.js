"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusView = StatusView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const useGitDiff_1 = require("../../hooks/useGitDiff");
const FileActions_1 = require("../../components/actions/FileActions");
const StatusIcons_1 = require("../../components/icons/StatusIcons");
const StashActions_1 = require("../../components/actions/StashActions");
const react_1 = require("react");
const fs_1 = require("fs");
const WorkspaceNavigationActions_1 = require("../../components/actions/WorkspaceNavigationActions");
const PatchActions_1 = require("../../components/actions/PatchActions");
const StatusActions_1 = require("../../components/actions/StatusActions");
const FileHistoryView_1 = require("./FileHistoryView");
const ToggleDetailAction_1 = require("../../components/actions/ToggleDetailAction");
const path_1 = require("path");
function StatusView(context) {
    const toggleController = (0, ToggleDetailAction_1.useToggleDetail)("Status Diff", "Changes", false);
    const [selectedFilePath, setSelectedFilePath] = (0, react_1.useState)(null);
    const stagedFiles = context.status.data?.files ? context.status.data.files.filter((f) => f.status === "staged") : [];
    const unstagedFiles = context.status.data?.files ? context.status.data.files.filter((f) => f.status === "unstaged" || f.status === "untracked") : [];
    const navigationTitle = (0, react_1.useMemo)(() => {
        if (context.status.data?.conflict) {
            switch (context.status.data.conflict.type) {
                case "rebase":
                    return `⚠️ Rebase Conflict (${context.status.data.conflict.current}/${context.status.data.conflict.total})`;
                case "merge":
                    return `⚠️ Merge Conflict (${context.status.data.conflict.current}/${context.status.data.conflict.total})`;
                case "squash":
                    return `Squashing Commit`;
                default:
                    return "⚠️ Conflict";
            }
        }
        else {
            return "Repository Status";
        }
    }, [context.status.data?.conflict]);
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: context.status.isLoading, navigationTitle: navigationTitle, searchBarPlaceholder: "Search files by name, path...", onSelectionChange: (id) => setSelectedFilePath(id), filtering: { keepSectionOrder: true }, isShowingDetail: toggleController.isShowingDetail, searchBarAccessory: (0, WorkspaceNavigationActions_1.WorkspaceNavigationDropdown)(context), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [context.status.data && context.branches.data.currentBranch && ((0, jsx_runtime_1.jsx)(StatusActions_1.CommitAction, { ...context })), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: toggleController }) }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Patch", children: (0, jsx_runtime_1.jsx)(PatchActions_1.PatchApplyAction, { ...context }) }), context.status.data && ((0, jsx_runtime_1.jsx)(StatusActions_1.ConflictAbortAction, { ...context })), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Workspace", children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", onAction: context.status.revalidate, icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" } }) }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }), children: context.status.error ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "Error loading status", description: context.status.error.message, icon: api_1.Icon.ExclamationMark, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Workspace", children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", onAction: context.status.revalidate, icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" } }) }), (0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: toggleController }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) })) : !context.status.data?.files || context.status.data.files.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No changes", description: "No changes in the repository. The working directory is clean.", icon: api_1.Icon.NewDocument, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", onAction: context.status.revalidate, icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" } }), (0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: toggleController }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Patch", children: (0, jsx_runtime_1.jsx)(PatchActions_1.PatchApplyAction, { ...context }) }), context.status.data && ((0, jsx_runtime_1.jsx)(StatusActions_1.ConflictAbortAction, { ...context })), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [unstagedFiles.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Unstaged Files", subtitle: `${unstagedFiles.length}`, children: unstagedFiles.map((file) => ((0, jsx_runtime_1.jsx)(FileListItem, { file: file, toggleController: toggleController, selectedFilePath: selectedFilePath, ...context }, file.path))) })), stagedFiles.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Staged Files", subtitle: `${stagedFiles.length}`, children: stagedFiles.map((file) => ((0, jsx_runtime_1.jsx)(FileListItem, { file: file, toggleController: toggleController, selectedFilePath: selectedFilePath, ...context }, file.path))) }))] })) }));
}
function FileListItem(context) {
    // Create a unique identifier for each file item
    const fileId = `${context.file.relativePath}-${context.file.status}`;
    // Only load diff if this file is selected and detail view is showing
    const isFocused = context.toggleController.isShowingDetail && context.selectedFilePath === fileId;
    const { diff, isLoading } = (0, useGitDiff_1.useGitDiff)({
        gitManager: context.gitManager,
        options: { file: context.file.relativePath, status: context.file.status },
        execute: isFocused,
    });
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: fileId, title: (0, path_1.basename)(context.file.path), subtitle: context.toggleController.isShowingDetail ? undefined : {
            value: context.file.relativePath,
            tooltip: context.file.relativePath
        }, icon: (0, StatusIcons_1.FileStatusIcon)(context.file), keywords: [context.file.path, context.file.oldPath].filter((keyword) => Boolean(keyword)), detail: context.toggleController.isShowingDetail ? ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail, { isLoading: isLoading, markdown: `${context.file.relativePath}:\n\n${diff ?? ""}`, metadata: true })) : undefined, quickLook: (0, fs_1.existsSync)(context.file.path) ? { path: context.file.path, name: context.file.relativePath } : undefined, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: (0, path_1.basename)(context.file.path), children: [context.file.status === "staged" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(StatusActions_1.FileUnstageAction, { ...context }), (0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: context.toggleController }), (0, jsx_runtime_1.jsx)(FileActions_1.FileManagerActions, { filePath: context.file.path })] })), (context.file.status === "unstaged" || context.file.status === "untracked") && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(StatusActions_1.FileStageAction, { ...context }), (0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: context.toggleController }), (0, jsx_runtime_1.jsx)(FileActions_1.FileManagerActions, { filePath: context.file.path }), context.file.type !== "conflicted" && ((0, jsx_runtime_1.jsx)(StatusActions_1.FileDiscardAction, { ...context }))] })), (0, jsx_runtime_1.jsx)(FileHistoryView_1.FileHistoryAction, { filePath: context.file.path, ...context })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { children: [context.branches.data.currentBranch && ((0, jsx_runtime_1.jsx)(StatusActions_1.CommitAction, { ...context })), (0, jsx_runtime_1.jsx)(StatusActions_1.ConflictAbortAction, { ...context }), (0, jsx_runtime_1.jsx)(StatusActions_1.FileStageAllAction, { ...context }), (0, jsx_runtime_1.jsx)(StatusActions_1.FileUnstageAllAction, { ...context }), (0, jsx_runtime_1.jsx)(StatusActions_1.FileDiscardAllAction, { ...context })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Patch", children: [(0, jsx_runtime_1.jsx)(StashActions_1.StashCreateAction, { ...context }), (0, jsx_runtime_1.jsx)(PatchActions_1.PatchCreateAction, { ...context }), (0, jsx_runtime_1.jsx)(PatchActions_1.PatchApplyAction, { ...context })] }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Workspace", children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", onAction: context.status.revalidate, icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" } }) }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) }));
}
