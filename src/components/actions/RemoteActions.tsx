import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { RemotesHosts } from "../../hooks/useGitRemotes";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { Remote } from "../../types";
import { useState } from "react";


/**
 * Global fetch action that can be reused across different views.
 */
export function RemoteFetchAction(context: RepositoryContext & { remotesHosts?: RemotesHosts }) {
    const handleFetch = async (remote?: string) => {
        try {
            await context.gitManager.fetch(remote);
            context.branches.revalidate();
            context.status.revalidate();
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
        return undefined;
    }

    if (Object.keys(context.remotes.data).length === 1) {

        return (
            <Action
                title="Fetch"
                onAction={() => handleFetch(undefined)}
                icon={`git-fetch.svg`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
        );
    }

    return (
        <ActionPanel.Submenu title="Fetch" icon={`git-fetch.svg`} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}>
            <Action
                title="Fetch All"
                onAction={() => handleFetch(undefined)}
                icon={`git-fetch.svg`}
            />
            {Object.keys(context.remotes.data).map((remote) => (
                <Action
                    key={`${remote}:fetch`}
                    title={remote}
                    icon={RemoteHostIcon(context.remotes.data[remote])}
                    onAction={() => handleFetch(remote)}
                />
            ))}
        </ActionPanel.Submenu>
    );
}

/**
 * Global pull action that can be reused across different views.
 */
export function RemotePullAction(context: RepositoryContext & NavigationContext) {
    const handlePullRebase = async () => {
        try {
            await context.gitManager.pull(true);
            context.branches.revalidate();
            context.status.revalidate();
        } catch (error) {
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
        } catch (error) {
            context.branches.revalidate();
            context.status.revalidate();
            context.navigateTo("status");
        }
    };

    return (
        <ActionPanel.Submenu title="Pull" icon={Icon.ArrowDown} shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}>
            <Action title="Rebase" icon={`arrow-rebase.svg`} onAction={handlePullRebase} />
            <Action title="Merge" icon={`git-merge.svg`} onAction={handlePullMerge} />
        </ActionPanel.Submenu>
    );
}

/**
 * Opens Pull Requests / Merge Requests list for a given remote.
 * Returns undefined if provider is unknown or URL can't be constructed.
 */
export function RemoteOpenPullRequestAction({ remote }: { remote: Remote }) {
    const url = remote.pages.pullRequests;
    if (!remote.provider || !url) return undefined;

    const title = remote.provider === "GitLab" ? "Show Merge Requests" : "Show Pull Requests" + ` on ${remote.provider}`;

    return (
        <Action.OpenInBrowser
            title={title}
            url={url}
            icon={RemoteHostIcon(remote)}
        />
    );
}

/**
 * Opens create PR/MR page from a branch for a given remote.
 * Returns undefined if provider is unknown or URL can't be constructed.
 */
export function RemoteCreatePullRequestAction({
    remote,
    branch
}: {
    remote: Remote,
    branch: string
}) {
    const url = remote.pages.createPullRequestForm(branch);
    if (!remote.provider || !url) return undefined;

    const title = remote.provider === "GitLab" ? "Create Merge Request" : "Create Pull Request" + ` on ${remote.provider}`;

    return (
        <Action.OpenInBrowser
            title={title}
            url={url}
            icon={RemoteHostIcon(remote)}
        />
    );
}

/**
 * Opens a specific commit page for a given remote.
 * Returns undefined if provider is unknown or URL can't be constructed.
 */
export function RemoteOpenCommitAction(context: RepositoryContext & { commit: string }) {
    if (Object.keys(context.remotes.data).length === 0) {
        return undefined;
    }

    const remotes = Object.values(context.remotes.data);
    const availableRemotes = remotes.filter(remote => {
        const url = remote.pages.commitPage(context.commit);
        return url !== undefined;
    });

    if (availableRemotes.length === 0) {
        return undefined;
    }

    if (availableRemotes.length === 1) {
        const remote = availableRemotes[0];
        const url = remote.pages.commitPage(context.commit);
        if (!url) return undefined;

        return (
            <Action.OpenInBrowser
                title={`Show Commit on ${remote.provider}`}
                url={url}
                icon={RemoteHostIcon(remote)}
            />
        );
    }

    return (
        <>
            {availableRemotes.map((remote) => {
                const url = remote.pages.commitPage(context.commit);
                if (!url) return null;

                return (
                    <Action.OpenInBrowser
                        key={`${remote.name}:show-commit`}
                        title={`Show Commit on ${remote.displayName}`}
                        url={url}
                        icon={RemoteHostIcon(remote)}
                    />
                );
            })}
        </>
    );
}

