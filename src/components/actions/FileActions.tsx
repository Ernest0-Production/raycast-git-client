import { Action, Icon, Color, confirmAlert, Alert } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { GitManager } from "../../utils/git-utils";
import { FileStatus, Preferences } from "../../types";
import { existsSync } from "fs";
import { CommitMessageForm } from "../../commands/views/CommitMessageView";

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
 * Action for opening a file in default editor.
 */
export function FileOpenAction({ file }: { file: FileStatus }) {
  const preferences = getPreferenceValues<Preferences>();
  const fileExistsOnDisk = existsSync(file.path);

  if (!fileExistsOnDisk) return null;

  return (
    <Action.Open
      title={`Open File in ${preferences.defaultEditor.name}`}
      target={file.path}
      application={preferences.defaultEditor}
      icon={{ fileIcon: preferences.defaultEditor.path }}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
    />
  );
}

/**
 * Action for opening a file with a custom application.
 */
export function FileOpenWithAction({ file }: { file: FileStatus }) {
  const fileExistsOnDisk = existsSync(file.path);

  if (!fileExistsOnDisk) return null;

  return <Action.OpenWith
    title="Open File with…"
    path={file.path}
    shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
  />;
}

/**
 * Action for copying file path to clipboard.
 */
export function FileCopyPathAction({ file }: { file: FileStatus }) {
  return (
    <Action.CopyToClipboard
      title="Copy File Path"
      content={file.relativePath}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
    />
  );
}

/**
 * Action for moving a file to trash.
 */
export function FileMoveToTrashAction({ file, onRefresh }: { file: FileStatus; onRefresh: () => void }) {
  if (file.type !== "added") return null;

  return (
    <Action.Trash
      title="Move File to Trash"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      paths={[file.path]}
      onTrash={onRefresh}
    />
  );
}

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
 * Action for committing staged changes.
 */
export function FileCommitAction({
  gitManager,
  onCommitSuccess,
  hasStagedChanges,
}: {
  gitManager: GitManager;
  onCommitSuccess: () => void;
  hasStagedChanges: boolean;
}) {
  if (!hasStagedChanges) return null;

  return (
    <Action.Push
      title="Commit Changes"
      icon={Icon.Message}
      target={<CommitMessageForm gitManager={gitManager} onFinish={onCommitSuccess} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
    />
  );
}

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
