"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitsView = CommitsView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const utils_1 = require("@raycast/utils");
const CommitActions_1 = require("../../components/actions/CommitActions");
const TagActions_1 = require("../../components/actions/TagActions");
const BranchActions_1 = require("../../components/actions/BranchActions");
const CommitDetailsView_1 = require("./CommitDetailsView");
const useIssueTracker_1 = require("../../hooks/useIssueTracker");
require("../../utils/date-utils");
const react_1 = require("react");
const CommitMessageView_1 = require("./CommitMessageView");
const RemoteHostIcons_1 = require("../../components/icons/RemoteHostIcons");
const RemoteActions_1 = require("../../components/actions/RemoteActions");
const WorkspaceNavigationActions_1 = require("../../components/actions/WorkspaceNavigationActions");
const ToggleDetailAction_1 = require("../../components/actions/ToggleDetailAction");
const path_1 = require("path");
function CommitsView(context) {
    const toggleDetailController = (0, ToggleDetailAction_1.useToggleDetail)("Commits-Detail", "Detail", false);
    const toggleMetadataController = (0, ToggleDetailAction_1.useToggleDetail)("Commits-Metadata", "Metadata", true);
    const [selectedCommitId, setSelectedCommitId] = (0, react_1.useState)(null);
    // Load URL tracker configurations once for the entire view
    const { configs: IssueTrackerConfigs, findUrls } = (0, useIssueTracker_1.useIssueTracker)();
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: context.commits.isLoading, pagination: context.commits.pagination, navigationTitle: "Repository Commits", searchBarPlaceholder: "Search commits by message, sha, author, tags, files...", selectedItemId: selectedCommitId || undefined, isShowingDetail: toggleDetailController.isShowingDetail, searchBarAccessory: (0, WorkspaceNavigationActions_1.WorkspaceNavigationDropdown)(context), actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { toggleDetailController: toggleDetailController, toggleMetadataController: toggleMetadataController, ...context }) }), children: context.commits.error ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "Error loading commits", description: context.commits.error.message, icon: api_1.Icon.ExclamationMark, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(SharedActionsSection, { toggleDetailController: toggleDetailController, toggleMetadataController: toggleMetadataController, ...context }) }) })) : !context.commits.data || context.commits.data.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No commits", description: "No commits in this branch.", icon: `git-commit.svg` })) : ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: getBranchFilterDisplayName(context), children: context.commits.data.map((commit, index) => ((0, jsx_runtime_1.jsx)(CommitListItem, { commit: commit, index: index, toggleDetailController: toggleDetailController, toggleMetadataController: toggleMetadataController, issueTrackerConfigs: IssueTrackerConfigs, findUrls: findUrls, onMoveToCommit: setSelectedCommitId, ...context }, commit.hash))) })) }));
}
function CommitListItem(context) {
    const icon = (0, react_1.useMemo)(() => {
        if (context.commits.selectedBranch && 'type' in context.commits.selectedBranch && context.commits.selectedBranch.ahead) {
            if (context.commits.selectedBranch.ahead > context.index) {
                return { source: api_1.Icon.Dot, tintColor: api_1.Color.Orange, tooltip: "Unpushed" };
            }
        }
        return undefined;
    }, [context.commits.selectedBranch, context.index]);
    const commitUrls = (0, react_1.useMemo)(() => {
        return context.findUrls(context.commit.message);
    }, [context.commit.hash, context.commit.message]);
    const formatCommitDetail = (commit, IssueTrackerConfigs) => {
        // 1. Commit title (## heading) with URL patterns replaced by links
        const commitMessageWithLinks = (0, useIssueTracker_1.replaceUrlPatternsWithLinks)(commit.message, IssueTrackerConfigs);
        let detail = `### ${commitMessageWithLinks}\n\n`;
        // 2. Rest of commit description (if exists)
        if (commit.body && commit.body.trim()) {
            detail += "---\n\n";
            // Format commit body for markdown:
            // 1. Split by double newlines to preserve paragraphs
            // 2. Within each paragraph, replace single newlines with markdown line breaks (two spaces + newline)
            // 3. Escape markdown characters that should not be interpreted as formatting
            const formatBodyForMarkdown = (text) => {
                return (text
                    .trim()
                    // Split into paragraphs (separated by empty lines)
                    .split(/\n\s*\n/)
                    .map((paragraph) => {
                    // Within each paragraph, convert single newlines to markdown line breaks
                    return paragraph
                        .trim()
                        .split("\n")
                        .map((line) => {
                        // Escape markdown special characters
                        const escapedLine = line.trim().replace(/[_#>+|~!]/g, "\\$&");
                        return escapedLine;
                    })
                        .filter((line) => line.length > 0)
                        .join("  \n"); // Two spaces + newline = markdown line break
                })
                    .filter((paragraph) => paragraph.length > 0)
                    .join("\n\n")); // Double newline = paragraph break in markdown
            };
            const formattedBody = formatBodyForMarkdown(commit.body);
            detail += `${formattedBody}\n\n`;
        }
        return detail;
    };
    // Prepare accessories based on filter and detail view state
    const accessories = (0, react_1.useMemo)(() => {
        if (context.toggleDetailController.isShowingDetail) {
            return undefined;
        }
        const accessoryItems = [];
        // Handle tags - show maximum 1 tag
        if (context.commit.tags.length > 0) {
            let title = context.commit.tags[0];
            let tooltip = undefined;
            // Add remaining tags to remainingRefs
            if (context.commit.tags.length > 1) {
                title += ` (+${context.commit.tags.length - 1})`;
                tooltip = context.commit.tags.slice(1).join("\n");
            }
            accessoryItems.push({
                tag: { value: title, color: api_1.Color.Blue },
                tooltip: tooltip,
                icon: api_1.Icon.Tag,
            });
        }
        // Handle branches only when All branches filter is selected - show maximum 1 branch
        if (context.commits.filter.kind === 'all') {
            let title = undefined;
            let tooltip = undefined;
            let color = api_1.Color.SecondaryText;
            let icon = api_1.Icon.Dot;
            const allCommitBranches = context.commit.localBranches.concat(context.commit.remoteBranches);
            if (context.commit.currentBranchName) {
                title = context.commit.currentBranchName;
                color = api_1.Color.Green;
                if (allCommitBranches.length > 0) {
                    title += ` (+${allCommitBranches.length})`;
                    tooltip = allCommitBranches.join("\n");
                }
            }
            else if (allCommitBranches.length > 0) {
                const firstBranch = allCommitBranches[0];
                title = firstBranch;
                if (allCommitBranches.length > 1) {
                    title += ` (+${allCommitBranches.length - 1})`;
                    tooltip = allCommitBranches.slice(1).join("\n");
                }
                if (context.commit.localBranches.length > 0) {
                    icon = api_1.Icon.Dot;
                }
                else if (context.commit.remoteBranches.length > 0) {
                    const remoteName = context.commit.remoteBranches[0].split("/")[0];
                    icon = (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[remoteName]?.provider);
                }
            }
            if (title) {
                accessoryItems.push({
                    tag: { value: title, color: color },
                    tooltip: tooltip,
                    icon: icon,
                });
            }
        }
        accessoryItems.push({
            text: { value: context.commit.author },
            tooltip: context.commit.authorEmail,
        });
        accessoryItems.push({
            text: context.commit.date.toRelativeDateString(),
            tooltip: Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(context.commit.date),
        });
        return accessoryItems;
    }, [
        context.toggleDetailController.isShowingDetail,
        context.commits.filter.kind,
        context.commit.tags,
        context.commit.localBranches,
        context.commit.remoteBranches,
        context.commit.currentBranchName,
    ]);
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: context.commit.hash, title: context.commit.message, icon: icon, accessories: accessories, keywords: [
            context.commit.hash,
            context.commit.shortHash,
            context.commit.body,
            ...context.commit.author.split(" "),
            context.commit.authorEmail,
            ...context.commit.tags,
            ...(context.commit.changedFiles?.map((fileChanges) => (0, path_1.basename)(fileChanges.path)) || []),
        ].filter((keyword) => Boolean(keyword)), detail: context.toggleDetailController.isShowingDetail ? ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail, { markdown: formatCommitDetail(context.commit, context.issueTrackerConfigs), metadata: context.toggleMetadataController.isShowingDetail ? ((0, jsx_runtime_1.jsxs)(api_1.List.Item.Detail.Metadata, { children: [(0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Author", text: context.commit.author }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Email", text: context.commit.authorEmail }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Date", text: context.commit.date.toLocaleString() }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Hash", text: context.commit.hash }), context.commit.tags.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList, { title: "Tags", children: context.commit.tags.map((tag) => ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList.Item, { icon: api_1.Icon.Tag, text: tag, color: api_1.Color.Blue }, tag))) })), (context.commit.localBranches.length > 0 || context.commit.remoteBranches.length > 0) && ((0, jsx_runtime_1.jsxs)(api_1.List.Item.Detail.Metadata.TagList, { title: "Branches", children: [context.commit.localBranches.map((branch) => ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList.Item, { icon: api_1.Icon.Dot, text: branch, color: api_1.Color.SecondaryText }, branch))), context.commit.remoteBranches.map((branch) => ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList.Item, { icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[branch.split("/")[0]]?.provider), text: branch, color: api_1.Color.SecondaryText }, branch)))] }))] })) : undefined })) : undefined, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Commit", children: [(0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "View Commit Files", icon: api_1.Icon.Document, target: (0, jsx_runtime_1.jsx)(CommitDetailsView_1.CommitDetailsView, { pagination: context.commits.pagination, ...context }) }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCheckoutAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCherryPickAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitRevertAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitResetAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitInteractiveRebaseAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitPatchCreateAction, { ...context }), commitUrls.map((urlInfo, index) => ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { title: `Open ${urlInfo.title}`, url: urlInfo.url, icon: (0, utils_1.getFavicon)(urlInfo.url, { fallback: api_1.Icon.Link }), shortcut: index === 0 ? { modifiers: ["cmd"], key: "l" } : undefined }, `${urlInfo.title}-${index}`))), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCopyHashAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCopyMessageAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCopyShortHashAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCopyAuthorAction, { ...context }), (0, jsx_runtime_1.jsx)(CommitActions_1.CommitCopyAuthorEmailAction, { ...context }), context.commit.currentBranchName && context.branches.data.currentBranch &&
                            (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Reword Commit Message", icon: api_1.Icon.Message, target: (0, jsx_runtime_1.jsx)(CommitMessageView_1.CommitMessageForm, { amendOnly: true, ...context }), shortcut: { modifiers: ["cmd", "shift"], key: "a" } }), Object.keys(context.remotes.data).map((remote) => ((0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteOpenCommitAction, { remote: context.remotes.data[remote], commit: context.commit.hash }, `${remote}-open-commit`)))] }), context.commit.tags.map((tag) => ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: `Tag '${tag}'`, children: [(0, jsx_runtime_1.jsx)(TagActions_1.TagCopyNameAction, { tagName: tag }, `copy-${tag}`), (0, jsx_runtime_1.jsx)(TagActions_1.TagRemoveAction, { tagName: tag, ...context }, `remove-${tag}`)] }, `tag-${tag}`))), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(TagActions_1.TagCreateAction, { ...context }) }), (0, jsx_runtime_1.jsx)(SharedActionsSection, { ...context })] }) }));
}
/**
 * Helper function to get display name for the current filter
 */
