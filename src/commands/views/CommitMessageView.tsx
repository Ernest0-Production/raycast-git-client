import { GitManager } from "../../utils/git-manager";
import { Branch, Preferences } from "../../types";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { showToast, Toast, getPreferenceValues, confirmAlert, environment, useNavigation, Color } from "@raycast/api";
import { AI } from "@raycast/api";
import { Action, ActionPanel, Form, Icon, Alert } from "@raycast/api";
import { AiPromptPreset, useAiPromptPresets } from "../../hooks/useAiPromptPresets";
import { AiMessagePresetEditorForm } from "../../manage-ai-message-prompts";
import { RemotesHosts } from "../../hooks/useGitRemotes";
import { RemoteHostIcon } from "../../components/icons/RemoteHostIcons";

/**
 * Form for creating a commit with AI generation support.
 */
export function CommitMessageForm({
  currentBranch,
  amendOnly = false,
  gitManager,
  remotesHosts,
  onFinish }: {
    currentBranch: Branch;
    amendOnly?: boolean;
    gitManager: GitManager;
    remotesHosts?: RemotesHosts;
    onFinish: () => void
  }) {
  const preferences = getPreferenceValues<Preferences>();

  // Use useState for autoGenerateCommitMessage mode, and useCachedState for amendOnly mode
  const [draftMessage, setDraftMessage] = preferences.autoGenerateCommitMessage
    ? useState("")
    : useCachedState(`commit-draft-${gitManager.repoPath}`, "");

  // Use useState for amendOnly mode, and useCachedState for autoGenerateCommitMessage mode
  const [amend, setAmend] = amendOnly
    ? useState(true)
    : useCachedState(`commit-amend-${gitManager.repoPath}`, false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();
  const { presets } = useAiPromptPresets();

  useEffect(() => {
    if (preferences.autoGenerateCommitMessage && !amendOnly) {
      generateCommitMessage(presets[0]);
    }
  }, []);

  // Handle amend checkbox changes
  const handleAmendChange = async (newAmendValue: boolean) => {
    let lastCommit = null;
    if (newAmendValue) {
      lastCommit = await gitManager.getLastCommit()
    }

    setAmend(newAmendValue);

    if (newAmendValue && lastCommit) {
      // If amend is enabled, populate with last commit message (trimmed)
      setDraftMessage((lastCommit.message + "\n\n" + lastCommit.body).trim());
    } else if (!newAmendValue && amend !== newAmendValue) {
      // If amend is disabled, clear draft message
      setDraftMessage("");
    }
  };

  const clearDraft = () => {
    setDraftMessage("");
    setAmend(false);
  };

  const generateCommitMessage = async (presetPrompt: AiPromptPreset) => {
    try {
      setIsGenerating(true);

      // Get staged changes diff
      const diff = await gitManager.getDiff();
      let lastCommit = null;
      if (amend) {
        lastCommit = await gitManager.getLastCommit()
      }

      // Form a more structured and readable prompt for AI generation of commit message using selected preset
      const promptParts = [presetPrompt.prompt.trim(), ""];

      // If amend is enabled and we have a last commit, include it in the context
      if (amend && lastCommit) {
        promptParts.push(
          "--------------------",
          "PREVIOUS COMMIT MESSAGE (for amend):",
          "--------------------",
          lastCommit.message.trim(),
          "",
          lastCommit.body.trim(),
          "",
        );
      }

      if (!amendOnly) {
        promptParts.push(
          "--------------------",
          "GIT DIFF:",
          "--------------------",
          diff.trim(),
          "",
          "--------------------",
        );
      }

      const prompt = promptParts.join("\n");
      const model = presetPrompt.model ? AI.Model[presetPrompt.model as keyof typeof AI.Model] : undefined;

      const aiResponse = AI.ask(prompt, {
        creativity: "none",
        model: model,
      });
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating commit message...",
        message: "This may take a few seconds.",
      });
      setDraftMessage(await aiResponse);

      await showToast({
        style: Toast.Style.Success,
        title: "Commit message generated",
        message: "Review and edit as needed.",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to generate commit message" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async (push = false, forcePush = false, remote: string) => {
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
      setIsSubmitting(true);
      // Commit changes
      await gitManager.commit(draftMessage.trim(), amend);
    } catch (error) {
      // Git error is already shown by GitManager
      return
    } finally {
      setIsSubmitting(false);
    }

    // Push if requested
    if (push) {
      try { await gitManager.push(forcePush, currentBranch); }
      // Git error is already shown by GitManager
      catch (error) { }
    }
    // Clear draft after successful commit
    clearDraft();
    pop();
    onFinish();
  };

  const handleSubmit = async (values: { message: string; amend: boolean }) => {
    setDraftMessage(values.message);
    await handleCommit();
  };

  return (
    <Form
      navigationTitle={"Commit Message"}
      isLoading={isGenerating || isSubmitting}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title={amend ? "Amend" : "Commit"}
              onSubmit={handleSubmit}
              icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            />
            <CommitAndPushAction
              amend={amend}
              forcePush={false}
              onFinish={onFinish}
              gitManager={gitManager}
              currentBranch={currentBranch}
              handleCommit={handleCommit}
              remotesHosts={remotesHosts}
            />
            <CommitAndPushAction
              amend={amend}
              forcePush={true}
              onFinish={onFinish}
              gitManager={gitManager}
              currentBranch={currentBranch}
              handleCommit={handleCommit}
              remotesHosts={remotesHosts}
            />
          </ActionPanel.Section>

          {environment.canAccess("AI") && (
            <ActionPanel.Section title="AI Assistant">
              {presets.length > 0 && (
                <Action
                  key={presets[0].id}
                  title="Generate Message"
                  icon={Icon.Wand}
                  onAction={() => generateCommitMessage(presets[0])}
                  shortcut={{ modifiers: ["cmd"], key: "g" }}
                />
              )}
              <ActionPanel.Submenu
                title="Generate Message with"
                icon={Icon.Wand}
                shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
              >
                {presets.map((preset) => (
                  <Action
                    key={preset.id}
                    title={preset.name}
                    onAction={() => generateCommitMessage(preset)}
                  />
                ))}
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add New Preset"
                    target={<AiMessagePresetEditorForm />}
                  />
                </ActionPanel.Section>
              </ActionPanel.Submenu>
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action
              title="Toggle Amend"
              onAction={() => handleAmendChange(!amend)}
              icon={Icon.ArrowCounterClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Enter commit message or use AI generation..."
        value={draftMessage}
        error={draftMessage.length > 0 ? undefined : "Required"}
        onChange={setDraftMessage}
        info="Draft is automatically saved and will be cleared after successful commit"
      />
      <Form.Checkbox
        id="amend"
        label="Amend"
        value={amend}
        onChange={handleAmendChange}
        info="Modify the last commit instead of creating a new one"
      />
    </Form>
  );
}

function CommitAndPushAction({
  gitManager,
  currentBranch,
  amend,
  forcePush,
  onFinish,
  handleCommit,
  remotesHosts,
}: {
  gitManager: GitManager;
  currentBranch: Branch;
  amend: boolean;
  forcePush: boolean;
  onFinish: () => void;
  handleCommit: (push: boolean, forcePush: boolean, remote: string) => void;
  remotesHosts?: RemotesHosts;
}) {
  if (!remotesHosts || Object.keys(remotesHosts).length === 0) {
    return undefined;
  }

  const title = useMemo(() => {
    if (amend && forcePush) {
      return "Amend and Force Push";
    } else if (amend) {
      return "Amend and Push";
    } else if (forcePush) {
      return "Force Push";
    } else {
      return "Push";
    }
  }, [amend, forcePush]);

  if (Object.keys(remotesHosts).length === 1) {
    return (
      <Action
        title={title}
        onAction={() => handleCommit(amend, forcePush, Object.keys(remotesHosts)[0])}
        icon={forcePush ? Icon.ExclamationMark : Icon.Upload}
        style={forcePush ? Action.Style.Destructive : undefined}
        shortcut={forcePush
          ? { modifiers: ["cmd", "opt", "shift"], key: "enter" }
          : { modifiers: ["cmd", "shift"], key: "enter" }}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title={`${title} to`}
      icon={forcePush ? Icon.ExclamationMark : Icon.Upload}
      shortcut={forcePush
        ? { modifiers: ["cmd", "opt", "shift"], key: "enter" }
        : { modifiers: ["cmd", "shift"], key: "enter" }}
    >
      {Object.keys(remotesHosts).map((remote) => (
        <Action
          key={`${remote}:commit-and-push`}
          title={remote}
          icon={RemoteHostIcon(remotesHosts[remote].provider)}
          onAction={() => handleCommit(amend, forcePush, remote)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
