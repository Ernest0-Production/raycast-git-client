import { Action, Icon, confirmAlert, Alert, ActionPanel, useNavigation, showToast, Toast, Form } from "@raycast/api";
import { Commit } from "../../types";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { CommitDetailsByRefView } from "../../commands/views/CommitDetailsView";
import { useState } from "react";

/**
 * Action for creating a tag on a commit.
 */
export function TagCreateAction(context: RepositoryContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Create Tag"
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
      title: "Push tag deletion to remote?",
      message: `Are you sure you want to push tag deletion to remote?`,
      primaryAction: {
        title: "Push",
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
          title: "Remove tag",
          message: `Are you sure you want to remove tag "${context.tagName}"?`,
          primaryAction: {
            title: "Remove",
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
      context.tags?.revalidate();
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

/**
 * Action for checking out a tag. If remoteName provided, fetches the tag first.
 */
export function TagCheckoutAction(context: RepositoryContext & NavigationContext & { tagName: string; remoteName?: string }) {
  const handleCheckout = async () => {
    const confirmed = await confirmAlert({
      title: "Checkout tag",
      message: `Are you sure you want to checkout tag "${context.tagName}"${context.remoteName ? ` from ${context.remoteName}` : ""}?`,
      primaryAction: { title: "Checkout", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;
    try {
      if (context.remoteName) {
        await context.gitManager.fetchTag(context.remoteName, context.tagName);
      }
      await context.gitManager.checkoutTag(context.tagName);
      context.branches.revalidate();
      context.status.revalidate();
      context.commits.revalidate();
      context.navigateTo("status");
    } catch (error) {
      // Git error already displayed by GitManager
    }
  };

  return (
    <Action title="Checkout" onAction={handleCheckout} icon={`arrow-checkout.svg`} />
  );
}

/**
 * Action for pushing a tag to remote(s).
 */
export function TagPushAction(context: RepositoryContext & { tagName: string }) {
  const handlePush = async (remote: string) => {
    try {
      await context.gitManager.pushTag(context.tagName, remote);
      context.tags?.revalidate();
    } catch (error) {
      // Git error already displayed by GitManager
    }
  };

  const remotes = Object.keys(context.remotes.data || {});
  if (remotes.length === 0) return undefined;
  if (remotes.length === 1) {
    return (
      <Action title="Push Tag" icon={Icon.Upload} onAction={() => handlePush(remotes[0])} />
    );
  }
  return (
    <ActionPanel.Submenu title="Push Tag to" icon={Icon.Upload}>
      {remotes.map((remote) => (
        <Action
          key={`${remote}:push-tag`}
          title={remote}
          icon={RemoteHostIcon(context.remotes.data[remote].provider)}
          onAction={() => handlePush(remote)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for renaming a local tag with optional remote propagation.
 */
export function TagRenameAction(context: RepositoryContext & { tagName: string }) {
  return (
    <Action.Push title="Rename Tag" icon={Icon.Pencil} target={<TagRenameForm {...context} />} />
  );
}

function TagRenameForm(context: RepositoryContext & { tagName: string }) {
  const { pop } = useNavigation();
  const [newName, setNewName] = useState(context.tagName);
  const [isLoading, setIsLoading] = useState(false);
  const remoteNames = Object.keys(context.remotes.data || {});
  const [pushToRemotes, setPushToRemotes] = useState<Record<string, boolean>>({});

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await context.gitManager.renameTag(context.tagName, newName);
      for (const remote of remoteNames) {
        if (pushToRemotes[remote]) {
          await context.gitManager.pushTag(newName, remote);
          await context.gitManager.pushTag(context.tagName, remote, true);
        }
      }
      context.tags?.revalidate();
      context.commits.revalidate();
      pop();
    } catch (error) {
      // Git error already displayed by GitManager
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle={`Rename Tag '${context.tagName}'`}
      isLoading={isLoading}
      actions={<ActionPanel><Action title="Rename Tag" onAction={handleSubmit} /></ActionPanel>}
    >
      <Form.TextField id="newTagName" title="New Tag Name" value={newName} onChange={setNewName} placeholder="v1.0.1" />
      {remoteNames.length > 0 && (
        <Form.Description text="Select remotes to push new tag and delete old" />
      )}
      {remoteNames.map((remote) => (
        <Form.Checkbox
          key={`rename-remote-${remote}`}
          id={`rename-remote-${remote}`}
          label={`Update on ${remote}`}
          value={!!pushToRemotes[remote]}
          onChange={(val) => setPushToRemotes((prev) => ({ ...prev, [remote]: val }))}
        />
      ))}
    </Form>
  );
}

/**
 * Action to open commit details for a tag.
 */
export function TagOpenCommitAction(context: RepositoryContext & NavigationContext & { tagName: string }) {
  return (
    <Action.Push title="View Tagged Commit" icon={Icon.Document} target={<CommitDetailsByRefView refName={context.tagName} {...context} />} />
  );
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