function getBranchFilterDisplayName(context) {
    if (!context.commits.selectedBranch) {
        return undefined;
    }
    if ('commitHash' in context.commits.selectedBranch) {
        return `Commits on HEAD '${context.commits.selectedBranch.shortCommitHash}'`;
    }
    if ('displayName' in context.commits.selectedBranch) {
        const parts = [];
        if (context.commits.selectedBranch.ahead)
            parts.push(`↑ ${context.commits.selectedBranch.ahead} ahead`);
        if (context.commits.selectedBranch.behind)
            parts.push(`↓ ${context.commits.selectedBranch.behind} behind`);
        return `Filtered by '${context.commits.selectedBranch.displayName}' branch ${parts.length > 0 ? ` • ${parts.join(" • ")}` : ""}`;
    }
    return undefined;
}
function SharedActionsSection(context) {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { children: [context.commits.pagination?.hasMore && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Load More Commits", onAction: context.commits.pagination.onLoadMore, icon: api_1.Icon.ArrowDown, shortcut: { modifiers: ["cmd", "opt"], key: "arrowDown" } })), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh History", onAction: () => {
                            context.branches.revalidate();
                            context.commits.revalidate();
                        }, icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" } })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Branch", children: [(0, jsx_runtime_1.jsx)(RemoteActions_1.RemotePullAction, { ...context }), context.branches.data.currentBranch && context.branches.data.currentBranch.type === "current" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(BranchActions_1.BranchPushAction, { branch: context.branches.data.currentBranch, ...context }), (0, jsx_runtime_1.jsx)(BranchActions_1.BranchPushForceAction, { branch: context.branches.data.currentBranch, ...context })] })), context.commits.filter.kind === 'branch' && 'value' in context.commits.filter && 'name' in context.commits.filter.value &&
                        (0, jsx_runtime_1.jsx)(BranchActions_1.BranchCopyNameAction, { branch: context.commits.filter.value.name }), (0, jsx_runtime_1.jsx)(RemoteActions_1.RemoteFetchAction, { ...context }), context.commits.filter && context.branches.data && ((0, jsx_runtime_1.jsx)(CommitBranchFilterAction, { ...context }))] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { children: [(0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: context.toggleDetailController }), context.toggleDetailController.isShowingDetail && ((0, jsx_runtime_1.jsx)(ToggleDetailAction_1.ToggleDetailAction, { controller: context.toggleMetadataController, shortcut: { modifiers: ["shift", "cmd"], key: "i" } }))] }), (0, jsx_runtime_1.jsx)(WorkspaceNavigationActions_1.WorkspaceNavigationActions, { ...context })] }));
}
/**
 * Action submenu for filtering commits by branch.
 * Shows same structure as dropdown but in ActionPanel.Submenu format.
 */
