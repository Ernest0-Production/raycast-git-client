import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useGitDiff } from "../../hooks/useGitDiff";
import { GitManager } from "../../utils/git-utils";
import { Commit, CommitFileChange } from "../../types";
import {
  FileOpenAction,
  FileOpenWithAction,
  FileCopyPathAction,
  getCommitFileIcon,
  getCommitFileColor,
  getCommitFileStatusText,
  FileQuickLookAction,
} from "../../components/actions/FileActions";
import { useState } from "react";
import { existsSync } from "fs";
import { join } from "path";

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

  return (
    <List
      navigationTitle="Commit Changes"
      searchBarPlaceholder="Search files by name, path..."
      onSelectionChange={(id) => setSelectedFilePath(id)}
      filtering={{ keepSectionOrder: true }}
      isShowingDetail={isShowingDetail}
      actions={
        <ActionPanel>
          <Action
            title={isShowingDetail ? "Hide Diff" : "Show Diff"}
            icon={Icon.AppWindowSidebarLeft}
            onAction={toggleDetail}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />

          {navigationActions}
        </ActionPanel>
      }
    >
      {!commit.changedFiles || commit.changedFiles.length === 0 ? (
        <List.EmptyView
          title="No file changes"
          description="This commit has no file changes."
          icon={Icon.Document}
        />
      ) : (
        <List.Section title={commit.message}>
          {commit.changedFiles.map((file) => (
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
  // Create a unique identifier for each file item
  const fileId = `${file.path}-${commit.hash}`;

  // Only load diff if this file is selected and detail view is showing
  const shouldLoadDiff = isShowingDetail && selectedFilePath === fileId;

  const { diff, isLoading, error } = useGitDiff({
    gitManager,
    options: { file: file.path, commitHash: commit.hash },
    execute: shouldLoadDiff,
  });

  const absolutePath = join(gitManager.repoPath, file.path);
  const fileExists = existsSync(absolutePath);

  return (
    <List.Item
      id={fileId}
      title={file.path.split("/").pop() || file.path}
      subtitle={isShowingDetail ? undefined : file.path}
      icon={{
        source: getCommitFileIcon(file.status),
        tintColor: getCommitFileColor(file.status),
        tooltip: getCommitFileStatusText(file.status),
      }}
      keywords={[file.path, file.oldPath].filter((keyword): keyword is string => Boolean(keyword))}
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            isLoading={isLoading}
            markdown={`${file.path}:\n\n${error ? `Error loading diff: ${error.message}` : (diff ?? "")}`}
          />
        ) : undefined
      }
      quickLook={fileExists ? { path: absolutePath, name: file.path } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={file.path.split("/").pop()}>
            <Action
              title={isShowingDetail ? "Hide Diff" : "Show Diff"}
              icon={Icon.AppWindowSidebarLeft}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <FileOpenAction filePath={absolutePath} />
            <FileOpenWithAction filePath={absolutePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <FileCopyPathAction filePath={absolutePath} />
            <FileQuickLookAction filePath={absolutePath} />
          </ActionPanel.Section>
          {navigationActions}
        </ActionPanel>
      }
    />
  );
}
