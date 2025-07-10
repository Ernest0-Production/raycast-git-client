import { ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert, Form } from "@raycast/api";
import { useState } from "react";
import { Stash } from "../../types";
import { GitManager } from "../../utils/git-utils";

interface StashActionsProps {
  stash: Stash;
  gitManager: GitManager;
  onRefresh: () => void;
}

async function handleStashAction(action: () => Promise<void>, onRefresh: () => void) {
  try {
    await action();
    onRefresh();
  } catch (error) {
    // Git error is already shown by GitManager
  }
}

export function StashActions({ stash, gitManager, onRefresh }: StashActionsProps) {
  const getStashIndex = (ref: string): number => {
    const match = ref.match(/stash@\{(\d+)\}/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const stashIndex = getStashIndex(stash.ref);

  const handleApply = () => handleStashAction(() => gitManager.applyStash(stashIndex), onRefresh);
  const handlePop = () => handleStashAction(() => gitManager.popStash(stashIndex), onRefresh);

  const handleDrop = async () => {
    if (
      await confirmAlert({
        title: "Drop Stash?",
        message: `Are you sure you want to drop "${stash.message}"? This action cannot be undone.`,
        primaryAction: { title: "Drop", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await handleStashAction(() => gitManager.dropStash(stashIndex), onRefresh);
    }
  };

  return (
    <ActionPanel title={`Stash Actions: ${stash.message}`}>
      <ActionPanel.Section title="Stash Operations">
        <Action title="Apply Stash" icon={Icon.Download} onAction={handleApply} />
        <Action title="Pop Stash" icon={Icon.ChevronUp} onAction={handlePop} />
        <Action title="Drop Stash" icon={Icon.Trash} onAction={handleDrop} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
      </ActionPanel.Section>
    </ActionPanel>
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
    />
  );
}

function CreateStashForm({ gitManager, onRefresh, filePath }: { gitManager: GitManager; onRefresh: () => void; filePath?: string }) {
  const [message, setMessage] = useState("");

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
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const formTitle = filePath ? "Stash File" : "Stash Changes";
  const placeholder = filePath
    ? `Describe changes for ${filePath}`
    : "Describe the changes being stashed";

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
      {filePath && (
        <Form.Description text={`This will stash changes for: ${filePath}`} />
      )}
    </Form>
  );
}