export function RemoteAddAction(context: RepositoryContext & NavigationContext) {
    return (
        <Action.Push
            title="Add New Remote"
            icon={Icon.Plus}
            target={<RemoteEditorForm {...context} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
    );
}

export function RemoteEditAction(context: RepositoryContext & { initialRemote: Remote; }) {
    return (
        <Action.Push
            title="Edit Remote"
            icon={Icon.Pencil}
            target={<RemoteEditorForm {...context} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
    );
}

function RemoteEditorForm(context: RepositoryContext & { initialRemote?: Remote; }) {
    const { pop } = useNavigation();
    const [name, setName] = useState(context.initialRemote?.name ?? "");
    const [fetchUrl, setFetchUrl] = useState(context.initialRemote?.fetchUrl ?? "");
    const [pushUrl, setPushUrl] = useState(context.initialRemote?.pushUrl ?? "");

    const validateGitUrl = (url: string): string | undefined => {
        if (!url.trim()) return undefined;

        // Check SSH format (git@github.com:username/repo.git)
        const sshPattern = /^(?:ssh:\/\/)?(?:[^@]+@)?[^:]+:[^\/]+\/.*\.git$/;

        // Check HTTP/HTTPS format (https://github.com/username/repo.git)
        const httpPattern = /^https?:\/\/(?:.*@)?[^\/]+\/.*(?:\.git)?$/;

        if (sshPattern.test(url) || httpPattern.test(url)) {
            return undefined;
        }

        return "Incorrect SSH or HTTP format";
    };

    const handleSubmit = async (values: { name: string; fetchUrl: string; pushUrl: string }) => {
        try {
            if (context.initialRemote) {
                await context.gitManager.updateRemote(context.initialRemote.name, fetchUrl.trim(), pushUrl.trim(), name.trim());
            } else {
                await context.gitManager.addRemote(name.trim(), fetchUrl.trim(), pushUrl.trim());
            }
            await context.remotes.revalidate();
            pop();
        } catch (_error) {
            // Errors are handled globally in GitManager
        } finally {
        }
    };

    return (
        <Form
            navigationTitle={context.initialRemote ? "Edit Remote" : "Add Remote"}
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title={context.initialRemote ? "Save Changes" : "Create Remote"}
                        onSubmit={handleSubmit}
                    />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="name"
                title="Name"
                placeholder="origin"
                value={name}
                onChange={setName}
                error={name.trim().length === 0 ? "Required" : undefined}
            />
            <Form.TextField
                id="fetchUrl"
                title="Fetch URL"
                placeholder="git@github.com:org/repo.git or https://github.com/org/repo.git"
                value={fetchUrl}
                onChange={setFetchUrl}
                error={fetchUrl.trim().length === 0 ? "Required" : validateGitUrl(fetchUrl)}
            />

            <Form.TextField
                id="pushUrl"
                title="Push URL"
                placeholder="git@github.com:org/repo.git or https://github.com/org/repo.git"
                value={pushUrl}
                error={pushUrl.trim().length === 0 ? undefined : validateGitUrl(pushUrl)}
                info={"Optional"}

                onChange={setPushUrl}
            />
        </Form>
    );
}


export function RemoteDeleteAction(context: RepositoryContext & { remote: Remote }) {
    const handleRemoveRemote = async () => {
        const confirmed = await confirmAlert({
            title: "Remove Remote",
            message: `Are you sure you want to remove remote '${context.remote.name}'?`,
            primaryAction: {
                title: "Remove",
                style: Alert.ActionStyle.Destructive
            },
        });

        if (!confirmed) return;

        try {
            await context.gitManager.removeRemote(context.remote.name);
            await showToast({ style: Toast.Style.Success, title: `Remote '${context.remote.name}' removed` });
            await context.remotes.revalidate();
        } catch {
            // error toast shown by manager
        }
    }

    return (
        <Action
            title="Delete Remote"
            icon={Icon.Trash}
            onAction={handleRemoveRemote}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
    );
}

export function RemoteCopyURLActions({ remote }: { remote: Remote }) {
    return (
        <>
            <Action.CopyToClipboard
                title="Copy Fetch URL"
                content={remote.fetchUrl}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
                title="Copy Push URL"
                content={remote.pushUrl}
                icon={Icon.Clipboard}
            />
        </>
    );
}

/**
 * Copies file URL from remote host to clipboard.
 * Returns undefined if no remotes available or provider doesn't support file URLs.
 */
export function RemoteShowFilePageAction(context: RepositoryContext & {
    filePath: string;
    ref: string;
}) {
    if (Object.keys(context.remotes.data).length === 0) {
        return undefined;
    }

    const remotes = Object.values(context.remotes.data);
    const availableRemotes = remotes.filter(remote => {
        const url = remote.pages.filePage(context.filePath, context.ref);
        return url !== undefined;
    });

    if (availableRemotes.length === 0) {
        return undefined;
    }

    if (availableRemotes.length === 1) {
        const remote = availableRemotes[0];
        const url = remote.pages.filePage(context.filePath, context.ref);
        if (!url) return undefined;

        return (
            <Action.OpenInBrowser
                title={`Show File on ${remote.provider}`}
                url={url}
                icon={RemoteHostIcon(remote)}
            />
        );
    }

    return (
        <ActionPanel.Submenu
            title="Show File Page on"
            icon={Icon.Clipboard}
        >
            {availableRemotes.map((remote) => {
                const url = remote.pages.filePage(context.filePath, context.ref);
                if (!url) return null;

                return (
                    <Action.OpenInBrowser
                        key={`${remote.name}:show-file-page`}
                        title={remote.displayName}
                        url={url}
                        icon={RemoteHostIcon(remote)}
                    />
                );
            })}
        </ActionPanel.Submenu>
    );
}

/**
 * Opens repository page on a specific branch.
 * Returns undefined if provider is unknown or URL can't be constructed.
 */
export function RemoteOpenBranchPage({
    remote,
    branch
}: {
    remote: Remote;
    branch: string;
}) {
    const url = remote.pages.repositoryBranchUrl(branch);
    if (!remote.provider || !url) return undefined;

    console.log(url)

    return (
        <Action.OpenInBrowser
            title={`Show on ${remote.provider}`}
            url={url}
            icon={RemoteHostIcon(remote)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
    );
}
