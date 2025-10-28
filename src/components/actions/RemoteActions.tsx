import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { RemotesHosts } from "../../hooks/useGitRemotes";
import { RemoteHostIcon, RemoteHostProviderIcon } from "../icons/RemoteHostIcons";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { Remote } from "../../types";
import { useMemo, useState } from "react";
import { basename } from "path";


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

    if (Object.keys(context.remotes.data).length === 0) {
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

export function RemoteWebPageActions(context: RepositoryContext & {
    remoteName?: string;
    branch?: string;
    commit?: string;
    file?: { path: string; ref: string };
}) {
    const isSingleRemote = useMemo(() => Object.keys(context.remotes.data).length === 1, [context.remotes.data]);

    return <>
        {Object.values(context.remotes.data)
            .filter((remote) => context.remoteName ? remote.name === context.remoteName : true)
            .map((remote) => (
                <ActionPanel.Submenu
                    key={`remote-web-page-actions-${remote.name}`}
                    icon={RemoteHostProviderIcon(remote.provider)}
                    title={`Open Web Page on ${isSingleRemote ? remote.provider : remote.displayName}`}
                >
                    {context.file && (() => {
                        const url = remote.pages.filePage(context.file.path, context.file.ref);
                        if (!url) return null;

                        return (
                            <Action.OpenInBrowser
                                title={basename(context.file.path)}
                                url={url}
                                icon={Icon.Document}
                            />
                        );
                    })()}

                    {context.branch && (() => {
                        const url = remote.pages.repositoryBranchUrl(context.branch);
                        if (!url) return null;

                        return (
                            <Action.OpenInBrowser
                                title={`${context.branch}`}
                                url={url}
                                icon={`git-branch.svg`}
                            />
                        );
                    })()}

                    {context.branch && (() => {
                        const url = remote.pages.createPullRequestForm(context.branch);
                        if (!url) return null;

                        return (
                            <Action.OpenInBrowser
                                title={remote.provider === "GitLab" ? "Create Merge Request" : "Create Pull Request"}
                                url={url}
                                icon={Icon.PlusTopRightSquare}
                            />
                        );
                    })()}

                    {context.commit && (() => {
                        const url = remote.pages.commitPage(context.commit);
                        if (!url) return null;

                        return (
                            <Action.OpenInBrowser
                                title={`Commit Page`}
                                url={url}
                                icon={`git-commit.svg`}
                            />
                        );
                    })()}

                    {remote.pages.pullRequests && (
                        <Action.OpenInBrowser
                            title={remote.provider === "GitLab" ? "Merge Requests" : "Pull Requests"}
                            url={remote.pages.pullRequests}
                            icon={`git-merge.svg`}
                        />
                    )}
                </ActionPanel.Submenu>
            ))}
    </>
}
