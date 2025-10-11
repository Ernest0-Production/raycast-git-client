import { Action, Icon, confirmAlert, Alert, ActionPanel, useNavigation, showToast, Toast, Form } from "@raycast/api";
import { Commit } from "../../types";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { RepositoryContext } from "../../open-repository";
import { useState } from "react";

/**
 * Action for creating a tag on a commit.
 */
export function TagCreateAction(context: RepositoryContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Create New Tag"
      target={<TagCreateForm {...context} />}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
    />
  );
}

/**
 * Action for removing a tag from a commit.
 */
export function TagRemoveAction(context: RepositoryContext & { tagName: string }) {
  const handleRemoveTag = async (remote?: string) => {
    const confirmed = await confirmAlert({
      title: "Remove tag",
      message: `Are you sure you want to remove tag "${context.tagName}"?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      if (remote) {
        await context.gitManager.pushTag(context.tagName, remote, true);
      }

      if (Object.keys(context.remotes.data).length === 1) {
        const confirmed = await confirmAlert({
          title: "Delete remote tag",
          message: `Also delete remote tag "${context.tagName}"?`,
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (confirmed) {
          await context.gitManager.pushTag(context.tagName, Object.keys(context.remotes.data)[0], true);
          context.commits.revalidate();
        }
      }

      await context.gitManager.deleteTag(context.tagName);
      context.commits.revalidate();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  if (!context.remotes.data || Object.keys(context.remotes.data).length <= 1) {
    return (
      <Action
        title={`Remove Tag '${context.tagName}'`}
        onAction={() => handleRemoveTag(undefined)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title={`Remove Tag '${context.tagName} from'`}
      icon={Icon.Trash}
    >
      <Action
        title={`Local Only`}
        onAction={() => handleRemoveTag(undefined)}
        icon={Icon.Dot}
      />
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:remove-tag`}
          title={`Local and ${remote}`}
          onAction={() => handleRemoveTag(remote)}
          style={Action.Style.Destructive}
          icon={RemoteHostIcon(context.remotes.data[remote].provider)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for copying tag name to clipboard.
 */
export function TagCopyNameAction({ tagName }: { tagName: string }) {
  return <Action.CopyToClipboard
    title={`Copy Tag Name '${tagName}'`}
    content={tagName} icon={Icon.Clipboard}
  />;
}

function TagCreateForm(context: RepositoryContext & { commit: Commit }) {
  const { pop } = useNavigation();
  const [tagName, setTagName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (remote?: string) => {
    setIsLoading(true);
    try {
      // Create the tag
      await context.gitManager.createTag(tagName.trim(), context.commit.hash, message.trim() || undefined);

      // Show confirmation alert for pushing tags
      const shouldPushTags = await confirmAlert({
        title: "Push tags to remote?",
        message: `Tag "${tagName.trim()}" was created successfully. Do you want to push tags to remote repository?`,
        primaryAction: {
          title: "Push",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Don't Push",
        },
      });

      if (shouldPushTags && remote) {
        await context.gitManager.pushTag(tagName.trim(), remote);
        await showToast({
          style: Toast.Style.Success,
          title: `Tags pushed to ${remote}`,
        });
      }

      // Refresh the commits list
      context.commits.revalidate();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle={`Create Tag on ${context.commit.shortHash}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Create Tag"
            onAction={() => handleSubmit(undefined)}
            icon={Icon.Tag}
          />
          <TagCreateAndPushAction {...context} handleSubmit={(remote) => handleSubmit(remote)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tagName"
        title="Tag Name"
        placeholder="e.g., v1.0.0"
        value={tagName}
        onChange={setTagName}
        error={tagName.trim() === "" ? "Required" : undefined}
      />
      <Form.TextArea
        id="message"
        title="Tag Message"
        placeholder="Release description..."
        value={message}
        onChange={setMessage}
        info="Optional message for annotated tag"
      />
    </Form>
  );
}

function TagCreateAndPushAction(context: RepositoryContext & {
  commit: Commit
  handleSubmit: (remote: string) => void;
}) {
  if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
    return undefined;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Create Tag and Push"
        onAction={() => context.handleSubmit(Object.keys(context.remotes.data)[0])}
        icon={Icon.Tag}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title="Create Tag and Push to"
      icon={Icon.Tag}
    >
      {
        Object.keys(context.remotes.data).map((remote) => (
          <Action
            key={`${remote}:create-tag-and-push`}
            title={remote}
            onAction={() => context.handleSubmit(remote)}
            icon={RemoteHostIcon(context.remotes.data[remote].provider)}
          />
        ))
      }
    </ActionPanel.Submenu >
  );
}
