import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useGitStatus } from "../../hooks/useGitStatus";
import { useGitDiff } from "../../hooks/useGitDiff";
import { ErrorView } from "../../components/shared/ErrorView";
import { EmptyView } from "../../components/shared/EmptyView";
import {
  FileActions,
  CommitActions as FileCommitActions,
  getFileStatusIcon,
  getFileStatusColor,
} from "../../components/actions/FileActions";
import { RepositoryActions } from "../../components/actions/RepositoryActions";
import { GitManager } from "../../utils/git-utils";
import { FileStatus } from "../../types";
import { useState } from "react";

interface StatusViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
}

export function StatusView({ gitManager, navigationActions }: StatusViewProps) {
  const { data: files, isLoading, error, revalidate } = useGitStatus(gitManager);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

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
  const unstagedFiles = files.filter((f) => f.status === "unstaged");

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Status - ${gitManager.repoName}`}
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

          <ActionPanel.Section title="File Operations">
            <FileCommitActions gitManager={gitManager} onRefresh={revalidate} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {navigationActions}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {unstagedFiles.length > 0 && (
        <List.Section title="Unstaged Files">
          {unstagedFiles.map((file) => (
            <FileListItem
              key={file.path}
              file={file}
              gitManager={gitManager}
              onRefresh={revalidate}
              navigationActions={navigationActions}
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetail}
            />
          ))}
        </List.Section>
      )}

      {stagedFiles.length > 0 && (
        <List.Section title="Staged Files">
          {stagedFiles.map((file) => (
            <FileListItem
              key={file.path}
              file={file}
              gitManager={gitManager}
              onRefresh={revalidate}
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
  file: FileStatus;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}

function FileListItem({ file, gitManager, onRefresh, navigationActions, isShowingDetail, onToggleDetail }: FileListItemProps) {
  const { diff, isLoading } = useGitDiff({
    gitManager,
    options: { file: file.relativePath, staged: file.status === "staged" },
  });

  return (
    <List.Item
      title={file.relativePath}
      icon={{
        value: { source: getFileStatusIcon(file), tintColor: getFileStatusColor(file) },
        tooltip: file.type.charAt(0).toUpperCase() + file.type.slice(1),
      }}
      detail={isShowingDetail ? <List.Item.Detail isLoading={isLoading} markdown={diff} /> : undefined}
      quickLook={{ path: file.path, name: file.relativePath }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="File Operations">
            <FileActions file={file} gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

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

          <ActionPanel.Section title="Commit Operations">
            <FileCommitActions gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {navigationActions}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
