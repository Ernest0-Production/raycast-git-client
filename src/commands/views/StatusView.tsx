import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useGitStatus } from "../../hooks/useGitStatus";
import { useGitDiff } from "../../hooks/useGitDiff";
import { ErrorView } from "../../components/shared/ErrorView";
import { EmptyView } from "../../components/shared/EmptyView";
import {
  FileStageAction,
  FileUnstageAction,
  FileDiscardAction,
  FileOpenAction,
  FileOpenWithAction,
  FileShowInFinderAction,
  FileCopyPathAction,
  FileMoveToTrashAction,
  FileStageAllAction,
  FileUnstageAllAction,
  FileDiscardAllAction,
  FileCommitAction,
  getFileStatusIcon,
  getFileStatusColor,
} from "../../components/actions/FileActions";
import { RepositoryDirectoryActions } from "../../components/actions/RepositoryDirectoryActions";
import { CreateStashAction } from "../../components/actions/StashActions";
import { GitManager } from "../../utils/git-utils";
import { FileStatus } from "../../types";
import { useState } from "react";
import { existsSync } from "fs";

interface StatusViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  onNavigateToCommits?: () => void;
}

export function StatusView({ gitManager, navigationActions, onNavigateToCommits }: StatusViewProps) {
  const { data: files, isLoading, error, revalidate } = useGitStatus(gitManager);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Combined callback for commit actions: refresh data and navigate
  const refreshAndNavigateToCommits = () => {
    revalidate();
    onNavigateToCommits?.();
  };

  const toggleDetail = () => {
    setIsShowingDetail(!isShowingDetail);
  };

  if (error) {
    return (
      <ErrorView
        title="Error loading status"
        message={error.message}
        navigationTitle={`Status - ${gitManager.repoName}`}
        onRetry={revalidate}
      />
    );
  }

  if (!files || files.length === 0) {
    return (
      <EmptyView
        title="No changes"
        description="No changes in the repository. The working directory is clean."
        icon={Icon.CheckCircle}
        navigationTitle={`Status - ${gitManager.repoName}`}
        actions={
          <ActionPanel>
            <Action title="Refresh Status" onAction={revalidate} icon={Icon.ArrowClockwise} />
            {navigationActions}
          </ActionPanel>
        }
      />
    );
  }

  const stagedFiles = files.filter((f) => f.status === "staged");
  const unstagedFiles = files.filter((f) => f.status === "unstaged" || f.status === "untracked");

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Status - ${gitManager.repoName}`}
      onSelectionChange={(id) => setSelectedFilePath(id)}
      filtering={{ keepSectionOrder: true }}
      isShowingDetail={isShowingDetail}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View Controls">
            <Action
              title={isShowingDetail ? "Hide Diff" : "Show Diff"}
              icon={Icon.CodeBlock}
              onAction={toggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="File Operations">
            <FileCommitAction
              gitManager={gitManager}
              onCommitSuccess={refreshAndNavigateToCommits}
              hasStagedChanges={stagedFiles.length > 0}
            />
            <FileStageAllAction gitManager={gitManager} onRefresh={revalidate} />
            <FileUnstageAllAction gitManager={gitManager} onRefresh={revalidate} />
            <FileDiscardAllAction gitManager={gitManager} onRefresh={revalidate} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Stash Operations">
            <CreateStashAction gitManager={gitManager} onRefresh={revalidate} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    >
      {unstagedFiles.length > 0 && (
        <List.Section title="Unstaged Files" subtitle={`${unstagedFiles.length}`}>
          {unstagedFiles.map((file) => (
            <FileListItem
              key={file.path}
              file={file}
              gitManager={gitManager}
              onRefresh={revalidate}
              navigationActions={navigationActions}
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetail}
              selectedFilePath={selectedFilePath}
              hasStagedChanges={stagedFiles.length > 0}
              onCommitSuccess={refreshAndNavigateToCommits}
            />
          ))}
        </List.Section>
      )}

      {stagedFiles.length > 0 && (
        <List.Section title="Staged Files" subtitle={`${stagedFiles.length}`}>
          {stagedFiles.map((file) => (
            <FileListItem
              key={file.path}
              file={file}
              gitManager={gitManager}
              onRefresh={revalidate}
              navigationActions={navigationActions}
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetail}
              selectedFilePath={selectedFilePath}
              hasStagedChanges={stagedFiles.length > 0}
              onCommitSuccess={refreshAndNavigateToCommits}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface FileListItemProps {
  file: FileStatus;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  selectedFilePath: string | null;
  hasStagedChanges: boolean;
  onCommitSuccess: () => void;
}

function FileListItem({
  file,
  gitManager,
  onRefresh,
  navigationActions,
  isShowingDetail,
  onToggleDetail,
  selectedFilePath,
  hasStagedChanges,
  onCommitSuccess,
}: FileListItemProps) {
  // Create a unique identifier for each file item
  const fileId = `${file.relativePath}-${file.status}`;

  // Only load diff if this file is selected and detail view is showing
  const shouldLoadDiff = isShowingDetail && selectedFilePath === fileId;

  const { diff, isLoading } = useGitDiff({
    gitManager,
    options: { file: file.relativePath, status: file.status },
    execute: shouldLoadDiff,
  });

  return (
    <List.Item
      id={fileId}
      title={file.path.split('/').pop() || file.path}
      subtitle={isShowingDetail ? undefined : file.relativePath}
      icon={{
        value: { source: getFileStatusIcon(file), tintColor: getFileStatusColor(file) },
        tooltip: file.type.charAt(0).toUpperCase() + file.type.slice(1),
      }}
      keywords={[
        file.path,
        file.oldPath
      ].filter((keyword): keyword is string => Boolean(keyword))}
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            isLoading={isLoading}
            markdown={`${file.relativePath}:\n\n${diff ?? ""}`}
            metadata
          />
        ) : undefined
      }
      quickLook={existsSync(file.path) ? { path: file.path, name: file.relativePath } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="File Operations">
            {/* Actions for staged files */}
            {file.status === "staged" && (
              <>
                <FileUnstageAction file={file} gitManager={gitManager} onRefresh={onRefresh} />
                <FileOpenAction file={file} />
                <FileOpenWithAction file={file} />
                <FileShowInFinderAction file={file} />
                <FileCopyPathAction file={file} />
              </>
            )}

            {/* Actions for unstaged/untracked files */}
            {(file.status === "unstaged" || file.status === "untracked") && (
              <>
                <FileStageAction file={file} gitManager={gitManager} onRefresh={onRefresh} />
                <FileMoveToTrashAction file={file} onRefresh={onRefresh} />
                {file.type !== "conflicted" && file.type !== "added" && (
                  <FileDiscardAction file={file} gitManager={gitManager} onRefresh={onRefresh} />
                )}
                <FileOpenAction file={file} />
                <FileOpenWithAction file={file} />
                <FileShowInFinderAction file={file} />
                <FileCopyPathAction file={file} />
              </>
            )}
            <CreateStashAction gitManager={gitManager} onRefresh={onRefresh} filePath={file.relativePath} />
          </ActionPanel.Section>

          <ActionPanel.Section title="View Controls">
            {existsSync(file.path) && <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />}
            <Action
              title={isShowingDetail ? "Hide Detail" : "Show Detail"}
              icon={Icon.AppWindowSidebarLeft}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Commit Operations">
            <FileCommitAction
              gitManager={gitManager}
              onCommitSuccess={onCommitSuccess}
              hasStagedChanges={hasStagedChanges}
            />
            <FileStageAllAction gitManager={gitManager} onRefresh={onRefresh} />
            <FileUnstageAllAction gitManager={gitManager} onRefresh={onRefresh} />
            <FileDiscardAllAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Stash Operations">
            <CreateStashAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
