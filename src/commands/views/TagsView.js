"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TagsView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const WorkspaceNavigationActions_1 = require("../../components/actions/WorkspaceNavigationActions");
const TagActions_1 = require("../../components/actions/TagActions");
function TagsView(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: context.tags.isLoading, navigationTitle: "Repository Tags", searchBarPlaceholder: "Search tags by name...", searchBarAccessory: (0, WorkspaceNavigationActions_1.WorkspaceNavigationDropdown)(context), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Tags", children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", icon: api_1.Icon.ArrowClockwise, onAction: context.tags.revalidate, shortcut: { modifiers: ["cmd"], key: "r" } }) }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }), children: context.tags.error ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "Error loading tags", description: context.tags.error.message, icon: api_1.Icon.ExclamationMark, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", icon: api_1.Icon.ArrowClockwise, onAction: context.tags.revalidate, shortcut: { modifiers: ["cmd"], key: "r" } }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) })) : (!context.tags.data || (context.tags.data.local.length === 0 && Object.values(context.tags.data.remotes).every(arr => arr.length === 0))) ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No tags", description: "No tags found in the repository.", icon: api_1.Icon.Tag })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [context.tags.data.local.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Local Tags", children: context.tags.data.local.map((tag) => ((0, jsx_runtime_1.jsx)(TagListItem, { scope: "local", tag: tag, ...context }, `local:${tag.name}`))) })), Object.entries(context.tags.data.remotes).map(([remoteName, tags]) => (tags.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: `${remoteName} • ${context.remotes.data[remoteName]?.organizationName}/${context.remotes.data[remoteName]?.repositoryName}`, children: tags.map((tag) => ((0, jsx_runtime_1.jsx)(TagListItem, { scope: remoteName, tag: tag, ...context }, `remote:${remoteName}:${tag.name}`))) }, remoteName))))] })) }));
}
function TagListItem(context) {
    const accessories = (0, react_1.useMemo)(() => {
        const items = [];
        if (context.scope !== "local") {
            items.push({ tag: { value: context.scope, color: api_1.Color.SecondaryText }, icon: api_1.Icon.Network });
        }
        if (context.tag.commitHash) {
            items.push({ text: context.tag.commitHash.substring(0, 7), tooltip: context.tag.commitHash });
        }
        return items;
    }, [context.tag, context.scope]);
    const icon = (0, react_1.useMemo)(() => {
        return context.scope === "local" ? api_1.Icon.Tag : api_1.Icon.Upload;
    }, [context.scope]);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: context.tag.name, subtitle: context.tag.message, icon: icon, accessories: accessories, keywords: [context.tag.commitHash].filter(Boolean), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: context.tag.name, children: [(0, jsx_runtime_1.jsx)(TagActions_1.TagCheckoutAction, { tagName: context.tag.name, remoteName: context.scope === "local" ? undefined : context.scope, ...context }), (0, jsx_runtime_1.jsx)(TagActions_1.TagCopyNameAction, { tagName: context.tag.name })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Tag", children: [(0, jsx_runtime_1.jsx)(TagActions_1.TagPushAction, { tagName: context.tag.name, ...context }), (0, jsx_runtime_1.jsx)(TagActions_1.TagRenameAction, { tagName: context.tag.name, ...context }), (0, jsx_runtime_1.jsx)(TagActions_1.TagRemoveAction, { tagName: context.tag.name, ...context })] }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Explore", children: (0, jsx_runtime_1.jsx)(TagActions_1.TagOpenCommitAction, { tagName: context.tag.name, ...context }) }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) }, `${context.scope}:${context.tag.name}`));
}
