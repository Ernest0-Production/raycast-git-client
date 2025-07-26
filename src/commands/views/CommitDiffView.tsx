import { ActionPanel, Action, List, Icon, getPreferenceValues } from "@raycast/api";
import { useGitDiff } from "../../hooks/useGitDiff";
import { ErrorView } from "../../components/shared/ErrorView";
import { EmptyView } from "../../components/shared/EmptyView";
import { GitManager } from "../../utils/git-utils";
import { Commit, CommitFileChange, Preferences } from "../../types";
import { join } from "path";
import { useState } from "react";
import { existsSync } from "fs";

interface CommitDiffViewProps {
  commit: Commit;
  gitManager: GitManager;
  navigationActions: React.ReactNode;
}

export function CommitDiffView({ commit, gitManager, navigationActions }: CommitDiffViewProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

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
        actions={<ActionPanel>{navigationActions}</ActionPanel>}
      />
    );
  }

  // Group files by status for better organization
  const addedFiles = commit.changedFiles.filter((f) => f.status === "A");
  const modifiedFiles = commit.changedFiles.filter((f) => f.status === "M");
  const deletedFiles = commit.changedFiles.filter((f) => f.status === "D");
  const renamedFiles = commit.changedFiles.filter((f) => f.status === "R");
  const copiedFiles = commit.changedFiles.filter((f) => f.status === "C");

  return (
    <List
      navigationTitle={`Files - ${commit.shortHash}`}
      onSelectionChange={(id) => setSelectedFilePath(id)}
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

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
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
              selectedFilePath={selectedFilePath}
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
              selectedFilePath={selectedFilePath}
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
              selectedFilePath={selectedFilePath}
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
              selectedFilePath={selectedFilePath}
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
              selectedFilePath={selectedFilePath}
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
  selectedFilePath: string | null;
}

function FileListItem({
  file,
  commit,
  gitManager,
  navigationActions,
  isShowingDetail,
  onToggleDetail,
  selectedFilePath,
}: FileListItemProps) {
  const preferences = getPreferenceValues<Preferences>();

  // Create a unique identifier for each file item
  const fileId = `${file.path}-${commit.hash}`;

  // Only load diff if this file is selected and detail view is showing
  const shouldLoadDiff = isShowingDetail && selectedFilePath === fileId;

  const { diff, isLoading, error } = useGitDiff({
    gitManager,
    options: { file: file.path, commitHash: commit.hash },
    execute: shouldLoadDiff,
  });

  const getAbsolutePath = (relativePath: string): string => {
    return join(gitManager.repoPath, relativePath);
  };

  const getFileIcon = (status: string) => {
    switch (status) {
      case "A":
        return Icon.Plus;
      case "M":
        return Icon.Pencil;
      case "D":
        return Icon.Trash;
      case "R":
        return Icon.ArrowsContract;
      case "C":
        return Icon.Duplicate;
      default:
        return Icon.Document;
    }
  };

  const getFileColor = (status: string) => {
    switch (status) {
      case "A":
        return "#22c55e"; // green
      case "M":
        return "#f59e0b"; // amber
      case "D":
        return "#ef4444"; // red
      case "R":
        return "#3b82f6"; // blue
      case "C":
        return "#8b5cf6"; // purple
      default:
        return undefined;
    }
  };

  const getFileStatusText = (status: string) => {
    switch (status) {
      case "A":
        return "Added";
      case "M":
        return "Modified";
      case "D":
        return "Deleted";
      case "R":
        return "Renamed";
      case "C":
        return "Copied";
      default:
        return status;
    }
  };

  const absolutePath = getAbsolutePath(file.path);
  const fileExists = existsSync(absolutePath);

  return (
    <List.Item
      id={fileId}
      title={file.path.split('/').pop() || file.path}
      subtitle={isShowingDetail ? undefined : file.path}
      icon={{
        source: getFileIcon(file.status),
        tintColor: getFileColor(file.status),
        tooltip: getFileStatusText(file.status),
      }}
      keywords={[
        file.path,
        file.oldPath
      ].filter((keyword): keyword is string => Boolean(keyword))}
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            isLoading={isLoading}
            markdown={`${file.path}:\n\n${error ? `Error loading diff: ${error.message}` : diff ?? ""}`}
          />
        ) : undefined
      }
      quickLook={fileExists ? { path: absolutePath, name: file.path } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View Controls">
            {fileExists && <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />}
            <Action
              title={isShowingDetail ? "Hide Detail" : "Show Detail"}
              icon={Icon.AppWindowSidebarLeft}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="File Access">
            {fileExists && (
              <>
                <Action.Open
                  title="Open File"
                  target={absolutePath}
                  application={preferences.defaultEditor}
                  icon={Icon.BlankDocument}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.OpenWith
                  title="Open with…"
                  path={absolutePath}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                />
                <Action.ShowInFinder
                  path={absolutePath}
                  title="Show in Finder"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                />
              </>
            )}
            <Action.CopyToClipboard
              title="Copy File Path"
              content={file.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
