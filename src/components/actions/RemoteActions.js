"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteFetchAction = RemoteFetchAction;
exports.RemotePullAction = RemotePullAction;
exports.RemoteOpenPullRequestAction = RemoteOpenPullRequestAction;
exports.RemoteCreatePullRequestAction = RemoteCreatePullRequestAction;
exports.RemoteOpenCommitAction = RemoteOpenCommitAction;
exports.RemoteAddAction = RemoteAddAction;
exports.RemoteEditAction = RemoteEditAction;
exports.RemoteDeleteAction = RemoteDeleteAction;
exports.RemoteCopyUrlActions = RemoteCopyUrlActions;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const RemoteHostIcons_1 = require("../icons/RemoteHostIcons");
const react_1 = require("react");
/**
 * Global fetch action that can be reused across different views.
 */
function RemoteFetchAction(context) {
    const handleFetch = async (remote) => {
        try {
            await context.gitManager.fetch(remote);
            context.branches.revalidate();
            context.status.revalidate();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
        return undefined;
    }
    if (Object.keys(context.remotes.data).length === 1) {
        return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Fetch", onAction: () => handleFetch(undefined), icon: `git-fetch.svg`, shortcut: { modifiers: ["cmd", "shift"], key: "f" } }));
    }
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: "Fetch", icon: `git-fetch.svg`, shortcut: { modifiers: ["cmd", "shift"], key: "f" }, children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Fetch All", onAction: () => handleFetch(undefined), icon: `git-fetch.svg` }), Object.keys(context.remotes.data).map((remote) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: remote, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[remote].provider), onAction: () => handleFetch(remote) }, `${remote}:fetch`)))] }));
}
/**
 * Global pull action that can be reused across different views.
 */
function RemotePullAction(context) {
    const handlePullRebase = async () => {
        try {
            await context.gitManager.pull(true);
            context.branches.revalidate();
            context.status.revalidate();
        }
        catch (error) {
            context.branches.revalidate();
            context.status.revalidate();
            context.navigateTo("status");
        }
    };
    const handlePullMerge = async () => {
        try {
            await context.gitManager.pull(false);
            context.branches.revalidate();
            context.status.revalidate();
        }
        catch (error) {
            context.branches.revalidate();
            context.status.revalidate();
            context.navigateTo("status");
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: "Pull", icon: api_1.Icon.ArrowDown, shortcut: { modifiers: ["cmd", "shift"], key: "l" }, children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Rebase", icon: `arrow-rebase.svg`, onAction: handlePullRebase }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Merge", icon: `git-merge.svg`, onAction: handlePullMerge })] }));
}
/**
 * Opens Pull Requests / Merge Requests list for a given remote.
 * Returns undefined if provider is unknown or URL can't be constructed.
 */
function RemoteOpenPullRequestAction({ remote }) {
    const url = remote.pages.pullRequests;
    if (!remote.provider || !url)
        return undefined;
    const title = remote.provider === "GitLab" ? "Show Merge Requests" : "Show Pull Requests" + ` on ${remote.provider}`;
    return ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { title: title, url: url, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(remote.provider) }));
}
/**
 * Opens create PR/MR page from a branch for a given remote.
 * Returns undefined if provider is unknown or URL can't be constructed.
 */
function RemoteCreatePullRequestAction({ remote, branch }) {
    const url = remote.pages.createPullRequestForm(branch);
    if (!remote.provider || !url)
        return undefined;
    const title = remote.provider === "GitLab" ? "Create Merge Request" : "Create Pull Request" + ` on ${remote.provider}`;
    return ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { title: title, url: url, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(remote.provider) }));
}
/**
 * Opens a specific commit page for a given remote.
 * Returns undefined if provider is unknown or URL can't be constructed.
 */
