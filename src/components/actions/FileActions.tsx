import { Action, Icon, Color, confirmAlert, Alert, Keyboard, getDefaultApplication } from "@raycast/api";
import { GitManager } from "../../utils/git-manager";
import { CommitFileChange, FileStatus, StatusState } from "../../types";
import { existsSync } from "fs";
import { CommitMessageForm } from "../../commands/views/CommitMessageView";
import FileHistoryView from "../../commands/views/FileHistoryView";

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
export function FileOpenAction({ filePath, shortcut, onOpen }: { filePath: string, shortcut?: Keyboard.Shortcut, onOpen?: () => void }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.Open
      title="Open"
      target={filePath}
      icon={Icon.Document}
      shortcut={shortcut}
      onOpen={onOpen}
    />
  );
}

/**
 * Action for opening a file with a custom application by absolute path.
 */
export function FileOpenWithAction({ filePath, shortcut, onOpen }: { filePath: string, shortcut?: Keyboard.Shortcut, onOpen?: () => void }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.OpenWith
      path={filePath}
      shortcut={shortcut}
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
  gitManager,
  onContinue,
  onFinish,
}: {
  status: StatusState;
  onContinue?: () => void;
  gitManager: GitManager;
  onFinish: () => void;
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

      case undefined:
        return null;
    }
  }

  if (hasStagedFiles && status.branch) {
    return (
      <Action.Push
        title="Commit Changes"
        icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
        target={<CommitMessageForm gitManager={gitManager} onFinish={onFinish} />}
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

export function FileRestoreAction({ filePath, commit, gitManager, onRefresh }: { filePath: string, commit: string, gitManager: GitManager, onRefresh: () => void }) {
  const handleRestore = async () => {
    const confirmed = await confirmAlert({
      title: "Restore File to This Commit",
      message: `Are you sure you want to restore '${filePath.split("/").pop()}' to commit ${commit}? This will modify the working tree`,
      primaryAction: {
        title: "Restore",
        style: Alert.ActionStyle.Destructive
      },
    });

    if (!confirmed) return;
    try {
      await gitManager.restoreFileToCommit(filePath, commit);
      onRefresh();
    } catch (error) {
      // Error toast is shown by GitManager
    }
  };

  return (
    <Action
      title="Restore File to This Commit"
      icon={Icon.RotateClockwise}
      style={Action.Style.Destructive}
      onAction={handleRestore}
    />
  );
}

export function FileHistoryAction({ filePath, gitManager, onRefresh, onOpen }: { filePath: string, gitManager: GitManager, onRefresh: () => void, onOpen?: () => void }) {
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

// === Utility functions ===

/**
 * Icons for different types of changes
 */
export const getFileStatusIcon = (file: FileStatus) => {
  switch (file.type) {
    case "added":
      return { source: `plus-square.svg`, tintColor: Color.Green, tooltip: "Added" };
    case "modified":
      return { source: `square-pen.svg`, tintColor: Color.Yellow, tooltip: "Modified" };
    case "deleted":
      return { source: `square-minus.svg`, tintColor: Color.Red, tooltip: "Deleted" };
    case "renamed":
      return { source: `square-arrow-right-filled.svg`, tintColor: Color.Blue, tooltip: "Moved from " + file.oldPath };
    case "copied":
      return { source: `copy.svg`, tintColor: Color.Purple, tooltip: "Copied" };
    case "conflicted":
      return { source: `alert-square-filled.svg`, tintColor: Color.Red, tooltip: "Conflicted" };
    default:
      return { source: Icon.Document, tintColor: Color.SecondaryText, tooltip: "Unknown" };
  }
};

/**
 * Icons for commit file changes
 */
export const getCommitFileIcon = (change: CommitFileChange) => {
  switch (change.status) {
    case "added":
      return { source: `plus-square.svg`, tintColor: Color.Green, tooltip: "Added" };
    case "modified":
    case "changed":
      return { source: `square-pen.svg`, tintColor: Color.Yellow, tooltip: "Modified" };
    case "deleted":
      return { source: `square-minus.svg`, tintColor: Color.Red, tooltip: "Deleted" };
    case "renamed":
      return { source: `square-arrow-right-filled.svg`, tintColor: Color.Blue, tooltip: "Moved from " + change.oldPath };
    case "copied":
      return { source: `copy.svg`, tintColor: Color.Purple, tooltip: "Copied" };
    default:
      return { source: Icon.Document, tintColor: Color.SecondaryText, tooltip: "Unknown" };
  }
};
