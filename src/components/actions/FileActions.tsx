import { Action, Icon, Color, confirmAlert, Alert, Keyboard, getDefaultApplication } from "@raycast/api";
import { GitManager } from "../../utils/git-utils";
import { FileStatus } from "../../types";
import { existsSync } from "fs";

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
      title={file.type === "conflicted" ? "Stage Resolution" : "Stage"}
      onAction={handleStageFile}
      icon={Icon.Plus}
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
      message: `Are you sure you want to discard changes in file "${file.relativePath}"? This action cannot be undone.`,
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
export function FileOpenAction({ filePath, shortcut }: { filePath: string, shortcut?: Keyboard.Shortcut }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.Open
      title={`Open File`}
      target={filePath}
      shortcut={shortcut}
    />
  );
}

/**
 * Action for opening a file with a custom application by absolute path.
 */
export function FileOpenWithAction({ filePath, shortcut }: { filePath: string, shortcut?: Keyboard.Shortcut }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.OpenWith
      title="Open File with…"
      path={filePath}
      shortcut={shortcut}
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
      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
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
      return Icon.Plus;
    case "modified":
      return Icon.Pencil;
    case "deleted":
      return Icon.Trash;
    case "renamed":
      return Icon.ArrowRight;
    case "copied":
      return Icon.Duplicate;
    case "conflicted":
      return Icon.ExclamationMark;
    default:
      return Icon.Document;
  }
};

/**
 * Colors for different types of changes
 */
export const getFileStatusColor = (file: FileStatus) => {
  switch (file.type) {
    case "added":
      return Color.Green;
    case "modified":
      return Color.Yellow;
    case "deleted":
      return Color.Red;
    case "renamed":
      return Color.Purple;
    case "copied":
      return Color.Orange;
    case "conflicted":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
};

/**
 * Icons for commit file changes
 */
export const getCommitFileIcon = (status: string) => {
  switch (status) {
    case "added":
      return Icon.Plus;
    case "modified":
    case "changed":
      return Icon.Pencil;
    case "deleted":
      return Icon.Trash;
    case "renamed":
      return Icon.ArrowsContract;
    case "copied":
      return Icon.Duplicate;
    default:
      return Icon.Document;
  }
};

/**
 * Colors for commit file changes
 */
export const getCommitFileColor = (status: string) => {
  switch (status) {
    case "added":
      return Color.Green;
    case "modified":
    case "changed":
      return Color.Yellow;
    case "deleted":
      return Color.Red;
    case "renamed":
      return Color.Blue;
    case "copied":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
};

/**
 * Status text for commit file changes
 */
export const getCommitFileStatusText = (status: string) => {
  switch (status) {
    case "added":
      return "Added";
    case "modified":
      return "Modified";
    case "changed":
      return "Changed";
    case "deleted":
      return "Deleted";
    case "renamed":
      return "Renamed";
    case "copied":
      return "Copied";
    default:
      return "Unknown";
  }
};
