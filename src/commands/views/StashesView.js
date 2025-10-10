"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StashesView = StashesView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const StashActions_1 = require("../../components/actions/StashActions");
require("../../utils/date-utils");
const utils_1 = require("@raycast/utils");
const WorkspaceNavigationActions_1 = require("../../components/actions/WorkspaceNavigationActions");
function StashesView(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: context.stashes.isLoading, navigationTitle: "Repository Stashes", searchBarPlaceholder: "Search stashes by message, author...", searchBarAccessory: (0, WorkspaceNavigationActions_1.WorkspaceNavigationDropdown)(context), actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { ...context }) }), children: !context.stashes.data || context.stashes.data.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No stashes", description: "No saved changes in the stash.", icon: api_1.Icon.Bookmark, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { ...context }) }) })) : (context.stashes.data.map((stash, index) => ((0, jsx_runtime_1.jsx)(StashListItem, { stash: stash, index: index, ...context }, index)))) }));
}
function StashListItem(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: context.stash.message, icon: { source: (0, utils_1.getAvatarIcon)(context.stash.author), tooltip: context.stash.author }, subtitle: { value: context.stash.author, tooltip: context.stash.authorEmail }, accessories: [{ text: context.stash.date.toRelativeDateString(), tooltip: context.stash.date.toRelativeDateString() }], keywords: [context.stash.hash, context.stash.author, context.stash.authorEmail].filter(Boolean), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { children: [(0, jsx_runtime_1.jsx)(StashActions_1.StashApplyAction, { ...context }), (0, jsx_runtime_1.jsx)(StashActions_1.StashDropAction, { ...context })] }), (0, jsx_runtime_1.jsx)(SharedActionsSection, { ...context })] }) }));
}
function SharedActionsSection(context) {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh Stash", onAction: context.stashes.revalidate, icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" } }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }));
}
