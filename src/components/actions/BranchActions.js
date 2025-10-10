"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchCkeckoutAction = BranchCkeckoutAction;
exports.BranchDeleteAction = BranchDeleteAction;
exports.BranchCopyNameAction = BranchCopyNameAction;
exports.BranchPushAction = BranchPushAction;
exports.BranchPushForceAction = BranchPushForceAction;
exports.BranchMergeAction = BranchMergeAction;
exports.BranchRebaseAction = BranchRebaseAction;
exports.BranchInteractiveRebaseAction = BranchInteractiveRebaseAction;
exports.BranchCreateAction = BranchCreateAction;
exports.BranchRenameAction = BranchRenameAction;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const types_1 = require("../../types");
const utils_1 = require("@raycast/utils");
const InteractiveRebaseEditorView_1 = __importDefault(require("../../commands/views/InteractiveRebaseEditorView"));
const RemoteHostIcons_1 = require("../icons/RemoteHostIcons");
/**
 * Unified action for checking out a branch (local or remote).
 */
function BranchCkeckoutAction(context) {
    const handleCheckout = async () => {
        const isRemote = context.branch.type === "remote";
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Checkout branch",
            message: `Are you sure you want to checkout ${isRemote ? "remote " : ""}branch "${context.branch.name}"?`,
            primaryAction: {
                title: "Checkout",
                style: api_1.Alert.ActionStyle.Default,
            },
        });
        if (confirmed) {
            try {
                if (isRemote) {
                    await context.gitManager.checkoutRemoteBranch(context.branch.name, context.branch.upstream);
                }
                else {
                    await context.gitManager.checkoutLocalBranch(context.branch.name);
                }
                (0, api_1.clearSearchBar)();
                context.branches.revalidate();
                context.status.revalidate();
                context.commits.revalidate();
            }
            catch (error) {
                context.branches.revalidate();
                context.status.revalidate();
                context.commits.revalidate();
                context.navigateTo("status");
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Checkout", onAction: handleCheckout, icon: `arrow-checkout.svg` }));
}
/**
 * Action for deleting a branch.
 */
function BranchDeleteAction(context) {
    const handleDeleteBranch = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Delete",
            message: `Are you sure you want to delete branch "${context.branch.name}"?`,
            primaryAction: {
                title: "Delete",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            try {
                if (context.branch.type === "local") {
                    if (context.branch.upstream && !context.branch.isGone) {
                        const confirmed = await (0, api_1.confirmAlert)({
                            title: "Delete remote branch",
                            message: `Also delete remote branch "${context.branch.upstream}"?`,
                            primaryAction: {
                                title: "Delete",
                                style: api_1.Alert.ActionStyle.Destructive,
                            },
                        });
                        if (confirmed) {
                            const summaryConfirm = await (0, api_1.confirmAlert)({
                                title: "Final confirmation of deletion",
                                message: `This action will delete local and remote branch. This action cannot be undone.`,
                                primaryAction: {
                                    title: "Delete Both",
                                    style: api_1.Alert.ActionStyle.Destructive,
                                },
                            });
                            if (summaryConfirm) {
                                await context.gitManager.deleteUpstreamBranch(context.branch.upstream);
                            }
                        }
                    }
                    await context.gitManager.deleteBranch(context.branch.name);
                }
                else if (context.branch.remote) {
                    await context.gitManager.deleteRemoteBranch(context.branch.remote, context.branch.name);
                }
                context.branches.revalidate();
                context.status.revalidate();
            }
            catch (error) {
                // Git error is already shown by GitManager
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Delete Branch", onAction: handleDeleteBranch, icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["ctrl"], key: "x" } }));
}
/**
 * Action for copying current branch name to clipboard.
 */
function BranchCopyNameAction({ branch }) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Branch Name", content: branch, shortcut: { modifiers: ["cmd"], key: "c" } }));
}
/**
 * Action for pushing the current branch.
 */
function BranchPushAction(context) {
    const handlePushToRemote = async (remote) => {
        try {
            await context.gitManager.push(false, context.branch, remote);
            context.branches.revalidate();
            context.status.revalidate();
        }
        catch {
            // Git error is already shown by GitManager
        }
    };
    if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
        return undefined;
    }
    if (Object.keys(context.remotes.data).length === 1) {
        return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Push", onAction: () => handlePushToRemote(Object.keys(context.remotes.data)[0]), icon: `git-push.svg`, shortcut: { modifiers: ["cmd", "shift"], key: "p" } }));
    }
    return ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Submenu, { title: "Push to", icon: `git-push.svg`, shortcut: { modifiers: ["cmd", "shift"], key: "p" }, children: Object.keys(context.remotes.data).map((remote) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: remote, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[remote].provider), onAction: () => handlePushToRemote(remote) }, `${remote}:push`))) }));
}
function BranchPushForceAction(context) {
    const handleForcePushToRemote = async (remote) => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Push Force",
            message: `Are you sure you want to force push the current branch to '${remote}'?`,
            primaryAction: {
                title: "Force Push",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (!confirmed)
            return;
        try {
            await context.gitManager.push(true, context.branch, remote);
            context.branches.revalidate();
            context.status.revalidate();
        }
        catch {
            // Git error is already shown by GitManager
        }
    };
    if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
        return undefined;
    }
    if (Object.keys(context.remotes.data).length === 1) {
        return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Force Push", onAction: () => handleForcePushToRemote(Object.keys(context.remotes.data)[0]), icon: { source: `git-push.svg`, tintColor: api_1.Color.Red }, shortcut: { modifiers: ["cmd", "shift", "opt"], key: "p" }, style: api_1.Action.Style.Destructive }));
    }
    return ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Submenu, { title: "Force Push to", icon: { source: `git-push.svg`, tintColor: api_1.Color.Red }, shortcut: { modifiers: ["cmd", "shift", "opt"], key: "p" }, children: Object.keys(context.remotes.data).map((remote) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: remote, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[remote].provider), onAction: () => handleForcePushToRemote(remote), style: api_1.Action.Style.Destructive }, `${remote}:force-push`))) }));
}
/**
 * Action for merging a branch into the current branch.
 */
