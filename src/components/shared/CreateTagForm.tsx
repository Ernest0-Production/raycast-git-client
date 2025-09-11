import { Form, Action, ActionPanel, useNavigation, showToast, Toast, confirmAlert, Alert, Icon } from "@raycast/api";
import { useState } from "react";
import { GitManager } from "../../utils/git-utils";
import { Commit } from "../../types";

interface CreateTagFormProps {
  commit: Commit;
  gitManager: GitManager;
  onRefresh: () => void;
}

export function CreateTagForm({ commit, gitManager, onRefresh }: CreateTagFormProps) {
  const { pop } = useNavigation();
  const [tagName, setTagName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
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

      if (shouldPushTags) {
        await gitManager.pushTag(tagName.trim());
        await showToast({
          style: Toast.Style.Success,
          title: "Tags pushed to remote",
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
          <Action title="Create Tag" onAction={handleSubmit} icon={Icon.Tag} />
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
