import { Action, Icon, Color, confirmAlert, Alert, Keyboard, ActionPanel, Form, useNavigation, Clipboard } from "@raycast/api";
import { GitManager } from "../../utils/git-manager";
import { Branch, CommitFileChange, FileStatus, PatchScope, StatusState } from "../../types";
import { existsSync } from "fs";
import { CommitMessageForm } from "../../commands/views/CommitMessageView";
import FileHistoryView from "../../commands/views/FileHistoryView";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { RemotesHosts } from "../../hooks/useGitRemotes";

interface FileActionProps {
  file: FileStatus;
  gitManager: GitManager;
  onRefresh: () => void;
}

/**
 * Action for staging a file.
 */
export function FileStageAction({ file, gitManager, onRefresh }: FileActionProps) {
  const handleStageFile = async () => {
    try {
      await gitManager.stageFile(file.relativePath);
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title={file.type === "conflicted" ? "Mark as Resolved" : "Stage"}
      onAction={handleStageFile}
      icon={file.type === "conflicted" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Plus}
    />
  );
}

/**
 * Action for unstaging a file.
 */
export function FileUnstageAction({ file, gitManager, onRefresh }: FileActionProps) {
  const handleUnstageFile = async () => {
    try {
      await gitManager.unstageFile(file.relativePath);
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return <Action title="Unstage" onAction={handleUnstageFile} icon={Icon.Minus} />;
}

/**
 * Action for discarding changes to a file.
 */
export function FileDiscardAction({ file, gitManager, onRefresh }: FileActionProps) {
  if (!existsSync(file.path)) return null;

  const handleDiscardChanges = async () => {
    const confirmed = await confirmAlert({
      title: "Discard changes",
      message: `Are you sure you want to discard changes in file "${file.path.split("/").pop()}"? This action cannot be undone.`,
      primaryAction: {
        title: "Discard changes",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await gitManager.discardChanges(file.relativePath);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Discard Changes"
      onAction={handleDiscardChanges}
      icon={Icon.ArrowCounterClockwise}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

/**
 * Action for opening a file in default editor by absolute path.
 */
export function FileOpenAction({ filePath, onOpen }: { filePath: string, onOpen?: () => void }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.Open
      title="Open"
      target={filePath}
      icon={Icon.Document}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onOpen={onOpen}
    />
  );
}

/**
 * Action for opening a file with a custom application by absolute path.
 */
export function FileOpenWithAction({ filePath, onOpen }: { filePath: string, onOpen?: () => void }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.OpenWith
      path={filePath}
      shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
      onOpen={onOpen}
    />
  );
}

export function FileQuickLookAction({ filePath }: { filePath: string }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.ToggleQuickLook
      shortcut={{ modifiers: ["cmd"], key: "y" }}
    />
  );
}

/**
 * Action for copying file path to clipboard.
 */
export function FileCopyPathAction({ filePath }: { filePath: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy File Path"
      content={filePath}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
    />
  );
}

/**
 * Action for moving a file to trash.
 */
export function FileMoveToTrashAction({
  filePath,
  isAddedFile,
  onRefresh
}: {
  filePath: string;
  isAddedFile: boolean;
  onRefresh: () => void;
}) {
  if (!isAddedFile || !existsSync(filePath)) return null;

  return (
    <Action.Trash
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      paths={[filePath]}
      onTrash={onRefresh}
    />
  );
}

/**
 * Action to commit changes or continue a rebase/merge.
 */
export function FileCommitAction({
  status,
  currentBranch,
  gitManager,
  onContinue,
  onFinish,
  remotesHosts,
}: {
  status: StatusState;
  currentBranch: Branch;
  onContinue?: () => void;
  gitManager: GitManager;
  onFinish: () => void;
  remotesHosts?: RemotesHosts;
}) {
  const hasStagedFiles = status.files.some((f) => f.status === "staged");
  const hasConflictedFiles = status.files.some((f) => f.type === "conflicted");

  if (status.conflict) {
    if (hasConflictedFiles) {
      return null; // Don't show if there are still conflicts
    }

    switch (status.conflict.type) {
      case "rebase":
        const handleContinueRebase = async () => {
          try { await gitManager.continueRebase(); }
          // Git error is already shown by GitManager
          catch (error) { }
          onContinue?.();
        };
        return <
          Action title="Continue Rebase"
          onAction={handleContinueRebase}
          icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />;

      case "merge":
        const handleCommitMerge = async () => {
          try { await gitManager.commitMerge(); }
          // Git error is already shown by GitManager
          catch (error) { }
          onFinish();
        };

        return <Action
          title="Commit Merge"
          onAction={handleCommitMerge}
          icon={{ source: Icon.Check, tintColor: Color.Green }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />;

      case "squash":
        // It should be regular commit
        break;

      case undefined:
        return null;
    }
  }

  if (hasStagedFiles && status.branch) {
    return (
      <Action.Push
        title="Commit Changes"
        icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
        target={
          <CommitMessageForm
            gitManager={gitManager}
            onFinish={onFinish}
            currentBranch={currentBranch}
            remotesHosts={remotesHosts}
          />
        }
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      />
    );
  }

  return null;
}

/**
 * Action to abort a rebase or merge.
 */
export function FileConflictAbortAction({
  status,
  gitManager,
  onRefresh,
}: {
  status: StatusState;
  gitManager: GitManager;
  onRefresh: () => void;
}) {
  if (!status.conflict) {
    return null;
  }

  switch (status.conflict?.type) {
    case "rebase":
      return (
        <Action
          title="Abort Rebase"
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Abort Rebase",
              message: "Are you sure you want to abort the rebase? This action cannot be undone.",
              primaryAction: {
                title: "Abort Rebase",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (confirmed) {
              await gitManager.abortRebase();
              onRefresh();
            }
          }}
          icon={Icon.XMarkCircleHalfDash}
          style={Action.Style.Destructive}
        />
      );
    case "merge":
    case undefined:
      return (
        <Action
          title="Abort Merge"
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Abort Merge",
              message: "Are you sure you want to abort the merge? This action cannot be undone.",
              primaryAction: {
                title: "Abort Merge",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (confirmed) {
              await gitManager.abortMerge();
              onRefresh();
            }
          }}
          icon={Icon.XMarkCircleHalfDash}
          style={Action.Style.Destructive}
        />
      );
  }
}

export function FileRestoreAction({ filePath, before = false, commit, gitManager, onRefresh }: { filePath: string, before?: boolean, commit: string, gitManager: GitManager, onRefresh: () => void }) {
  const handleRestore = async () => {
    const confirmed = await confirmAlert({
      title: before ? "Restore File to Before Commit" : "Restore File to This Commit",
      message: `Are you sure you want to restore '${filePath.split("/").pop()}' to commit ${commit}? This will modify the working tree`,
      primaryAction: {
        title: "Restore",
        style: Alert.ActionStyle.Destructive
      },
    });

    if (!confirmed) return;
    try {
      await gitManager.restoreFileToCommit(filePath, before ? `${commit}^` : commit);
      onRefresh();
    } catch (error) {
      // Error toast is shown by GitManager
    }
  };

  return (
    <Action
      title={before ? "Restore File to Before Commit" : "Restore File to This Commit"}
      icon={Icon.RotateClockwise}
      style={Action.Style.Destructive}
      onAction={handleRestore}
    />
  );
}

export function FileHistoryAction({ filePath, gitManager, remotesHosts, onRefresh, onOpen }: { filePath: string, gitManager: GitManager, remotesHosts: RemotesHosts, onRefresh: () => void, onOpen?: () => void }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.Push
      title="Show File History"
      icon={Icon.Clock}
      onPush={onOpen}
      target={
        <FileHistoryView
          gitManager={gitManager}
          filePath={filePath}
          remotesHosts={remotesHosts}
          onRefresh={onRefresh}
        />
      }
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
    />
  );
}

// === Bulk actions ===

/**
 * Action for staging all files.
 */
export function FileStageAllAction({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const handleStageAll = async () => {
    try {
      await gitManager.stageAll();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Stage All Files"
      onAction={handleStageAll}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );
}

/**
 * Action for unstaging all files.
 */
export function FileUnstageAllAction({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const handleUnstageAll = async () => {
    try {
      await gitManager.unstageAll();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Unstage All Files"
      onAction={handleUnstageAll}
      icon={Icon.Minus}
      shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
    />
  );
}

/**
 * Action for discarding all changes.
 */
export function FileDiscardAllAction({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const handleDiscardAll = async () => {
    const confirmed = await confirmAlert({
      title: "Discard All Changes",
      message: "Are you sure you want to discard all unstaged changes? This action cannot be undone.",
      primaryAction: {
        title: "Discard All Changes",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await gitManager.discardAllChanges();
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Discard All Changes"
      onAction={handleDiscardAll}
      icon={Icon.ArrowCounterClockwise}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl", "cmd"], key: "x" }}
    />
  );
}

/**
 * Action for refreshing repository status.
 */
export function FileRefreshStatusAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh Status"
      onAction={onRefresh}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}

/**
 * Action to create a patch for all unstaged changes.
 */
export function CreatePatchAction({ gitManager }: { gitManager: GitManager }) {
  return (
    <ActionPanel.Submenu
      title="Save as Patch"
      icon={`patch.svg`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
    >
      <Action.Push
        title="All Changes"
        target={<CreatePatchForm scope={PatchScope.ALL} gitManager={gitManager} />}
      />
      <Action.Push
        title="Only Staged"
        target={<CreatePatchForm scope={PatchScope.STAGED} gitManager={gitManager} />}
      />
      <Action.Push
        title="Only Unstaged"
        target={<CreatePatchForm scope={PatchScope.UNSTAGED} gitManager={gitManager} />}
      />
    </ActionPanel.Submenu>
  );
}

function CreatePatchForm({ scope, gitManager }: { scope: PatchScope, gitManager: GitManager }) {
  const { pop } = useNavigation();
  const [directoryPath, setDirectoryPath] = useCachedState<string[]>(`patches-directory`, []);

  const validateDirectoryPath = (directoryPath: string[]) => {
    if (directoryPath.length === 0) {
      return "Required";
    }

    if (!existsSync(directoryPath[0])) {
      return "Not exists";
    }

    return undefined;
  };

  const handleSubmit = async (values: { directoryPath: string[] }) => {
    try {
      const patchPath = await gitManager.createPatch(values.directoryPath[0], scope);
      await Clipboard.copy(patchPath);
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
      navigationTitle="Create Patch"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Patch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directoryPath"
        title="Output Directory"
        value={directoryPath}
        error={validateDirectoryPath(directoryPath)}
        onChange={setDirectoryPath}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

export function ApplyPatchAction({ gitManager, onRefresh }: { gitManager: GitManager, onRefresh: () => void }) {
  return (
    <Action.Push
      title="Apply Patch"
      icon={Icon.Download}
      target={<ApplyPatchForm gitManager={gitManager} onRefresh={onRefresh} />}
    />
  );
}

export function ApplyPatchForm({ gitManager, onRefresh }: { gitManager: GitManager, onRefresh: () => void }) {
  const { pop } = useNavigation();
  const [patchFilePath, setPatchFilePath] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const content = await Clipboard.read();
      if (!content.file) return;
      const filePath = decodeURIComponent(content.file).replace('file://', '');

      if (filePath.endsWith(".patch") && existsSync(filePath)) {
        setPatchFilePath([filePath]);
      }
    })();
  }, []);

  const handleSubmit = async (values: { patchFilePath: string[] }) => {
    try {
      const confirmed = await confirmAlert({
        title: "Apply Patch",
        message: "Are you sure you want to apply the patch? This action cannot be undone.",
        primaryAction: {
          title: "Apply",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        await gitManager.applyPatch(patchFilePath[0]);
        onRefresh();
        pop();
      }
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
      navigationTitle="Apply Patch"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Patch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="patchFilePath"
        title="Patch File"
        value={patchFilePath}
        error={patchFilePath.length === 0 ? "Required" : undefined}
        info="It should be a '.patch' file"
        onChange={setPatchFilePath}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
      />
    </Form>
  );
}
