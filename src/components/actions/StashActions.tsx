import { ActionPanel, Action, Icon, confirmAlert, Alert, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Stash } from "../../types";
import { NavigationContext, RepositoryContext } from "../../open-repository";

/**
 * Action for applying a stash.
 */
export function StashApplyAction(context: RepositoryContext & NavigationContext & { stash: Stash, index: number }) {
  const handleApply = async () => {
    if (
      await confirmAlert({
        title: "Apply Stash?",
        message: `Are you sure you want to apply "${context.stash.message}"?`,
        primaryAction: { title: "Apply", style: Alert.ActionStyle.Default },
      })
    ) {
      try {
        await context.gitManager.applyStash(context.index);
        context.status.revalidate();

        // Ask if user wants to drop the applied stash
        if (
          await confirmAlert({
            title: "Drop Applied Stash?",
            message: `Stash "${context.stash.message}" has been applied. Do you want to drop it?`,
            primaryAction: { title: "Drop", style: Alert.ActionStyle.Destructive },
          })
        ) {
          await context.gitManager.dropStash(context.index);
          context.stashes.revalidate();
        }

        // Automatically switch to StatusView after applying stash
        context.navigateTo("status");
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
export function StashDropAction(context: RepositoryContext & NavigationContext & { stash: Stash, index: number }) {
  const handleDrop = async () => {
    if (
      await confirmAlert({
        title: "Drop Stash?",
        message: `Are you sure you want to drop "${context.stash.message}"? This action cannot be undone.`,
        primaryAction: { title: "Drop", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await context.gitManager.dropStash(context.index);
        context.stashes.revalidate();
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

export function StashCreateAction(context: RepositoryContext) {
  return (
    <Action.Push
      title={"Stash Changes"}
      icon={Icon.Bookmark}
      target={<StashCreateForm {...context} />}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
    />
  );
}

function StashCreateForm(context: RepositoryContext) {
  const { pop } = useNavigation();
  const [message, setMessage] = useState("");

  const handleSubmit = async (values: { message: string }) => {
    try {
      await context.gitManager.stash(values.message);
      context.stashes.revalidate();
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
