import { ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Stash } from "../../types";
import { GitManager } from "../../utils/git-utils";

interface StashActionProps {
  stash: Stash;
  index: number;
  gitManager: GitManager;
  onRefresh: () => void;
  onNavigateToStatus?: () => void;
}

/**
 * Action for applying a stash.
 */
export function StashApplyAction({ stash, index, gitManager, onRefresh, onNavigateToStatus }: StashActionProps) {
  const handleApply = async () => {
    if (
      await confirmAlert({
        title: "Apply Stash?",
        message: `Are you sure you want to apply "${stash.message}"?`,
        primaryAction: { title: "Apply", style: Alert.ActionStyle.Default },
      })
    ) {
      try {
        await gitManager.applyStash(index);
        onRefresh();

        // Ask if user wants to drop the applied stash
        if (
          await confirmAlert({
            title: "Drop Applied Stash?",
            message: `Stash "${stash.message}" has been applied. Do you want to drop it?`,
            primaryAction: { title: "Drop", style: Alert.ActionStyle.Destructive },
          })
        ) {
          await gitManager.dropStash(index);
          onRefresh();
        }

        // Automatically switch to StatusView after applying stash
        if (onNavigateToStatus) {
          onNavigateToStatus();
        }
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return <Action title="Apply Stash" icon={Icon.Bookmark} onAction={handleApply} />;
}

/**
 * Action for dropping a stash.
 */
export function StashDropAction({ stash, index, gitManager, onRefresh }: StashActionProps) {
  const handleDrop = async () => {
    if (
      await confirmAlert({
        title: "Drop Stash?",
        message: `Are you sure you want to drop "${stash.message}"? This action cannot be undone.`,
        primaryAction: { title: "Drop", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await gitManager.dropStash(index);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Drop Stash"
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      onAction={handleDrop}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

interface CreateStashActionProps {
  gitManager: GitManager;
  onRefresh: () => void;
  filePath?: string;
}

export function CreateStashAction({ gitManager, onRefresh, filePath }: CreateStashActionProps) {
  const actionTitle = filePath ? "Stash File" : "Stash All Changes";

  return (
    <Action.Push
      title={actionTitle}
      icon={Icon.Bookmark}
      target={<CreateStashForm gitManager={gitManager} onRefresh={onRefresh} filePath={filePath} />}
      shortcut={filePath ? {
        modifiers: ["cmd"], key: "s"
      } : {
        modifiers: ["cmd", "shift"], key: "s"
      }}
    />
  );
}

function CreateStashForm({
  gitManager,
  onRefresh,
  filePath,
}: {
  gitManager: GitManager;
  onRefresh: () => void;
  filePath?: string;
}) {
  const [message, setMessage] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async (values: { message: string }) => {
    try {
      const trimmedMessage = values.message?.trim();

      if (filePath) {
        // Stash specific file
        if (trimmedMessage) {
          await gitManager.stashFile(filePath, trimmedMessage);
        } else {
          const defaultMessage = `Stash changes for ${filePath}`;
          await gitManager.stashFile(filePath, defaultMessage);
        }
      } else {
        // Stash all changes
        if (trimmedMessage) {
          await gitManager.stash(trimmedMessage);
        } else {
          await gitManager.stash();
        }
      }

      onRefresh();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const formTitle = filePath ? "Stash File" : "Stash Changes";
  const placeholder = "Describe the changes being stashed";

  return (
    <Form
      navigationTitle={formTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={formTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="message"
        title="Stash Message"
        placeholder={placeholder}
        info="Optional"
        value={message}
        onChange={setMessage}
      />
      {filePath && <Form.Description text={`This will stash changes for: ${filePath}`} />}
    </Form>
  );
}
