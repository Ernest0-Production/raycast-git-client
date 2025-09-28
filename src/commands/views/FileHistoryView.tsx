import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert } from "@raycast/api";
import { useMemo, useState } from "react";
import { useCachedState, usePromise } from "@raycast/utils";
import { GitManager } from "../../utils/git-manager";
import { Commit, CommitFileChange } from "../../types";
import { useGitDiff } from "../../hooks/useGitDiff";
import { FileCopyPathAction, FileOpenAction, FileOpenWithAction, FileQuickLookAction, FileRestoreAction } from "../../components/actions/FileActions";
import { CommitFileIcon } from "../../components/icons/StatusIcons";
import { join } from "path";
import { CommitCopyAuthorAction, CommitCopyHashAction, CommitCopyMessageAction } from "../../components/actions/CommitActions";
import { existsSync } from "fs";
import { RemotesHosts } from "../../hooks/useGitRemotes";
import { RemoteOpenCommitAction } from "../../components/actions/RemoteHostActions";

interface FileHistoryViewProps {
    gitManager: GitManager;
    filePath: string;
    remotesHosts: RemotesHosts;
    onRefresh: () => void;
}

export default function FileHistoryView({ gitManager, filePath, remotesHosts, onRefresh }: FileHistoryViewProps) {
    const [isShowingDetail, setIsShowingDetail] = useState(false);
    const [isShowingMetadata, setIsShowingMetadata] = useCachedState("commits-metadata-visible", true);
    const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);

    const { data: commits, isLoading, revalidate, error } = usePromise(
        async (filePath, repoPath) => {
            return await gitManager.getFileHistory(filePath);
        },
        [filePath, gitManager.repoPath],
    );

    const fileName = useMemo(() => filePath.split("/").pop() || filePath, [filePath]);

    const toggleDetail = () => setIsShowingDetail(!isShowingDetail);
    const toggleMetadata = () => setIsShowingMetadata(!isShowingMetadata);

    return (
        <List
            isLoading={isLoading}
            navigationTitle={`File History`}
            searchBarPlaceholder="Search commits by message, sha, author..."
            onSelectionChange={setSelectedCommitId}
            isShowingDetail={isShowingDetail}
            actions={
                <ActionPanel>
                    <Action
                        title="Refresh"
                        onAction={revalidate}
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                </ActionPanel>
            }
        >
            {error ? (
                <List.EmptyView
                    title="Error loading history"
                    description={error.message}
                    icon={Icon.ExclamationMark}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Refresh"
                                onAction={revalidate}
                                icon={Icon.ArrowClockwise}
                                shortcut={{ modifiers: ["cmd"], key: "r" }}
                            />
                        </ActionPanel>
                    }
                />
            ) : !commits || commits.length === 0 ? (
                <List.EmptyView title="No history" description="No commits have modified this file." icon={Icon.Document} />
            ) : (
                <List.Section title={fileName} subtitle={`${commits.length} commits`}>
                    {commits.map((commit) => (
                        <CommitListItem
                            key={commit.hash}
                            commit={commit}
                            file={commit.changedFiles![0]}
                            gitManager={gitManager}
                            isShowingDetail={isShowingDetail}
                            onToggleDetail={toggleDetail}
                            selectedCommitId={selectedCommitId}
                            isShowingMetadata={isShowingMetadata}
                            onToggleMetadata={toggleMetadata}
                            onRefresh={onRefresh}
                            remotesHosts={remotesHosts}
                        />
                    ))}
                </List.Section>
            )}
        </List>
    );
}

interface CommitFileListItemProps {
    file: CommitFileChange;
    commit: Commit;
    isShowingMetadata: boolean;
    onToggleMetadata: () => void;
    gitManager: GitManager;
    isShowingDetail: boolean;
    onToggleDetail: () => void;
    selectedCommitId: string | null;
    onRefresh: () => void;
    remotesHosts: RemotesHosts;
}

