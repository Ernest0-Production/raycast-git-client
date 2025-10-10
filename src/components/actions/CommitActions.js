"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitCheckoutAction = CommitCheckoutAction;
exports.CommitCherryPickAction = CommitCherryPickAction;
exports.CommitRevertAction = CommitRevertAction;
exports.CommitResetAction = CommitResetAction;
exports.CommitInteractiveRebaseAction = CommitInteractiveRebaseAction;
exports.CommitPatchCreateAction = CommitPatchCreateAction;
exports.CommitCopyHashAction = CommitCopyHashAction;
exports.CommitCopyMessageAction = CommitCopyMessageAction;
exports.CommitCopyShortHashAction = CommitCopyShortHashAction;
exports.CommitCopyAuthorAction = CommitCopyAuthorAction;
exports.CommitCopyAuthorEmailAction = CommitCopyAuthorEmailAction;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const InteractiveRebaseEditorView_1 = __importDefault(require("../../commands/views/InteractiveRebaseEditorView"));
const simple_git_1 = require("simple-git");
const utils_1 = require("@raycast/utils");
const fs_1 = require("fs");
/**
 * Action for checking out a commit.
 */
function CommitCheckoutAction(context) {
    const handleCheckoutCommit = async () => {
        const targetName = context.commit.localBranches.length > 0 ? context.commit.localBranches[0] : context.commit.shortHash;
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Checkout commit",
            message: `Are you sure you want to checkout commit '${targetName}'? This will put you in a detached HEAD state.`,
            primaryAction: {
                title: "Checkout",
                style: api_1.Alert.ActionStyle.Default,
            },
        });
        if (confirmed) {
            try {
                await context.gitManager.checkoutCommit(targetName);
                (0, api_1.clearSearchBar)();
            }
            catch (error) {
                // Git error is already shown by GitManager
            }
            finally {
                context.branches.revalidate();
                context.status.revalidate();
            }
        }
    };
    return (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Checkout Commit", onAction: handleCheckoutCommit, icon: `arrow-checkout.svg` });
}
/**
 * Action for cherry-picking a commit.
 */
function CommitCherryPickAction(context) {
    const handleCherryPick = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Cherry-pick commit",
            message: `Are you sure you want to cherry-pick commit '${context.commit.shortHash}'? This will create a new commit that undoes the changes.`,
            primaryAction: {
                title: "Cherry-pick",
                style: api_1.Alert.ActionStyle.Default,
            },
        });
        if (confirmed) {
            try {
                await context.gitManager.cherryPick(context.commit.hash);
                context.commits.revalidate();
                context.status.revalidate();
            }
            catch (error) {
                context.commits.revalidate();
                context.status.revalidate();
                context.navigateTo("status");
            }
        }
    };
    return (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Cherry-Pick Commit", onAction: handleCherryPick, icon: `arrow-bounce.svg` });
}
/**
 * Action for reverting a commit.
 */
function CommitRevertAction(context) {
    const handleRevert = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Revert commit",
            message: `Are you sure you want to revert commit '${context.commit.message}'? This will create a new commit that undoes the changes.`,
            primaryAction: {
                title: "Revert",
                style: api_1.Alert.ActionStyle.Default,
            },
        });
        if (confirmed) {
            try {
                await context.gitManager.revert(context.commit.hash);
                context.commits.revalidate();
                context.status.revalidate();
            }
            catch (error) {
                context.commits.revalidate();
                context.status.revalidate();
                context.navigateTo("status");
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Revert Commit", onAction: handleRevert, icon: api_1.Icon.ArrowCounterClockwise }));
}
/**
 * Action submenu for resetting to a commit.
 */
function CommitResetAction(context) {
    const handleReset = async (mode) => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Reset to commit",
            message: `Are you sure you want to reset to commit "${context.commit.shortHash}"? This action cannot be undone.`,
            primaryAction: {
                title: "Reset",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            try {
                await context.gitManager.reset(context.commit.hash, mode);
                context.commits.revalidate();
                context.status.revalidate();
            }
            catch (error) {
                context.commits.revalidate();
                context.status.revalidate();
                context.navigateTo("status");
            }
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: "Reset to Here", icon: api_1.Icon.ArrowClockwise, children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Soft Reset (Keep Changes Staged)", onAction: () => handleReset(simple_git_1.ResetMode.SOFT) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Mixed Reset (Keep Changes Unstaged)", onAction: () => handleReset(simple_git_1.ResetMode.MIXED) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Hard Reset (Discard All Changes)", onAction: () => handleReset(simple_git_1.ResetMode.HARD), style: api_1.Action.Style.Destructive })] }));
}
/**
 * Action to open Interactive Rebase Editor starting from selected commit.
 */
function CommitInteractiveRebaseAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Interactive Rebase from Here", icon: `arrow-rebase.svg`, target: (0, jsx_runtime_1.jsx)(InteractiveRebaseEditorView_1.default, { startFromCommit: context.commit.hash, ...context }), shortcut: { modifiers: ["cmd"], key: "e" } }));
}
/**
 * Action to save a commit as a patch.
 */
function CommitPatchCreateAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Save as Patch", icon: `patch.svg`, shortcut: { modifiers: ["cmd", "shift"], key: "s" }, target: PatchCreateForm(context) }));
}
function PatchCreateForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [directoryPath, setDirectoryPath] = (0, utils_1.useCachedState)(`patches-directory`, []);
    const validateDirectoryPath = (directoryPath) => {
        if (directoryPath.length === 0) {
            return "Required";
        }
        if (!(0, fs_1.existsSync)(directoryPath[0])) {
            return "Not exists";
        }
        return undefined;
    };
    const handleSubmit = async (values) => {
        try {
            const patchPath = await context.gitManager.createPatchFromCommit(context.commit.hash, values.directoryPath[0]);
            await api_1.Clipboard.copy(patchPath);
            pop();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Form, { navigationTitle: "Create Patch", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Create Patch", onSubmit: handleSubmit }) }), children: (0, jsx_runtime_1.jsx)(api_1.Form.FilePicker, { id: "directoryPath", title: "Output Directory", value: directoryPath, error: validateDirectoryPath(directoryPath), onChange: setDirectoryPath, allowMultipleSelection: false, canChooseDirectories: true, canChooseFiles: false }) }));
}
/**
 * Action for copying commit hash to clipboard.
 */
function CommitCopyHashAction({ commit }) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Commit Hash", content: commit.hash, shortcut: { modifiers: ["cmd"], key: "c" } }));
}
function CommitCopyMessageAction({ commit }) {
    return (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Commit Message", content: commit.message });
}
/**
 * Action for copying short commit hash to clipboard.
 */
function CommitCopyShortHashAction({ commit }) {
    return (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Short Hash", content: commit.shortHash });
}
/**
 * Action for copying commit author to clipboard.
 */
function CommitCopyAuthorAction({ commit }) {
    return (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Author Name", content: commit.author });
}
/**
 * Action for copying commit author email to clipboard.
 */
function CommitCopyAuthorEmailAction({ commit }) {
    return (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Author Email", content: commit.authorEmail });
}
