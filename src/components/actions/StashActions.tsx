import { ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Stash } from "../../types";
import { GitManager } from "../../utils/git-manager";

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
}

export function CreateStashAction({ gitManager, onRefresh }: CreateStashActionProps) {
  return (
    <Action.Push
      title={"Stash Changes"}
      icon={Icon.Bookmark}
      target={<CreateStashForm gitManager={gitManager} onRefresh={onRefresh} />}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
    />
  );
}

function CreateStashForm({
  gitManager,
  onRefresh
}: {
  gitManager: GitManager;
  onRefresh: () => void;
}) {
  const [message, setMessage] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async (values: { message: string }) => {
    try {
      await gitManager.stash(values.message);
      onRefresh();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };


  return (
    <Form
      navigationTitle={"Stash Changes"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Stash Changes"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="message"
        title="Stash Message"
        placeholder="Describe the changes being stashed"
        info="Optional"
        error={message.trim().length === 0 ? "Required" : undefined}
        value={message}
        onChange={setMessage}
      />
    </Form>
  );
}
