"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FilesView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const utils_1 = require("@raycast/utils");
const FileActions_1 = require("../../components/actions/FileActions");
const FileHistoryView_1 = require("./FileHistoryView");
const path_1 = require("path");
const react_1 = require("react");
const fs_1 = require("fs");
const fast_fuzzy_1 = require("fast-fuzzy");
const WorkspaceNavigationActions_1 = require("../../components/actions/WorkspaceNavigationActions");
const MAX_RESULTS = 60;
function FilesView(context) {
    const [searchText, setSearchText] = (0, react_1.useState)("");
    const [isSearching, setIsSearching] = (0, react_1.useState)(false);
    const [recentFiles, setRecentFiles] = (0, utils_1.useCachedState)(`recent-files-${context.gitManager.repoPath}`, []);
    const { data: filePaths, isLoading: isLoadingRepositoryContent } = (0, utils_1.usePromise)(async (repoPath) => {
        return await context.gitManager.getTrackedFilePaths();
    }, [context.gitManager.repoPath]);
    const searchResult = (0, react_1.useMemo)(() => {
        if (!filePaths)
            return [];
        const query = searchText.trim();
        if (!query)
            return [];
        // Fuzzy search using fast-fuzzy
        setIsSearching(true);
        const results = (0, fast_fuzzy_1.search)(query, filePaths, {
            keySelector: (filePath) => (0, path_1.basename)(filePath),
            sortBy: fast_fuzzy_1.sortKind.bestMatch,
            useDamerau: true,
            ignoreCase: true
        });
        setIsSearching(false);
        return results.slice(0, MAX_RESULTS);
    }, [filePaths, searchText]);
    const handleAddRecent = (filePath) => {
        setRecentFiles((prev) => {
            const next = [filePath, ...prev.filter((p) => p !== filePath)];
            return next;
        });
    };
    const handleClearRecent = async () => {
        setRecentFiles([]);
        await (0, api_1.showToast)({ style: api_1.Toast.Style.Success, title: "Recent files cleared" });
    };
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoadingRepositoryContent || isSearching, navigationTitle: "Repository Files", searchBarPlaceholder: "Search files by name, path...", searchBarAccessory: (0, WorkspaceNavigationActions_1.WorkspaceNavigationDropdown)(context), onSearchTextChange: setSearchText, searchText: searchText, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { onClearRecent: handleClearRecent, ...context }) }), children: !filePaths || filePaths.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No tracked files", description: "Repository has no tracked files.", icon: api_1.Icon.Document, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { onClearRecent: handleClearRecent, ...context }) }) })) : ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: searchText.trim().length === 0 ? (recentFiles && recentFiles.length > 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Recently Visited Files", children: recentFiles
                    .filter((path) => filePaths?.includes(path))
                    .map((filePath) => ((0, jsx_runtime_1.jsx)(FileListItem, { filePath: filePath, onOpen: () => handleAddRecent(filePath), onClearRecent: handleClearRecent, ...context }, `recent:${filePath}`))) })) : ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "Start typing to search files", description: "Type to search tracked files using fuzzy match", icon: api_1.Icon.MagnifyingGlass, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { onClearRecent: handleClearRecent, ...context }) }) }))) : searchResult.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No results", description: "Try different search terms.", icon: api_1.Icon.MagnifyingGlass, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { onClearRecent: handleClearRecent, ...context }) }) })) : (searchResult.map((filePath) => ((0, jsx_runtime_1.jsx)(FileListItem, { filePath: filePath, onOpen: () => handleAddRecent(filePath), onClearRecent: handleClearRecent, ...context }, filePath)))) })) }));
}
function FileListItem(context) {
    const absolutePath = (0, path_1.join)(context.gitManager.repoPath, context.filePath);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: context.filePath, title: (0, path_1.basename)(context.filePath), subtitle: {
            value: context.filePath,
            tooltip: context.filePath
        }, icon: (0, fs_1.existsSync)(absolutePath) ? { fileIcon: absolutePath } : undefined, quickLook: (0, fs_1.existsSync)(absolutePath) ? { path: absolutePath, name: absolutePath } : undefined, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: (0, path_1.basename)(context.filePath), children: [(0, jsx_runtime_1.jsx)(FileHistoryView_1.FileHistoryAction, { ...context, filePath: absolutePath, onOpen: context.onOpen }), (0, jsx_runtime_1.jsx)(FileActions_1.FileManagerActions, { filePath: absolutePath })] }), (0, jsx_runtime_1.jsx)(SharedActionsSection, { ...context })] }) }));
}
function SharedActionsSection(context) {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Recent", children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Clear Recent Files", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["cmd", "ctrl"], key: "x" }, onAction: context.onClearRecent }) }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }));
}
