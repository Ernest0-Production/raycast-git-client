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
}

export function CreateStashAction({ gitManager, onRefresh }: CreateStashActionProps) {
  return (
    <Action.Push
      title="Stash Changes"
      icon={Icon.Box}
      target={<CreateStashForm gitManager={gitManager} onRefresh={onRefresh} />}
    />
  );
}

function CreateStashForm({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const [message, setMessage] = useState("");

  const handleSubmit = async (values: { message: string }) => {
    try {
      if (values.message && values.message.trim()) {
        await gitManager.stash(values.message.trim());
      } else {
        await gitManager.stash();
      }
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Stash Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="message"
        title="Stash Message (Optional)"
        placeholder="Describe the changes being stashed"
        value={message}
        onChange={setMessage}
      />
    </Form>
  );
}