function CommitListItem({
    file,
    commit,
    isShowingMetadata,
    onToggleMetadata,
    gitManager,
    isShowingDetail,
    onToggleDetail,
    selectedCommitId,
    onRefresh,
    remotesHosts,
}: CommitFileListItemProps) {
    // Only load diff if this commit is selected and detail is visible
    const shouldLoadDiff = isShowingDetail && selectedCommitId === commit.hash;

    const { diff, isLoading, error } = useGitDiff({
        gitManager,
        options: { file: file.path, commitHash: commit.hash },
        execute: shouldLoadDiff,
    });

    const accessories = useMemo(() => {
        if (isShowingDetail) {
            return undefined;
        }

        return [
            { text: { value: commit.author }, tooltip: commit.authorEmail },
            { text: commit.date.toRelativeDateString() },
        ];
    }, [commit.author, commit.authorEmail, commit.date, isShowingDetail]);

    const absolutePath = join(gitManager.repoPath, file.path);
    const fileExists = existsSync(absolutePath);

    return (
        <List.Item
            id={commit.hash}
            title={commit.message}
            icon={CommitFileIcon(file)}
            accessories={accessories}
            keywords={[
                commit.hash,
                commit.shortHash,
                commit.author,
                commit.authorEmail
            ]}
            detail={
                isShowingDetail ? (
                    <List.Item.Detail
                        isLoading={isLoading}
                        markdown={`${file.path}:\n\n${error ? `Error loading diff: ${error.message}` : (diff ?? "")}`}
                        metadata={
                            isShowingMetadata ? (
                                <List.Item.Detail.Metadata>
                                    <List.Item.Detail.Metadata.Label title="Author" text={commit.author} />
                                    <List.Item.Detail.Metadata.Label title="Email" text={commit.authorEmail} />
                                    <List.Item.Detail.Metadata.Label title="Date" text={commit.date.toLocaleString()} />
                                    <List.Item.Detail.Metadata.Label title="Hash" text={commit.hash} />
                                </List.Item.Detail.Metadata>
                            ) : undefined
                        }
                    />
                ) : undefined
            }
            quickLook={fileExists ? { path: absolutePath, name: absolutePath } : undefined}
            actions={
                <ActionPanel>
                    <Action
                        title={isShowingDetail ? "Hide Diff" : "Show Diff"}
                        icon={Icon.AppWindowSidebarLeft}
                        onAction={onToggleDetail}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    />
                    {isShowingDetail && (
                        <Action
                            title={isShowingMetadata ? "Hide Metadata" : "Show Metadata"}
                            icon={Icon.Info}
                            onAction={onToggleMetadata}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
                        />
                    )}

                    <ActionPanel.Section title={file.path.split("/").pop()}>
                        <FileOpenAction filePath={absolutePath} />
                        <FileOpenWithAction filePath={absolutePath} />
                        <FileCopyPathAction filePath={absolutePath} />
                        <FileQuickLookAction filePath={absolutePath} />
                        <FileRestoreAction
                            filePath={absolutePath}
                            commit={commit.hash}
                            gitManager={gitManager}
                            onRefresh={onRefresh}
                        />
                        <FileRestoreAction
                            filePath={absolutePath}
                            before={true}
                            commit={commit.hash}
                            gitManager={gitManager}
                            onRefresh={onRefresh}
                        />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Commit">
                        <CommitCopyMessageAction commit={commit} />
                        <CommitCopyAuthorAction commit={commit} />
                        <CommitCopyHashAction commit={commit} />
                        {Object.keys(remotesHosts).map((remote) => (
                            <RemoteOpenCommitAction
                                key={`${remote}-open-commit`}
                                remote={remotesHosts[remote]}
                                commit={commit.hash}
                            />
                        ))}
                    </ActionPanel.Section>

                    <Action
                        title="Refresh"
                        onAction={onRefresh}
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                </ActionPanel>
            }
        />
    );
}
