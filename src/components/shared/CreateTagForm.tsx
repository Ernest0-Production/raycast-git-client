import { Form, Action, ActionPanel, useNavigation, showToast, Toast, confirmAlert, Alert, Icon } from "@raycast/api";
import { useState } from "react";
import { GitManager } from "../../utils/git-manager";
import { Commit } from "../../types";
import { RemotesHosts } from "../../hooks/useGitRemotes";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";

interface CreateTagFormProps {
  commit: Commit;
  gitManager: GitManager;
  onRefresh: () => void;
  remotesHosts: RemotesHosts;
}

export function CreateTagForm({ commit, gitManager, onRefresh, remotesHosts }: CreateTagFormProps) {
  const { pop } = useNavigation();
  const [tagName, setTagName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (remote?: string) => {
    setIsLoading(true);
    try {
      // Create the tag
      await gitManager.createTag(tagName.trim(), commit.hash, message.trim() || undefined);

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
        await gitManager.pushTag(tagName.trim(), remote);
        await showToast({
          style: Toast.Style.Success,
          title: `Tags pushed to ${remote}`,
        });
      }

      // Refresh the commits list
      onRefresh();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle={`Create Tag on ${commit.shortHash}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Create Tag"
            onAction={() => handleSubmit(undefined)}
            icon={Icon.Tag}
          />
          <TagCreateAndPushAction
            commit={commit}
            handleSubmit={(remote) => handleSubmit(remote)}
            remoteHosts={remotesHosts}
          />
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

function TagCreateAndPushAction({
  commit,
  handleSubmit,
  remoteHosts
}: {
  commit: Commit;
  handleSubmit: (remote: string) => void;
  remoteHosts: RemotesHosts;
}) {
  if (!remoteHosts || Object.keys(remoteHosts).length === 0) {
    return undefined;
  }

  if (Object.keys(remoteHosts).length === 1) {
    return (
      <Action
        title="Create Tag and Push"
        onAction={() => handleSubmit(Object.keys(remoteHosts)[0])}
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
        Object.keys(remoteHosts).map((remote) => (
          <Action
            key={`${remote}:create-tag-and-push`}
            title={remote}
            onAction={() => handleSubmit(remote)}
            icon={RemoteHostIcon(remoteHosts[remote].provider)}
          />
        ))
      }
    </ActionPanel.Submenu >
  );
}
