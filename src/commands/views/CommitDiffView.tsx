import { ActionPanel, Action, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useGitDiff } from "../../hooks/useGitDiff";
import { GitManager } from "../../utils/git-manager";
import { Commit, CommitFileChange, ListPagination } from "../../types";
import {
  FileOpenAction,
  FileOpenWithAction,
  FileCopyPathAction,
  FileQuickLookAction,
  FileRestoreAction,
  FileHistoryAction,
} from "../../components/actions/FileActions";
import { getCommitFileIcon } from "../../components/icons/StatusIcons";
import { useState, useMemo } from "react";
import { usePromise } from "@raycast/utils";
import { existsSync } from "fs";
import { join } from "path";

interface CommitDiffViewProps {
  index: number;
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  onRefresh: () => void;
  commits: Commit[];
  pagination?: ListPagination;
  onMoveToCommit: (commitHash: string) => void;
}

export function CommitDiffView({ index, gitManager, navigationActions, onRefresh, commits, onMoveToCommit, pagination }: CommitDiffViewProps) {
  const [currentIndex, setCurrentIndex] = useState(index);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const switchToCommit = async (direction: ("parent" | "child")) => {
    let nextIndex = currentIndex;
    switch (direction) {
      case "parent":
        nextIndex = currentIndex + 1;
        break;
      case "child":
        nextIndex = currentIndex - 1;
        break;
    }

    if (nextIndex < 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No more commits",
        message: "This is the last commit in the repository.",
      });
      return;
    }

    if (nextIndex >= commits.length) {
      pagination?.onLoadMore()

      if (!pagination?.hasMore) {
        showToast({
          style: Toast.Style.Failure,
          title: "No more commits",
          message: "This is the last commit in the repository.",
        });
        return;
      }

      switchToCommit(direction);
      return;
    }

    setCurrentIndex(nextIndex);
    onMoveToCommit(commits[nextIndex].hash);
  };

  return (
    <SpecificCommitDiffView
      commit={commits[currentIndex]}
      gitManager={gitManager}
      navigationActions={navigationActions}
      onRefresh={onRefresh}
      onMoveToCommit={switchToCommit}
      isShowingDetail={isShowingDetail}
      setIsShowingDetail={setIsShowingDetail}
    />
  );
}

function SpecificCommitDiffView({
  commit,
  gitManager,
  navigationActions,
  onRefresh,
  onMoveToCommit,
  isShowingDetail,
  setIsShowingDetail,
}: {
  commit: Commit,
  gitManager: GitManager,
  navigationActions: React.ReactNode,
  onRefresh: () => void,
  onMoveToCommit: (direction: ("parent" | "child")) => void
  isShowingDetail: boolean,
  setIsShowingDetail: (isShowingDetail: boolean) => void
}) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const { data: statsMap, isLoading } = usePromise(
    async (repoPath, commitHash) => {
      return await gitManager.getCommitFileStats(commitHash);
    },
    [gitManager.repoPath, commit.hash]
  );

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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title={isShowingDetail ? "Hide Diff" : "Show Diff"}
            icon={Icon.AppWindowSidebarLeft}
            onAction={toggleDetail}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
          <CommitNavigationActions onMoveToCommit={onMoveToCommit} />
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
              statsMap={statsMap}
              onRefresh={onRefresh}
              onMoveToCommit={onMoveToCommit}
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
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  selectedFilePath: string | null;
  statsMap: Record<string, { insertions: number; deletions: number }> | undefined;
  onRefresh: () => void;
  onMoveToCommit: (direction: ("parent" | "child")) => void;
  navigationActions: React.ReactNode;
}

function FileListItem({
  file,
  commit,
  gitManager,
  isShowingDetail,
  onToggleDetail,
  selectedFilePath,
  statsMap,
  onRefresh,
  onMoveToCommit,
  navigationActions,
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

  const accessories = useMemo(() => {
    const accessories: List.Item.Accessory[] = [];
    const stats = statsMap?.[file.path];
    if (stats) {
      if (stats.insertions > 0) {
        accessories.push({ tag: { value: `+${stats.insertions}`, color: Color.Green }, tooltip: "Insertions" });
      }
      if (stats.deletions > 0) {
        accessories.push({ tag: { value: `-${stats.deletions}`, color: Color.Red }, tooltip: "Deletions" });
      }
    }
    return accessories;
  }, [statsMap, file.path]);

  return (
    <List.Item
      id={fileId}
      title={file.path.split("/").pop() || file.path}
      subtitle={isShowingDetail ? undefined : file.path}
      icon={getCommitFileIcon(file)}
      accessories={accessories}
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
            <FileOpenWithAction filePath={absolutePath} />
            <FileCopyPathAction filePath={absolutePath} />
            <FileQuickLookAction filePath={absolutePath} />
            <FileHistoryAction
              filePath={absolutePath}
              gitManager={gitManager}
              onRefresh={onRefresh}
            />
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
          <CommitNavigationActions onMoveToCommit={onMoveToCommit} />
          {navigationActions}
        </ActionPanel>
      }
    />
  );
}

function CommitNavigationActions({ onMoveToCommit }: { onMoveToCommit: (direction: ("parent" | "child")) => void }) {
  return (
    <ActionPanel.Section title="History">
      <Action
        title="Move to Parent Commit"
        icon={Icon.ChevronDown}
        onAction={() => onMoveToCommit("parent")}
        shortcut={{ modifiers: ["cmd"], key: "[" }}
      />
      <Action
        title="Move to Child Commit"
        icon={Icon.ChevronUp}
        onAction={() => onMoveToCommit("child")}
        shortcut={{ modifiers: ["cmd"], key: "]" }}
      />
    </ActionPanel.Section>
  );
}
