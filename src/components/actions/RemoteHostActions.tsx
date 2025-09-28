import { Action } from "@raycast/api";
import { Remote } from "../../types";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";

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
            icon={RemoteHostIcon(remote.provider)}
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
            icon={RemoteHostIcon(remote.provider)}
        />
    );
}

/**
 * Opens a specific commit page for a given remote.
 * Returns undefined if provider is unknown or URL can't be constructed.
 */
export function RemoteOpenCommitAction({
    remote,
    commit
}: {
    remote: Remote,
    commit: string
}) {
    const url = remote.pages.commitPage(commit);
    if (!remote.provider || !url) return undefined;

    return (
        <Action.OpenInBrowser
            title={`Show Commit on ${remote.provider}`}
            url={url}
            icon={RemoteHostIcon(remote.provider)}
        />
    );
}


