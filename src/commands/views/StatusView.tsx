import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useGitDiff } from "../../hooks/useGitDiff";
import { FileManagerActions } from "../../components/actions/FileActions";
import { FileStatusIcon } from "../../components/icons/StatusIcons";
import { StashCreateAction } from "../../components/actions/StashActions";
import { FileStatus } from "../../types";
import { useMemo, useState } from "react";
import { existsSync } from "fs";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../../components/actions/WorkspaceNavigationActions";
import { PatchApplyAction, PatchCreateAction } from "../../components/actions/PatchActions";
import { CommitAction, ConflictAbortAction, FileDiscardAction, FileDiscardAllAction, FileStageAction, FileStageAllAction, FileUnstageAction, FileUnstageAllAction } from "../../components/actions/StatusActions";
import { FileHistoryAction } from "./FileHistoryView";
import { ToggleDetailAction, ToggleDetailController, useToggleDetail } from "../../components/actions/ToggleDetailAction";
import { basename } from "path";

export function StatusView(context: RepositoryContext & NavigationContext) {
  const toggleController = useToggleDetail("Status Diff", "Changes", false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const stagedFiles = context.status.data?.files ? context.status.data.files.filter((f) => f.status === "staged") : [];
  const unstagedFiles = context.status.data?.files ? context.status.data.files.filter((f) => f.status === "unstaged" || f.status === "untracked") : [];

  const navigationTitle = useMemo(() => {
    if (context.status.data?.conflict) {
      switch (context.status.data.conflict.type) {
        case "rebase":
          return `⚠️ Rebase Conflict (${context.status.data.conflict.current}/${context.status.data.conflict.total})`;
        case "merge":
          return `⚠️ Merge Conflict (${context.status.data.conflict.current}/${context.status.data.conflict.total})`;
        case "squash":
          return `Squashing Commit`;
        default:
          return "⚠️ Conflict";
      }
    } else {
      return "Repository Status";
    }
  }, [context.status.data?.conflict]);

  return (
    <List
      isLoading={context.status.isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search files by name, path..."
      onSelectionChange={(id) => setSelectedFilePath(id)}
      filtering={{ keepSectionOrder: true }}
      isShowingDetail={toggleController.isShowingDetail}
      searchBarAccessory={
        WorkspaceNavigationDropdown(context)
      }
      actions={
        <ActionPanel>
          {context.status.data && context.branches.data.currentBranch && (
            <CommitAction {...context} />
          )}

          <ActionPanel.Section>
            <ToggleDetailAction controller={toggleController} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Patch">
            <PatchApplyAction {...context} />
          </ActionPanel.Section>

          {context.status.data && (
            <ConflictAbortAction {...context} />
          )}
          <ActionPanel.Section title="Workspace">
            <Action
              title="Refresh"
              onAction={context.status.revalidate}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    >
      {context.status.error ? (
        <List.EmptyView
          title="Error loading status"
          description={context.status.error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Workspace">
                <Action
                  title="Refresh"
                  onAction={context.status.revalidate}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>

              <ToggleDetailAction controller={toggleController} />
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : (!context.status.isLoading && context.status.data.files.length === 0) ? (
        <List.EmptyView
          title="No changes"
          description="No changes in the repository. The working directory is clean."
          icon={Icon.NewDocument}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                onAction={context.status.revalidate}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <ToggleDetailAction controller={toggleController} />

              <ActionPanel.Section title="Patch">
                <PatchApplyAction {...context} />
              </ActionPanel.Section>

              {context.status.data && (
                <ConflictAbortAction {...context} />
              )}

              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {unstagedFiles.length > 0 && (
            <List.Section title="Unstaged Files" subtitle={`${unstagedFiles.length}`}>
              {unstagedFiles.map((file) => (
                <FileListItem
                  key={file.path}
                  file={file}
                  toggleController={toggleController}
                  selectedFilePath={selectedFilePath}
                  {...context}
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
                  toggleController={toggleController}
                  selectedFilePath={selectedFilePath}
                  {...context}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function FileListItem(context: NavigationContext & RepositoryContext & {
  file: FileStatus;
  selectedFilePath: string | null;
  toggleController: ToggleDetailController;
}) {
  // Create a unique identifier for each file item
  const fileId = `${context.file.relativePath}-${context.file.status}`;

  // Only load diff if this file is selected and detail view is showing
  const isFocused = context.toggleController.isShowingDetail && context.selectedFilePath === fileId;

  const { diff, isLoading } = useGitDiff({
    gitManager: context.gitManager,
    options: { file: context.file.relativePath, status: context.file.status },
    execute: isFocused,
  });

  return (
    <List.Item
      id={fileId}
      title={basename(context.file.path)}
      subtitle={context.toggleController.isShowingDetail ? undefined : {
        value: context.file.relativePath,
        tooltip: context.file.relativePath
      }}
      icon={FileStatusIcon(context.file)}
      keywords={[context.file.path, context.file.oldPath].filter((keyword): keyword is string => Boolean(keyword))}
      detail={
        context.toggleController.isShowingDetail ? (
          <List.Item.Detail isLoading={isLoading} markdown={`${context.file.relativePath}:\n\n${diff ?? ""}`} metadata />
        ) : undefined
      }
      quickLook={existsSync(context.file.path) ? { path: context.file.path, name: context.file.relativePath } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={basename(context.file.path)}>
            {/* Actions for staged files */}
            {context.file.status === "staged" && (
              <>
                <FileUnstageAction {...context} />
                <ToggleDetailAction controller={context.toggleController} />
                <FileManagerActions filePath={context.file.path} />
              </>
            )}

            {/* Actions for unstaged/untracked files */}
            {(context.file.status === "unstaged" || context.file.status === "untracked") && (
              <>
                <FileStageAction {...context} />
                <ToggleDetailAction controller={context.toggleController} />
                <FileManagerActions filePath={context.file.path} />
                {context.file.type !== "conflicted" && (
                  <FileDiscardAction {...context} />
                )}
              </>
            )}
            <FileHistoryAction
              filePath={context.file.path}
              {...context}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {context.branches.data.currentBranch && (
              <CommitAction {...context} />
            )}
            <ConflictAbortAction {...context} />
            <FileStageAllAction {...context} />
            <FileUnstageAllAction {...context} />
            <FileDiscardAllAction {...context} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Patch">
            <PatchCreateAction {...context} />
            <PatchApplyAction {...context} />
          </ActionPanel.Section>

          <StashCreateAction {...context} />

          <ActionPanel.Section title="Workspace">
            <Action
              title="Refresh"
              onAction={context.status.revalidate}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}
