import { ActionPanel, Action, Icon, Color, confirmAlert, Alert, showToast, Toast, Form } from "@raycast/api";
import { useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { GitManager } from "../../utils/git-utils";
import { FileStatus, Preferences } from "../../types";
import { existsSync } from "fs";

interface FileActionsProps {
  file: FileStatus;
  gitManager: GitManager;
  onRefresh: () => void;
}

/**
 * Reusable actions for working with files.
 */
export function FileActions({ file, gitManager, onRefresh }: FileActionsProps) {
  const preferences = getPreferenceValues<Preferences>();

  // Check if file actually exists on disk using existsSync
  const fileExistsOnDisk = existsSync(file.path);

  const handleStageFile = async () => {
    try {
      await gitManager.stageFile(file.relativePath);
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const handleUnstageFile = async () => {
    try {
      await gitManager.unstageFile(file.relativePath);
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

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

  // Actions for staged files
  if (file.status === "staged") {
    return (
      <>
        <Action title="Unstage" onAction={handleUnstageFile} icon={Icon.Minus} />
        {fileExistsOnDisk && (
          <>
            <Action.Open
              title="Open File"
              target={file.path}
              application={preferences.defaultEditor}
              icon={Icon.BlankDocument}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.OpenWith title="Open with…" path={file.path} shortcut={{ modifiers: ["cmd", "opt"], key: "o" }} />
            <Action.ShowInFinder
              path={file.path}
              title="Show in Finder"
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </>
        )}
        <Action.CopyToClipboard
          title="Copy Path"
          content={file.relativePath}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      </>
    );
  }

  // Actions for unstaged files (includes former untracked and conflicted files)
  if (file.status === "unstaged") {
    return (
      <>
        <Action
          title={file.type === "conflicted" ? "Stage Resolution" : "Stage"}
          onAction={handleStageFile}
          icon={Icon.Plus}
        />
        {file.type === "added" ? (
          <Action.Trash title="Move to Trash" shortcut={{ modifiers: ["ctrl"], key: "x" }} paths={[file.path]} />
        ) : file.type === "conflicted" ? null : (
          <Action
            title="Discard Changes"
            onAction={handleDiscardChanges}
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        )}
        {fileExistsOnDisk && (
          <>
            <Action.Open
              title="Open File"
              target={file.path}
              application={preferences.defaultEditor}
              icon={Icon.BlankDocument}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.OpenWith title="Open with…" path={file.path} shortcut={{ modifiers: ["cmd", "opt"], key: "o" }} />
            <Action.ShowInFinder
              path={file.path}
              title="Show in Finder"
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </>
        )}
      </>
    );
  }

  return null;
}

/**
 * Actions for committing changes.
 */
export function CommitActions({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const handleStageAll = async () => {
    try {
      await gitManager.stageAll();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const handleUnstageAll = async () => {
    try {
      await gitManager.unstageAll();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

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
    <>
      <Action.Push
        title="Commit Changes"
        icon={Icon.Message}
        target={<CommitForm gitManager={gitManager} onRefresh={onRefresh} />}
      />
      <Action
        title="Stage All Files"
        onAction={handleStageAll}
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      />
      <Action
        title="Unstage All Files"
        onAction={handleUnstageAll}
        icon={Icon.Minus}
        shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
      />
      <Action
        title="Discard All Changes"
        onAction={handleDiscardAll}
        icon={Icon.ArrowCounterClockwise}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
      />
    </>
  );
}

/**
 * Form for creating a commit.
 */
function CommitForm({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const [message, setMessage] = useState("");
  const [amend, setAmend] = useState(false);

  const handleSubmit = async (values: { message: string; amend: boolean }) => {
    if (!values.message || !values.message.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Commit message is required",
      });
      return;
    }

    try {
      await gitManager.commit(values.message.trim(), values.amend);
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={amend ? "Amend Commit" : "Create Commit"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Commit message"
        placeholder="Enter commit message"
        value={message}
        onChange={setMessage}
      />
      <Form.Checkbox id="amend" title="Amend last commit" label="Amend last commit" value={amend} onChange={setAmend} />
    </Form>
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
