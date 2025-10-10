"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RemotesView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const RemoteHostIcons_1 = require("../../components/icons/RemoteHostIcons");
const utils_1 = require("@raycast/utils");
const WorkspaceNavigationActions_1 = require("../../components/actions/WorkspaceNavigationActions");
const RemoteActions_1 = require("../../components/actions/RemoteActions");
function RemotesView(context) {
    const { data: connectivity, isLoading: isChecking, revalidate: revalidateConnectivity } = (0, utils_1.usePromise)(async (repoPath, remoteHosts) => {
        const entries = await Promise.all(remoteHosts.map(async (name) => {
            try {
                await context.gitManager.checkRemoteConnectivity(name);
                return [name, { reachable: true }];
            }
            catch (error) {
                return [name, { reachable: false, reason: error instanceof Error ? error.message : "Unknown error" }];
            }
        }));
        return Object.fromEntries(entries);
    }, [context.gitManager.repoPath, Object.keys(context.remotes.data).map(name => name)]);
    const items = (0, react_1.useMemo)(() => Object.values(context.remotes.data), [context.remotes.data]);
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isChecking, navigationTitle: "Repository Remotes", searchBarAccessory: (0, WorkspaceNavigationActions_1.WorkspaceNavigationDropdown)(context), actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { onCheckAgain: revalidateConnectivity, ...context }) }), children: items.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No remotes", description: "This repository has no remote configured.", icon: api_1.Icon.Network, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { onCheckAgain: revalidateConnectivity, ...context }) }) })) : (items.map((remote) => ((0, jsx_runtime_1.jsx)(RemoteListItem, { remote: remote, ...context, connectivity: connectivity?.[remote.name], isLoading: isChecking, onCheckAgain: revalidateConnectivity }, remote.name)))) }));
}
function RemoteListItem(context) {
    const accessories = (0, react_1.useMemo)(() => {
        const result = [];
        if (context.isLoading) {
            result.push({
                text: { value: "Checking Connectivity...", color: api_1.Color.SecondaryText },
            });
        }
        else if (context.connectivity) {
            result.push({
                tag: { value: context.connectivity.reachable ? "Online" : "Offline", color: context.connectivity.reachable ? api_1.Color.Green : api_1.Color.Red },
                icon: api_1.Icon.Dot,
                tooltip: context.connectivity.reachable ? "Connection established via ls-remote" : context.connectivity.reason,
            });
        }
        return result;
    }, [context.connectivity, context.isLoading]);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: context.remote.name, subtitle: {
            value: context.remote.fetchUrl,
            tooltip: context.remote.fetchUrl
        }, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remote.provider), accessories: accessories, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: context.remote.name, children: [(0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { title: "Open in Browser", url: context.remote.fetchUrl, icon: api_1.Icon.Link }), (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteEditAction, { initialRemote: context.remote, ...context }), (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteCopyUrlActions, { remote: context.remote }), (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteDeleteAction, { ...context })] }), (0, jsx_runtime_1.jsx)(SharedActionsSection, { ...context })] }) }, context.remote.name));
}
function SharedActionsSection(context) {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteAddAction, { ...context }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Check Again", onAction: context.onCheckAgain, icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" } }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }));
}
