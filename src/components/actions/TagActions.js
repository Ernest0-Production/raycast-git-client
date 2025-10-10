"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagCreateAction = TagCreateAction;
exports.TagRemoveAction = TagRemoveAction;
exports.TagCopyNameAction = TagCopyNameAction;
exports.TagCheckoutAction = TagCheckoutAction;
exports.TagPushAction = TagPushAction;
exports.TagRenameAction = TagRenameAction;
exports.TagOpenCommitAction = TagOpenCommitAction;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const RemoteHostIcons_1 = require("../icons/RemoteHostIcons");
const CommitDetailsView_1 = require("../../commands/views/CommitDetailsView");
const react_1 = require("react");
/**
 * Action for creating a tag on a commit.
 */
function TagCreateAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Create Tag", target: (0, jsx_runtime_1.jsx)(TagCreateForm, { ...context }), icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd", "opt"], key: "t" } }));
}
/**
 * Action for removing a tag from a commit.
 */
function TagRemoveAction(context) {
    const handleRemoveTag = async (remote) => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Push tag deletion to remote?",
            message: `Are you sure you want to push tag deletion to remote?`,
            primaryAction: {
                title: "Push",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (!confirmed)
            return;
        try {
            if (remote) {
                await context.gitManager.pushTag(context.tagName, remote, true);
            }
            if (Object.keys(context.remotes.data).length === 1) {
                const confirmed = await (0, api_1.confirmAlert)({
                    title: "Remove tag",
                    message: `Are you sure you want to remove tag "${context.tagName}"?`,
                    primaryAction: {
                        title: "Remove",
                        style: api_1.Alert.ActionStyle.Destructive,
                    },
                });
                if (confirmed) {
                    await context.gitManager.pushTag(context.tagName, Object.keys(context.remotes.data)[0], true);
                    context.commits.revalidate();
                }
            }
            await context.gitManager.deleteTag(context.tagName);
            context.commits.revalidate();
            context.tags?.revalidate();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    if (!context.remotes.data || Object.keys(context.remotes.data).length <= 1) {
        return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: `Remove Tag '${context.tagName}'`, onAction: () => handleRemoveTag(undefined), icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive }));
    }
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: `Remove Tag '${context.tagName} from'`, icon: api_1.Icon.Trash, children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: `Local Only`, onAction: () => handleRemoveTag(undefined), icon: api_1.Icon.Dot }), Object.keys(context.remotes.data).map((remote) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: `Local and ${remote}`, onAction: () => handleRemoveTag(remote), style: api_1.Action.Style.Destructive, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[remote].provider) }, `${remote}:remove-tag`)))] }));
}
/**
 * Action for copying tag name to clipboard.
 */
function TagCopyNameAction({ tagName }) {
    return (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: `Copy Tag Name '${tagName}'`, content: tagName, icon: api_1.Icon.Clipboard });
}
/**
 * Action for checking out a tag. If remoteName provided, fetches the tag first.
 */
function TagCheckoutAction(context) {
    const handleCheckout = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Checkout tag",
            message: `Are you sure you want to checkout tag "${context.tagName}"${context.remoteName ? ` from ${context.remoteName}` : ""}?`,
            primaryAction: { title: "Checkout", style: api_1.Alert.ActionStyle.Default },
        });
        if (!confirmed)
            return;
        try {
            if (context.remoteName) {
                await context.gitManager.fetchTag(context.remoteName, context.tagName);
            }
            await context.gitManager.checkoutTag(context.tagName);
            context.branches.revalidate();
            context.status.revalidate();
            context.commits.revalidate();
            context.navigateTo("status");
        }
        catch (error) {
            // Git error already displayed by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Checkout", onAction: handleCheckout, icon: `arrow-checkout.svg` }));
}
/**
 * Action for pushing a tag to remote(s).
 */
function TagPushAction(context) {
    const handlePush = async (remote) => {
        try {
            await context.gitManager.pushTag(context.tagName, remote);
            context.tags?.revalidate();
        }
        catch (error) {
            // Git error already displayed by GitManager
        }
    };
    const remotes = Object.keys(context.remotes.data || {});
    if (remotes.length === 0)
        return undefined;
    if (remotes.length === 1) {
        return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Push Tag", icon: api_1.Icon.Upload, onAction: () => handlePush(remotes[0]) }));
    }
    return ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Submenu, { title: "Push Tag to", icon: api_1.Icon.Upload, children: remotes.map((remote) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: remote, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[remote].provider), onAction: () => handlePush(remote) }, `${remote}:push-tag`))) }));
}
/**
 * Action for renaming a local tag with optional remote propagation.
 */
function TagRenameAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Rename Tag", icon: api_1.Icon.Pencil, target: (0, jsx_runtime_1.jsx)(TagRenameForm, { ...context }) }));
}
function TagRenameForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [newName, setNewName] = (0, react_1.useState)(context.tagName);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const remoteNames = Object.keys(context.remotes.data || {});
    const [pushToRemotes, setPushToRemotes] = (0, react_1.useState)({});
    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await context.gitManager.renameTag(context.tagName, newName);
            for (const remote of remoteNames) {
                if (pushToRemotes[remote]) {
                    await context.gitManager.pushTag(newName, remote);
                    await context.gitManager.pushTag(context.tagName, remote, true);
                }
            }
            context.tags?.revalidate();
            context.commits.revalidate();
            pop();
        }
        catch (error) {
            // Git error already displayed by GitManager
        }
        finally {
            setIsLoading(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: `Rename Tag '${context.tagName}'`, isLoading: isLoading, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Rename Tag", onAction: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "newTagName", title: "New Tag Name", value: newName, onChange: setNewName, placeholder: "v1.0.1" }), remoteNames.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Select remotes to push new tag and delete old" })), remoteNames.map((remote) => ((0, jsx_runtime_1.jsx)(api_1.Form.Checkbox, { id: `rename-remote-${remote}`, label: `Update on ${remote}`, value: !!pushToRemotes[remote], onChange: (val) => setPushToRemotes((prev) => ({ ...prev, [remote]: val })) }, `rename-remote-${remote}`)))] }));
}
/**
 * Action to open commit details for a tag.
 */
function TagOpenCommitAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "View Tagged Commit", icon: api_1.Icon.Document, target: (0, jsx_runtime_1.jsx)(CommitDetailsView_1.CommitDetailsByRefView, { refName: context.tagName, ...context }) }));
}
function TagCreateForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [tagName, setTagName] = (0, react_1.useState)("");
    const [message, setMessage] = (0, react_1.useState)("");
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const handleSubmit = async (remote) => {
        setIsLoading(true);
        try {
            // Create the tag
            await context.gitManager.createTag(tagName.trim(), context.commit.hash, message.trim() || undefined);
            // Show confirmation alert for pushing tags
            const shouldPushTags = await (0, api_1.confirmAlert)({
                title: "Push tags to remote?",
                message: `Tag "${tagName.trim()}" was created successfully. Do you want to push tags to remote repository?`,
                primaryAction: {
                    title: "Push",
                    style: api_1.Alert.ActionStyle.Destructive,
                },
                dismissAction: {
                    title: "Don't Push",
                },
            });
            if (shouldPushTags && remote) {
                await context.gitManager.pushTag(tagName.trim(), remote);
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Success,
                    title: `Tags pushed to ${remote}`,
                });
            }
            // Refresh the commits list
            context.commits.revalidate();
            pop();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
        finally {
            setIsLoading(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: `Create Tag on ${context.commit.shortHash}`, isLoading: isLoading, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Create Tag", onAction: () => handleSubmit(undefined), icon: api_1.Icon.Tag }), (0, jsx_runtime_1.jsx)(TagCreateAndPushAction, { ...context, handleSubmit: (remote) => handleSubmit(remote) })] }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "tagName", title: "Tag Name", placeholder: "e.g., v1.0.0", value: tagName, onChange: setTagName, error: tagName.trim() === "" ? "Required" : undefined }), (0, jsx_runtime_1.jsx)(api_1.Form.TextArea, { id: "message", title: "Tag Message", placeholder: "Release description...", value: message, onChange: setMessage, info: "Optional message for annotated tag" })] }));
}
function TagCreateAndPushAction(context) {
    if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
        return undefined;
    }
    if (Object.keys(context.remotes.data).length === 1) {
        return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Create Tag and Push", onAction: () => context.handleSubmit(Object.keys(context.remotes.data)[0]), icon: api_1.Icon.Tag }));
    }
    return ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Submenu, { title: "Create Tag and Push to", icon: api_1.Icon.Tag, children: Object.keys(context.remotes.data).map((remote) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: remote, onAction: () => context.handleSubmit(remote), icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[remote].provider) }, `${remote}:create-tag-and-push`))) }));
}