function RemoteOpenCommitAction({ remote, commit }) {
    const url = remote.pages.commitPage(commit);
    if (!remote.provider || !url)
        return undefined;
    return ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { title: `Show Commit on ${remote.provider}`, url: url, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(remote.provider) }));
}
function RemoteAddAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add New Remote", icon: api_1.Icon.Plus, target: (0, jsx_runtime_1.jsx)(RemoteEditorForm, { ...context }), shortcut: { modifiers: ["cmd"], key: "n" } }));
}
function RemoteEditAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Edit Remote", icon: api_1.Icon.Pencil, target: (0, jsx_runtime_1.jsx)(RemoteEditorForm, { ...context }), shortcut: { modifiers: ["cmd"], key: "e" } }));
}
function RemoteEditorForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [name, setName] = (0, react_1.useState)(context.initialRemote?.name ?? "");
    const [fetchUrl, setFetchUrl] = (0, react_1.useState)(context.initialRemote?.fetchUrl ?? "");
    const [pushUrl, setPushUrl] = (0, react_1.useState)(context.initialRemote?.pushUrl ?? "");
    const validateGitUrl = (url) => {
        if (!url.trim())
            return undefined;
        // Check SSH format (git@github.com:username/repo.git)
        const sshPattern = /^(?:ssh:\/\/)?(?:[^@]+@)?[^:]+:[^\/]+\/.*\.git$/;
        // Check HTTP/HTTPS format (https://github.com/username/repo.git)
        const httpPattern = /^https?:\/\/(?:.*@)?[^\/]+\/.*(?:\.git)?$/;
        if (sshPattern.test(url) || httpPattern.test(url)) {
            return undefined;
        }
        return "Incorrect SSH or HTTP format";
    };
    const handleSubmit = async (values) => {
        try {
            if (context.initialRemote) {
                await context.gitManager.updateRemote(name.trim(), fetchUrl.trim(), pushUrl.trim());
            }
            else {
                await context.gitManager.addRemote(name.trim(), fetchUrl.trim(), pushUrl.trim());
            }
            await context.remotes.revalidate();
            pop();
        }
        catch (_error) {
            // Errors are handled globally in GitManager
        }
        finally {
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: context.initialRemote ? "Edit Remote" : "Add Remote", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: context.initialRemote ? "Save Changes" : "Create Remote", onSubmit: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "name", title: "Name", placeholder: "origin", value: name, onChange: setName, error: name.trim().length === 0 ? "Required" : undefined }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "fetchUrl", title: "Fetch URL", placeholder: "git@github.com:org/repo.git or https://github.com/org/repo.git", value: fetchUrl, onChange: setFetchUrl, error: fetchUrl.trim().length === 0 ? "Required" : validateGitUrl(fetchUrl) }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "pushUrl", title: "Push URL", placeholder: "git@github.com:org/repo.git or https://github.com/org/repo.git", value: pushUrl, error: pushUrl.trim().length === 0 ? undefined : validateGitUrl(pushUrl), info: "Optional", onChange: setPushUrl })] }));
}
function RemoteDeleteAction(context) {
    const handleRemoveRemote = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Remove Remote",
            message: `Are you sure you want to remove remote '${context.remote.name}'?`,
            primaryAction: {
                title: "Remove",
                style: api_1.Alert.ActionStyle.Destructive
            },
        });
        if (!confirmed)
            return;
        try {
            await context.gitManager.removeRemote(context.remote.name);
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Success, title: `Remote '${context.remote.name}' removed` });
            await context.remotes.revalidate();
        }
        catch {
            // error toast shown by manager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Delete Remote", icon: api_1.Icon.Trash, onAction: handleRemoveRemote, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["ctrl"], key: "x" } }));
}
function RemoteCopyUrlActions({ remote }) {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Fetch URL", content: remote.fetchUrl, icon: api_1.Icon.Clipboard, shortcut: { modifiers: ["cmd"], key: "c" } }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Push URL", content: remote.pushUrl, icon: api_1.Icon.Clipboard })] }));
}
