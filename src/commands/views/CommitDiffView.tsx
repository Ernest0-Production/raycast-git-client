import { ActionPanel, Action, List, Icon, getPreferenceValues } from "@raycast/api";
import { useGitDiff } from "../../hooks/useGitDiff";
import { ErrorView } from "../../components/shared/ErrorView";
import { EmptyView } from "../../components/shared/EmptyView";
import { GitManager } from "../../utils/git-utils";
import { Commit, CommitFileChange, Preferences } from "../../types";
import { join } from "path";
import { useState } from "react";

interface CommitDiffViewProps {
    commit: Commit;
    gitManager: GitManager;
    navigationActions: React.ReactNode;
}

export function CommitDiffView({ commit, gitManager, navigationActions }: CommitDiffViewProps) {
    const [isShowingDetail, setIsShowingDetail] = useState(false);

    const toggleDetail = () => {
        setIsShowingDetail(!isShowingDetail);
    };

    if (!commit.changedFiles || commit.changedFiles.length === 0) {
        return (
            <EmptyView
                title="No file changes"
                description="This commit has no file changes."
                icon={Icon.Document}
                navigationTitle={`Files - ${commit.shortHash}`}
                actions={
                    <ActionPanel>
                        {navigationActions}
                    </ActionPanel>
                }
            />
        );
    }

    // Group files by status for better organization
    const addedFiles = commit.changedFiles.filter(f => f.status === "A");
    const modifiedFiles = commit.changedFiles.filter(f => f.status === "M");
    const deletedFiles = commit.changedFiles.filter(f => f.status === "D");
    const renamedFiles = commit.changedFiles.filter(f => f.status === "R");
    const copiedFiles = commit.changedFiles.filter(f => f.status === "C");

    return (
        <List
            navigationTitle={`Files - ${commit.shortHash}`}
            isShowingDetail={isShowingDetail}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title="View Controls">
                        <Action
                            title={isShowingDetail ? "Hide Detail" : "Show Detail"}
                            icon={Icon.AppWindowSidebarLeft}
                            onAction={toggleDetail}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                        {navigationActions}
                    </ActionPanel.Section>
                </ActionPanel>
            }
        >
            {addedFiles.length > 0 && (
                <List.Section title="Added Files">
                    {addedFiles.map((file) => (
                        <FileListItem
                            key={file.path}
                            file={file}
                            commit={commit}
                            gitManager={gitManager}
                            navigationActions={navigationActions}
                            isShowingDetail={isShowingDetail}
                            onToggleDetail={toggleDetail}
                        />
                    ))}
                </List.Section>
            )}

            {modifiedFiles.length > 0 && (
                <List.Section title="Modified Files">
                    {modifiedFiles.map((file) => (
                        <FileListItem
                            key={file.path}
                            file={file}
                            commit={commit}
                            gitManager={gitManager}
                            navigationActions={navigationActions}
                            isShowingDetail={isShowingDetail}
                            onToggleDetail={toggleDetail}
                        />
                    ))}
                </List.Section>
            )}

            {deletedFiles.length > 0 && (
                <List.Section title="Deleted Files">
                    {deletedFiles.map((file) => (
                        <FileListItem
                            key={file.path}
                            file={file}
                            commit={commit}
                            gitManager={gitManager}
                            navigationActions={navigationActions}
                            isShowingDetail={isShowingDetail}
                            onToggleDetail={toggleDetail}
                        />
                    ))}
                </List.Section>
            )}

            {renamedFiles.length > 0 && (
                <List.Section title="Renamed Files">
                    {renamedFiles.map((file) => (
                        <FileListItem
                            key={file.path}
                            file={file}
                            commit={commit}
                            gitManager={gitManager}
                            navigationActions={navigationActions}
                            isShowingDetail={isShowingDetail}
                            onToggleDetail={toggleDetail}
                        />
                    ))}
                </List.Section>
            )}

            {copiedFiles.length > 0 && (
                <List.Section title="Copied Files">
                    {copiedFiles.map((file) => (
                        <FileListItem
                            key={file.path}
                            file={file}
                            commit={commit}
                            gitManager={gitManager}
                            navigationActions={navigationActions}
                            isShowingDetail={isShowingDetail}
                            onToggleDetail={toggleDetail}
                        />
                    ))}
                </List.Section>
            )}
        </List>
    );
}

interface FileListItemProps {
    file: CommitFileChange;
    commit: Commit;
    gitManager: GitManager;
    navigationActions: React.ReactNode;
    isShowingDetail: boolean;
    onToggleDetail: () => void;
}

function FileListItem({ file, commit, gitManager, navigationActions, isShowingDetail, onToggleDetail }: FileListItemProps) {
    const preferences = getPreferenceValues<Preferences>();
    const { diff, isLoading, error } = useGitDiff({
        gitManager,
        options: { file: file.path, commitHash: commit.hash },
    });

    const getAbsolutePath = (relativePath: string): string => {
        return join(gitManager.repoPath, relativePath);
    };



    const getFileIcon = (status: string) => {
        switch (status) {
            case "A": return Icon.Plus;
            case "M": return Icon.Pencil;
            case "D": return Icon.Trash;
            case "R": return Icon.ArrowsContract;
            case "C": return Icon.Duplicate;
            default: return Icon.Document;
        }
    };

    const getFileColor = (status: string) => {
        switch (status) {
            case "A": return "#22c55e"; // green
            case "M": return "#f59e0b"; // amber
            case "D": return "#ef4444"; // red
            case "R": return "#3b82f6"; // blue
            case "C": return "#8b5cf6"; // purple
            default: return undefined;
        }
    };

    const getFileTitle = (file: CommitFileChange): string => {
        if (file.oldPath && file.status === "R") {
            return `${file.oldPath} → ${file.path}`;
        }
        return file.path;
    };

    return (
        <List.Item
            title={getFileTitle(file)}
            icon={{ source: getFileIcon(file.status), tintColor: getFileColor(file.status) }}
            detail={
                isShowingDetail ? (
                    <List.Item.Detail
                        isLoading={isLoading}
                        markdown={error ? `Error loading diff: ${error.message}` : diff}
                    />
                ) : undefined
            }
            quickLook={{ path: getAbsolutePath(file.path), name: file.path }}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title="View Controls">
                        <Action.ToggleQuickLook
                            shortcut={{ modifiers: ["cmd"], key: "y" }}
                        />
                        <Action
                            title={isShowingDetail ? "Hide Detail" : "Show Detail"}
                            icon={Icon.AppWindowSidebarLeft}
                            onAction={onToggleDetail}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="File Access">
                        <Action.Open
                            title="Open File"
                            target={getAbsolutePath(file.path)}
                            application={preferences.defaultEditor}
                            icon={Icon.BlankDocument}
                            shortcut={{ modifiers: ["cmd"], key: "o" }}
                        />
                        <Action.OpenWith
                            title="Open With..."
                            path={getAbsolutePath(file.path)}
                            icon={Icon.Ellipsis}
                            shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                        />
                        <Action.ShowInFinder
                            path={getAbsolutePath(file.path)}
                            title="Show in Finder"
                            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                        />
                        <Action.CopyToClipboard
                            title="Copy File Path"
                            content={file.path}
                            shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                        {navigationActions}
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    );
}