function CommitBranchFilterAction(context) {
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: "Filter by Branch", icon: api_1.Icon.Filter, shortcut: { modifiers: ["cmd"], key: "f" }, children: [(0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "All Branches", icon: context.commits.filter.kind === 'all' ? api_1.Icon.Checkmark : api_1.Icon.List, autoFocus: context.commits.filter.kind === 'all', onAction: () => context.commits.setFilter({ kind: 'all' }) }) }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: context.branches.data.detachedHead ? "Detached HEAD" : "Current Branch", children: [context.branches.data.detachedHead && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: `HEAD (${context.branches.data.detachedHead.shortCommitHash})`, icon: context.commits.filter.kind === 'current' ? api_1.Icon.Checkmark : api_1.Icon.Anchor, autoFocus: context.commits.filter.kind === 'current', onAction: () => context.commits.setFilter({ kind: 'current' }) })), context.branches.data.currentBranch && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: context.branches.data.currentBranch.displayName, icon: { source: context.commits.filter.kind === 'current' ? api_1.Icon.Checkmark : api_1.Icon.Dot, tintColor: api_1.Color.Green }, autoFocus: context.commits.filter.kind === 'current', onAction: () => context.commits.setFilter({ kind: 'current' }) }))] }), context.branches.data.localBranches.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Local Branches", children: context.branches.data.localBranches.map((branch) => ((0, jsx_runtime_1.jsx)(BranchFilterAction, { branch: branch, ...context }, branch.displayName))) })), Object.entries(context.branches.data.remoteBranches).map(([remoteName, branches]) => ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: `Remote: ${remoteName}`, children: branches.map((branch) => ((0, jsx_runtime_1.jsx)(BranchFilterAction, { branch: branch, ...context }, branch.displayName))) }, remoteName)))] }));
}
function BranchFilterAction(context) {
    const isSelected = context.commits.selectedBranch
        && 'displayName' in context.commits.selectedBranch
        && context.commits.selectedBranch?.displayName === context.branch.displayName;
    const icon = (0, react_1.useMemo)(() => {
        let baseIcon = api_1.Icon.Dot;
        switch (context.branch.type) {
            case "remote":
                baseIcon = (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[context.branch.remote]?.provider);
                break;
            case "local":
                baseIcon = api_1.Icon.Dot;
                break;
        }
        return isSelected ? api_1.Icon.Checkmark : baseIcon;
    }, [isSelected]);
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: context.branch.displayName, icon: icon, autoFocus: isSelected, onAction: () => context.commits.setFilter({
            kind: 'branch',
            value: context.branch
        }) }));
}
