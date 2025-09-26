import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useGitDiff } from "../../hooks/useGitDiff";
import { GitManager } from "../../utils/git-manager";
import { Commit, CommitFileChange } from "../../types";
import {
  FileOpenAction,
  FileOpenWithAction,
  FileCopyPathAction,
  getCommitFileIcon,
  FileQuickLookAction,
  FileRestoreAction,
  FileHistoryAction,
} from "../../components/actions/FileActions";
import { useState, useMemo } from "react";
import { usePromise } from "@raycast/utils";
import { existsSync } from "fs";
import { join } from "path";

interface CommitDiffViewProps {
  commit: Commit;
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  onRefresh: () => void;
}

export function CommitDiffView({ commit, gitManager, navigationActions, onRefresh }: CommitDiffViewProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const { data: statsMap, isLoading } = usePromise(
    async (repoPath, commitHash) => {
      return await gitManager.getCommitFileStats(commitHash);
    },
    [gitManager.repoPath, commit.hash],
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
  statsMap: Record<string, { insertions: number; deletions: number }> | undefined;
  onRefresh: () => void;
}

function FileListItem({
  file,
  commit,
  gitManager,
  navigationActions,
  isShowingDetail,
  onToggleDetail,
  selectedFilePath,
  statsMap,
  onRefresh,
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
          </ActionPanel.Section>
          {navigationActions}
        </ActionPanel>
      }
    />
  );
}
