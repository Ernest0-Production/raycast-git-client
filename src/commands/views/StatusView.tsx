import { ActionPanel, Action, List, Icon } from "@raycast/api";
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
  FileQuickLookAction,
  FileRefreshStatusAction,
  FileCommitAction,
  FileConflictAbortAction,
  FileHistoryAction,
  CreatePatchAction,
  ApplyPatchAction,
} from "../../components/actions/FileActions";
import { CreateStashAction } from "../../components/actions/StashActions";
import { GitManager } from "../../utils/git-manager";
import { Branch, FileStatus, StatusState } from "../../types";
import { useMemo, useState } from "react";
import { existsSync } from "fs";

interface StatusViewProps {
  gitManager: GitManager;
  currentBranch?: Branch;
  navigationActions: React.ReactNode;
  viewDropdown: React.ReactElement<any>;
  onNavigateToCommits?: () => void;
  status?: StatusState;
  isLoading: boolean;
  error?: Error;
  revalidateStatus: () => void | Promise<unknown>;
  revalidateCommits: () => void | Promise<unknown>;
  revalidateBranches: () => void | Promise<unknown>;
}

export function StatusView({
  gitManager,
  currentBranch,
  navigationActions,
  viewDropdown,
  onNavigateToCommits,
  status, isLoading,
  error,
  revalidateStatus,
  revalidateCommits,
  revalidateBranches
}: StatusViewProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Combined callback for commit actions: refresh data and navigate
  const refreshAndNavigateToCommits = () => {
    revalidateStatus();
    revalidateBranches();
    revalidateCommits();
    onNavigateToCommits?.();
  };

  const toggleDetail = () => {
    setIsShowingDetail(!isShowingDetail);
  };

  const stagedFiles = status?.files ? status.files.filter((f) => f.status === "staged") : [];
  const unstagedFiles = status?.files ? status.files.filter((f) => f.status === "unstaged" || f.status === "untracked") : [];

  const navigationTitle = useMemo(() => {
    if (status?.conflict) {
      switch (status.conflict.type) {
        case "rebase":
          return `⚠️ Rebase Conflict (${status.conflict.current}/${status.conflict.total})`;
        case "merge":
          return `⚠️ Merge Conflict (${status.conflict.current}/${status.conflict.total})`;
        case "squash":
          return `Squashing Commit`;
        default:
          return "⚠️ Conflict";
      }
    } else {
      return "Repository Status";
    }
  }, [status?.conflict]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search files by name, path..."
      onSelectionChange={(id) => setSelectedFilePath(id)}
      filtering={{ keepSectionOrder: true }}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={viewDropdown}
      actions={
        <ActionPanel>
          {status && currentBranch && (
            <FileCommitAction
              status={status}
              gitManager={gitManager}
              currentBranch={currentBranch}
              onFinish={refreshAndNavigateToCommits} />
          )}

          <ActionPanel.Section>
            <FileRefreshStatusAction onRefresh={revalidateStatus} />
            <Action
              title={isShowingDetail ? "Hide Diff" : "Show Diff"}
              icon={Icon.CodeBlock}
              onAction={toggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Workspace">
            <ApplyPatchAction gitManager={gitManager} onRefresh={revalidateStatus} />
          </ActionPanel.Section>

          {status && (
            <FileConflictAbortAction
              status={status}
              gitManager={gitManager}
              onRefresh={revalidateStatus}
            />
          )}
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
              <Action title="Retry" onAction={revalidateStatus} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : !status?.files || status.files.length === 0 ? (
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
                  status={status}
                  currentBranch={currentBranch}
                  gitManager={gitManager}
                  onRefresh={revalidateStatus}
                  navigationActions={navigationActions}
                  isShowingDetail={isShowingDetail}
                  onToggleDetail={toggleDetail}
                  selectedFilePath={selectedFilePath}
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
                  status={status}
                  currentBranch={currentBranch}
                  gitManager={gitManager}
                  onRefresh={revalidateStatus}
                  navigationActions={navigationActions}
                  isShowingDetail={isShowingDetail}
                  onToggleDetail={toggleDetail}
                  selectedFilePath={selectedFilePath}
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
  status: StatusState;
  currentBranch?: Branch;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  selectedFilePath: string | null;
  onCommitSuccess: () => void;
}

function FileListItem({
  file,
  status,
  currentBranch,
  gitManager,
  onRefresh,
  navigationActions,
  isShowingDetail,
  onToggleDetail,
  selectedFilePath,
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
      icon={getFileStatusIcon(file)}
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
                <FileQuickLookAction filePath={file.path} />
                <FileCopyPathAction filePath={file.path} />
              </>
            )}

            {/* Actions for unstaged/untracked files */}
            {(file.status === "unstaged" || file.status === "untracked") && (
              <>
                <FileStageAction file={file} gitManager={gitManager} onRefresh={onRefresh} />
                <FileOpenAction filePath={file.path} />
                <FileOpenWithAction filePath={file.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <FileQuickLookAction filePath={file.path} />
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
            <FileHistoryAction filePath={file.path} gitManager={gitManager} onRefresh={onRefresh} />
            <CreateStashAction gitManager={gitManager} onRefresh={onRefresh} filePath={file.relativePath} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <FileRefreshStatusAction onRefresh={onRefresh} />
            <Action
              title={isShowingDetail ? "Hide Changes" : "Show Changes"}
              icon={Icon.AppWindowSidebarLeft}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {currentBranch && (
              <FileCommitAction
                status={status}
                currentBranch={currentBranch}
                gitManager={gitManager}
                onContinue={onCommitSuccess}
                onFinish={onCommitSuccess}
              />
            )}
            <FileConflictAbortAction status={status} gitManager={gitManager} onRefresh={onRefresh} />
            <FileStageAllAction gitManager={gitManager} onRefresh={onRefresh} />
            <FileUnstageAllAction gitManager={gitManager} onRefresh={onRefresh} />
            <FileDiscardAllAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Workspace">
            <CreateStashAction gitManager={gitManager} onRefresh={onRefresh} />
            <CreatePatchAction gitManager={gitManager} />
            <ApplyPatchAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    />
  );
}