function BranchMergeAction(context) {
    const handleMergeBranch = async (mode) => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Merge branch",
            message: `Are you sure you want to merge branch "${context.branch.name}" into the current branch?`,
            primaryAction: {
                title: "Merge",
                style: api_1.Alert.ActionStyle.Default,
            },
        });
        if (confirmed) {
            try {
                await context.gitManager.mergeBranch(context.branch.name, mode);
                context.branches.revalidate();
                context.status.revalidate();
            }
            catch (error) {
                context.branches.revalidate();
                context.status.revalidate();
                context.navigateTo("status");
            }
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: "Merge into Current", icon: `git-merge.svg`, shortcut: { modifiers: ["cmd"], key: "m" }, children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Fast Forward (if possible)", onAction: () => handleMergeBranch(types_1.MergeMode.FAST_FORWARD) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "No Fast Forward", onAction: () => handleMergeBranch(types_1.MergeMode.NO_FF) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Squash", onAction: () => handleMergeBranch(types_1.MergeMode.SQUASH) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "No Commit", onAction: () => handleMergeBranch(types_1.MergeMode.NO_COMMIT) })] }));
}
/**
 * Action for rebasing the current branch onto another branch.
 */
function BranchRebaseAction(context) {
    const handleRebaseBranch = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Rebase branch",
            message: `Are you sure you want to rebase the current branch onto "${context.branch.name}"?`,
            primaryAction: {
                title: "Rebase",
                style: api_1.Alert.ActionStyle.Default,
            },
        });
        if (confirmed) {
            try {
                await context.gitManager.rebase(context.branch.name);
                context.branches.revalidate();
                context.status.revalidate();
            }
            catch (error) {
                context.branches.revalidate();
                context.status.revalidate();
                context.navigateTo("status");
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Rebase to Here", onAction: handleRebaseBranch, icon: `arrow-rebase.svg`, shortcut: { modifiers: ["cmd", "shift"], key: "r" } }));
}
/**
 * Action to open Interactive Rebase Editor starting from selected branch.
 */
function BranchInteractiveRebaseAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Interactive Rebase from Here", icon: `arrow-rebase.svg`, target: (0, jsx_runtime_1.jsx)(InteractiveRebaseEditorView_1.default, { ...context, startFromCommit: context.branch.name }), shortcut: { modifiers: ["cmd", "shift", "opt"], key: "e" } }));
}
/**
 * Additional actions for creating a new branch.
 */
function BranchCreateAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Create Branch", target: (0, jsx_runtime_1.jsx)(BranchCreateForm, { ...context }), icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" } }));
}
/**
 * Action for renaming a branch.
 */
function BranchRenameAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Rename", target: (0, jsx_runtime_1.jsx)(BranchRenameForm, { ...context }), icon: api_1.Icon.Pencil, shortcut: { modifiers: ["cmd"], key: "e" } }));
}
function BranchCreateForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [branchName, setBranchName] = (0, react_1.useState)("");
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const { data: currentBranch } = (0, utils_1.usePromise)(async () => await context.branches.data.currentBranch, []);
    const handleSubmit = async (values) => {
        setIsLoading(true);
        try {
            await context.gitManager.createBranch(values.branchName);
            context.branches.revalidate();
            context.status.revalidate();
            pop();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
        setIsLoading(false);
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: "Create Branch", isLoading: isLoading, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Create Branch", onSubmit: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "branchName", title: "Branch Name", placeholder: "Enter branch name", error: branchName.trim().length === 0 ? "Required" : undefined, value: branchName, onChange: (value) => setBranchName(value.replace(/ /g, "-")) }), currentBranch && (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: `From branch '${currentBranch}'` })] }));
}
function BranchRenameForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [newBranchName, setNewBranchName] = (0, react_1.useState)(context.branch.name);
    const [renameRemote, setRenameRemote] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const handleSubmit = async (values) => {
        setIsLoading(true);
        try {
            await context.gitManager.renameBranch(values.newBranchName, context.branch.name, renameRemote ? context.branch.upstream : undefined);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Branch renamed successfully"
            });
            context.branches.revalidate();
            context.status.revalidate();
            pop();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
        setIsLoading(false);
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: "Rename Branch", isLoading: isLoading, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Rename Branch", onSubmit: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "newBranchName", title: "Branch Name", placeholder: "New branch name", error: newBranchName.trim().length === 0 ? "Required" : undefined, value: newBranchName, onChange: (value) => setNewBranchName(value.replace(/ /g, "-")) }), context.branch.upstream && ((0, jsx_runtime_1.jsx)(api_1.Form.Checkbox, { id: "renameRemote", label: `Rename remote branch '${context.branch.upstream}'`, value: renameRemote, onChange: setRenameRemote, info: "This will delete the old remote branch and push the new one" }))] }));
}
