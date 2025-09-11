import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useGitStatus } from "../../hooks/useGitStatus";
import { useGitDiff } from "../../hooks/useGitDiff";
import {
  FileStageAction,
  FileUnstageAction,
  FileDiscardAction,
  FileOpenAction,
  FileOpenWithAction,
  FileCopyPathAction,
  FileMoveToTrashAction,
  FileStageAllAction,
  FileUnstageAllAction,
  FileDiscardAllAction,
  getFileStatusIcon,
  getFileStatusColor,
  FileQuickLookAction,
} from "../../components/actions/FileActions";
import { CreateStashAction } from "../../components/actions/StashActions";
import { GitManager } from "../../utils/git-utils";
import { FileStatus } from "../../types";
import { useState } from "react";
import { existsSync } from "fs";
import { CommitMessageForm } from "./CommitMessageView";

interface StatusViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  viewDropdown: React.ReactElement<any>;
  onNavigateToCommits?: () => void;
}

export function StatusView({ gitManager, navigationActions, viewDropdown, onNavigateToCommits }: StatusViewProps) {
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

  const stagedFiles = files ? files.filter((f) => f.status === "staged") : [];
  const unstagedFiles = files ? files.filter((f) => f.status === "unstaged" || f.status === "untracked") : [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Repository Status"
      searchBarPlaceholder="Search files by name, path..."
      onSelectionChange={(id) => setSelectedFilePath(id)}
      filtering={{ keepSectionOrder: true }}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={viewDropdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Details">
            <Action
              title={isShowingDetail ? "Hide Diff" : "Show Diff"}
              icon={Icon.CodeBlock}
              onAction={toggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action title="Refresh Status" onAction={revalidate} icon={Icon.ArrowClockwise} />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          title="Error loading status"
          description={error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : !files || files.length === 0 ? (
        <List.EmptyView
          title="No changes"
          description="No changes in the repository. The working directory is clean."
          icon={Icon.NewDocument}
        />
      ) : (
        <>
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
        </>
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
      title={file.path.split("/").pop() || file.path}
      subtitle={isShowingDetail ? undefined : file.relativePath}
      icon={{
        value: { source: getFileStatusIcon(file), tintColor: getFileStatusColor(file) },
        tooltip: file.type.charAt(0).toUpperCase() + file.type.slice(1),
      }}
      keywords={[file.path, file.oldPath].filter((keyword): keyword is string => Boolean(keyword))}
      detail={
        isShowingDetail ? (
          <List.Item.Detail isLoading={isLoading} markdown={`${file.relativePath}:\n\n${diff ?? ""}`} metadata />
        ) : undefined
      }
      quickLook={existsSync(file.path) ? { path: file.path, name: file.relativePath } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={file.path.split("/").pop()}>
            {/* Actions for staged files */}
            {file.status === "staged" && (
              <>
                <FileUnstageAction file={file} gitManager={gitManager} onRefresh={onRefresh} />
                <FileOpenAction filePath={file.path} />
                <FileOpenWithAction filePath={file.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <FileCopyPathAction filePath={file.path} />
              </>
            )}

            {/* Actions for unstaged/untracked files */}
            {(file.status === "unstaged" || file.status === "untracked") && (
              <>
                <FileStageAction file={file} gitManager={gitManager} onRefresh={onRefresh} />
                <FileOpenAction filePath={file.path} />
                <FileOpenWithAction filePath={file.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <FileCopyPathAction filePath={file.path} />
                <FileMoveToTrashAction
                  filePath={file.path}
                  isAddedFile={file.type === "added"}
                  onRefresh={onRefresh}
                />
                {file.type !== "conflicted" && file.type !== "added" && (
                  <FileDiscardAction file={file} gitManager={gitManager} onRefresh={onRefresh} />
                )}
              </>
            )}
            <CreateStashAction gitManager={gitManager} onRefresh={onRefresh} filePath={file.relativePath} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Details">
            <FileQuickLookAction filePath={file.path} />
            <Action
              title={isShowingDetail ? "Hide Detail" : "Show Detail"}
              icon={Icon.AppWindowSidebarLeft}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {hasStagedChanges && (
              <Action.Push
                title="Commit Changes"
                icon={Icon.Message}
                target={<CommitMessageForm gitManager={gitManager} onFinish={onCommitSuccess} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
            )}
            <FileStageAllAction gitManager={gitManager} onRefresh={onRefresh} />
            <FileUnstageAllAction gitManager={gitManager} onRefresh={onRefresh} />
            <FileDiscardAllAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Workspace">
            <CreateStashAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    />
  );
}
