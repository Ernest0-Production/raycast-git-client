import { ActionPanel, Action, Icon, Color, confirmAlert, Alert, showToast, Toast, Form, environment, popToRoot, AI } from "@raycast/api";
import { useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
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
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
      </>
    );
  }

  // Actions for unstaged files (includes former untracked and conflicted files)
  if (file.status === "unstaged" || file.status === "untracked") {
    return (
      <>
        <Action
          title={file.type === "conflicted" ? "Stage Resolution" : "Stage"}
          onAction={handleStageFile}
          icon={Icon.Plus}
        />
        {file.type === "added" ? (
          <Action.Trash
            title="Move to Trash"
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            paths={[file.path]}
            onTrash={onRefresh}
          />
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
 * Form for creating a commit with AI generation support.
 */
function CommitForm({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const preferences = getPreferenceValues<Preferences>();
  const [draftMessage, setDraftMessage] = useCachedState(`commit-draft-${gitManager.repoPath}`, "");
  const [amend, setAmend] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const clearDraft = () => {
    setDraftMessage("");
  };

    const generateCommitMessage = async () => {
    try {
      setIsGenerating(true);
      
      // Get staged changes diff
      const diff = await gitManager.getDiff({ staged: true });
      if (!diff || diff.trim() === "") {
        await showToast({
          style: Toast.Style.Failure,
          title: "No staged changes",
          message: "Please stage some changes before generating commit message."
        });
        return;
      }

      // Check if AI is available and use it
      try {
        const prompt = `${preferences.aiCommitPrompt}

Git diff:
${diff}`;

        const aiResponse = await AI.ask(prompt);
        setDraftMessage(aiResponse.trim());
        
        await showToast({
          style: Toast.Style.Success,
          title: "Commit message generated",
          message: "AI generated commit message. Review and edit as needed."
        });
      } catch (aiError) {
        // Fallback: AI not available, show manual generation prompt
        await showToast({
          style: Toast.Style.Failure,
          title: "AI not available",
          message: "Raycast AI is not available. Please enter commit message manually."
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate commit message",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async (push = false, forcePush = false) => {
    if (!draftMessage || !draftMessage.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Commit message is required",
      });
      return;
    }

    // Confirm force push if requested
    if (push && forcePush) {
      const confirmed = await confirmAlert({
        title: "Force Push Confirmation",
        message: "Force push will rewrite Git history on the remote repository. This can cause problems for other collaborators. Are you sure you want to continue?",
        primaryAction: {
          title: "Force Push",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!confirmed) {
        return;
      }
    }

    try {
      // Commit changes
      await gitManager.commit(draftMessage.trim(), amend);
      
      // Clear draft after successful commit
      clearDraft();
      
      // Push if requested
      if (push) {
        await gitManager.push(forcePush);
      }
      
      onRefresh();
      await popToRoot();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const handleSubmit = async (values: { message: string; amend: boolean }) => {
    setDraftMessage(values.message);
    await handleCommit();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Commit Actions">
            <Action.SubmitForm 
              title={amend ? "Amend Commit" : "Create Commit"} 
              onSubmit={handleSubmit}
              icon={Icon.CheckCircle}
            />
            <Action
              title={amend ? "Amend and Push" : "Commit and Push"}
              onAction={() => handleCommit(true, false)}
              icon={Icon.Upload}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
            <Action
              title={amend ? "Amend and Force Push" : "Commit and Force Push"}
              onAction={() => handleCommit(true, true)}
              icon={Icon.ExclamationMark}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          </ActionPanel.Section>

                     <ActionPanel.Section title="AI Assistant">
             <Action
               title="Generate Commit Message"
               onAction={generateCommitMessage}
               icon={Icon.Wand}
               shortcut={{ modifiers: ["cmd"], key: "g" }}
               isLoading={isGenerating}
             />
           </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Commit message"
        placeholder="Enter commit message or use AI generation..."
        value={draftMessage}
        onChange={setDraftMessage}
        info="Draft is automatically saved and will be cleared after successful commit"
      />
      <Form.Checkbox 
        id="amend" 
        title="Amend last commit" 
        label="Amend last commit" 
        value={amend} 
        onChange={setAmend}
        info="Modify the last commit instead of creating a new one"
      />
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
