"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchesView = BranchesView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const BranchActions_1 = require("../../components/actions/BranchActions");
const react_1 = require("react");
const RemoteHostIcons_1 = require("../../components/icons/RemoteHostIcons");
const WorkspaceNavigationActions_1 = require("../../components/actions/WorkspaceNavigationActions");
const RemoteActions_1 = require("../../components/actions/RemoteActions");
function BranchesView(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: context.branches.isLoading, navigationTitle: "Repository Branches", searchBarPlaceholder: "Search branches by name...", searchBarAccessory: (0, WorkspaceNavigationActions_1.WorkspaceNavigationDropdown)(context), children: context.branches.error ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "Error loading branches", description: context.branches.error.message, icon: api_1.Icon.ExclamationMark, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Branches", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", icon: api_1.Icon.ArrowClockwise, onAction: context.branches.revalidate, shortcut: { modifiers: ["cmd"], key: "r" } }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchCreateAction, { ...context }), (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteFetchAction, { ...context })] }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) })) : !context.branches.data ||
            (!context.branches.data.currentBranch && !context.branches.data.detachedHead) ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No branches", description: "No branches found in the repository.", icon: `git-branch.svg`, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Branches", children: [(0, jsx_runtime_1.jsx)(BranchActions_1.BranchCreateAction, { ...context }), (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteFetchAction, { ...context }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", icon: api_1.Icon.ArrowClockwise, onAction: context.branches.revalidate, shortcut: { modifiers: ["cmd"], key: "r" } })] }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [context.branches.data.currentBranch && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Current Branch", children: (0, jsx_runtime_1.jsx)(BranchListItem, { branch: context.branches.data.currentBranch, ...context }, context.branches.data.currentBranch.displayName) })), context.branches.data.detachedHead && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Detached HEAD", children: (0, jsx_runtime_1.jsx)(DetachedHeadListItem, { detachedHead: context.branches.data.detachedHead, ...context }, context.branches.data.detachedHead.shortCommitHash) })), context.branches.data.localBranches.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Local Branches", children: context.branches.data.localBranches.map((branch) => ((0, jsx_runtime_1.jsx)(BranchListItem, { branch: branch, ...context }, branch.displayName))) })), Object.entries(context.branches.data.remoteBranches).map(([remoteName, remoteBranches]) => ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: `${remoteName} • ${context.remotes.data[remoteName]?.organizationName}/${context.remotes.data[remoteName]?.repositoryName}`, children: remoteBranches.map((branch) => ((0, jsx_runtime_1.jsx)(BranchListItem, { branch: branch, ...context }, branch.displayName))) }, remoteName)))] })) }));
}
function BranchListItem(context) {
    const hasConflicts = context.branch.type === "current"
        && context.status.data?.files?.some((file) => file.type === "conflicted");
    const hasUncommittedChanges = context.branch.type === "current"
        && context.status.data?.files?.length !== 0;
    const accessories = (0, react_1.useMemo)(() => {
        const result = [];
        // Add conflict warning indicator for current branch
        if (context.branch.type === "current" && hasConflicts) {
            result.push({
                tag: { value: "Conflicts", color: api_1.Color.Red },
                icon: api_1.Icon.ExclamationMark,
                tooltip: "There are unresolved merge conflicts",
            });
        }
        // Add uncommitted changes indicator for current branch
        if (context.branch.type === "current" && hasUncommittedChanges && !hasConflicts) {
            result.push({
                tag: { value: "Uncommitted", color: api_1.Color.Orange },
                icon: api_1.Icon.Document,
                tooltip: "There are uncommitted changes",
            });
        }
        // Add ahead/behind indicators
        if (context.branch.ahead || context.branch.behind) {
            const parts = [];
            if (context.branch.ahead)
                parts.push(`${context.branch.ahead} ↑`);
            if (context.branch.behind)
                parts.push(`${context.branch.behind} ↓`);
            result.push({
                text: parts.join(" "),
                tooltip: [
                    context.branch.ahead ? `↑ ahead by ${context.branch.ahead} commits` : null,
                    context.branch.behind ? `↓ behind by ${context.branch.behind} commits` : null,
                ]
                    .filter(Boolean)
                    .join("\n"),
            });
        }
        if ((context.branch.type === "local" || context.branch.type === "current") && context.branch.upstream) {
            result.push({
                tag: {
                    value: context.branch.upstream,
                    color: context.branch.isGone ? api_1.Color.Yellow : api_1.Color.SecondaryText,
                },
                tooltip: context.branch.isGone ? "Upstream was removed from remote" : "Tracked upstream",
                icon: context.branch.isGone ? api_1.Icon.ExclamationMark : (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[context.branch.upstream.split("/")[0]]?.provider)
            });
        }
        return result;
    }, [context.branch, hasConflicts, hasUncommittedChanges]);
    // Determine icon based on branch type
    const icon = (0, react_1.useMemo)(() => {
        if (context.branch.type === "current") {
            return { source: api_1.Icon.Dot, tintColor: api_1.Color.Green };
        }
        else if (context.branch.type === "remote") {
            return (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[context.branch.remote]?.provider);
        }
        else {
            return { source: api_1.Icon.Dot, tintColor: api_1.Color.SecondaryText };
        }
    }, [context.branch.type]);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: context.branch.displayName, icon: icon, accessories: accessories, keywords: [context.branch.upstream, context.branch.remote].filter((keyword) => Boolean(keyword)), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: context.branch.displayName, children: [context.branch.type === "current" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(RemoteActions_1.RemotePullAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchPushAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchPushForceAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchRenameAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchCopyNameAction, { branch: context.branch.displayName })] })), context.branch.type === "local" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(BranchActions_1.BranchCkeckoutAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchPushAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchPushForceAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchRebaseAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchMergeAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchRenameAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchCopyNameAction, { branch: context.branch.displayName }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchDeleteAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchInteractiveRebaseAction, { ...context })] })), context.branch.type === "remote" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(BranchActions_1.BranchCkeckoutAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchPushAction, { ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchCopyNameAction, { branch: context.branch.displayName }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchDeleteAction, { ...context })] }))] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Branches", children: [(0, jsx_runtime_1.jsx)(BranchActions_1.BranchCreateAction, { ...context }), (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteFetchAction, { ...context }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", icon: api_1.Icon.ArrowClockwise, onAction: context.branches.revalidate, shortcut: { modifiers: ["cmd"], key: "r" } })] }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) }, context.branch.name));
}
function DetachedHeadListItem(context) {
    const hasConflicts = context.status.data?.files?.some((file) => file.type === "conflicted");
    const hasUncommittedChanges = context.status.data?.files?.length !== 0;
    const accessories = (0, react_1.useMemo)(() => {
        const result = [];
        if (hasConflicts) {
            result.push({
                icon: { source: api_1.Icon.ExclamationMark },
                tag: { value: "Conflicts", color: api_1.Color.Red },
                tooltip: "Conflicts",
            });
        }
        if (hasUncommittedChanges && !hasConflicts) {
            result.push({
                icon: { source: api_1.Icon.Dot, tintColor: api_1.Color.Orange },
                tag: { value: "Uncommitted", color: api_1.Color.Orange },
                tooltip: "Uncommitted changes",
            });
        }
        return result;
    }, [context.detachedHead, hasUncommittedChanges, hasConflicts]);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: `HEAD (${context.detachedHead.shortCommitHash})`, subtitle: context.detachedHead.commitMessage, icon: { source: api_1.Icon.Anchor }, accessories: accessories, keywords: [context.detachedHead.commitHash], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Branches", children: [(0, jsx_runtime_1.jsx)(BranchActions_1.BranchCreateAction, { ...context }), (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteFetchAction, { ...context }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", icon: api_1.Icon.ArrowClockwise, onAction: context.branches.revalidate, shortcut: { modifiers: ["cmd"], key: "r" } })] }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }) }, context.detachedHead.shortCommitHash));
}
