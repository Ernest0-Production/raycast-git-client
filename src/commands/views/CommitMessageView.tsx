import { GitManager } from "../../utils/git-utils";
import { Preferences } from "../../types";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { showToast, Toast, getPreferenceValues, confirmAlert, environment, useNavigation } from "@raycast/api";
import { AI } from "@raycast/api";
import { Action, ActionPanel, Form, Icon, Alert } from "@raycast/api";

/**
 * Form for creating a commit with AI generation support.
 */
export function CommitMessageForm({ amendOnly = false, gitManager, onFinish }: { amendOnly?: boolean; gitManager: GitManager; onFinish: () => void }) {
  const preferences = getPreferenceValues<Preferences>();
  const [draftMessage, setDraftMessage] = useCachedState(`commit-draft-${gitManager.repoPath}`, "");
  // Используем useState для режима только amend, иначе useCachedState
  const [amend, setAmend] = amendOnly
    ? useState(true)
    : useCachedState(`commit-amend-${gitManager.repoPath}`, false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { pop } = useNavigation();

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
    } else if (!newAmendValue) {
      // If amend is disabled, clear draft message
      setDraftMessage("");
    }
  };

  const clearDraft = () => {
    setDraftMessage("");
    setAmend(false);
  };

  const generateCommitMessage = async () => {
    try {
      setIsGenerating(true);

      // Get staged changes diff
      const diff = await gitManager.getDiff();
      let lastCommit = null;
      if (amend) {
        lastCommit = await gitManager.getLastCommit()
      }

      // Form a more structured and readable prompt for AI generation of commit message
      const promptParts = [preferences.aiCommitPrompt!.trim(), ""];

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

      promptParts.push(
        "--------------------",
        "GIT DIFF:",
        "--------------------",
        diff.trim(),
        "",
        "--------------------",
        amend && lastCommit
          ? "Please provide an summarized commit message based on the previous commit message and the new changes. Only return the commit message, no explanations."
          : "Please provide only the commit message, no explanations.",
      );

      const prompt = promptParts.join("\n");

      const aiResponse = AI.ask(prompt, { creativity: "none" });
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate commit message",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async (push = false, forcePush = false) => {
    // Confirm force push if requested
    if (push && forcePush) {
      const confirmed = await confirmAlert({
        title: "Force Push Confirmation",
        message:
          "Force push will rewrite Git history on the remote repository. This can cause problems for other collaborators. Are you sure you want to continue?",
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
      // Commit changes
      await gitManager.commit(draftMessage.trim(), amend);
    } catch (error) {
      // Git error is already shown by GitManager
      return
    }

    // Push if requested
    if (push) {
      try { await gitManager.push(forcePush); }
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
      isLoading={isGenerating}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Commit Actions">
            <Action.SubmitForm title={amend ? "Amend" : "Commit"} onSubmit={handleSubmit} icon={Icon.CheckCircle} />
            <Action
              title={amend ? "Amend and Push" : "Commit and Push"}
              onAction={() => handleCommit(true, false)}
              icon={Icon.Upload}
            />
            <Action
              title={amend ? "Amend and Force Push" : "Commit and Force Push"}
              onAction={() => handleCommit(true, true)}
              icon={Icon.ExclamationMark}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "enter" }}
            />
          </ActionPanel.Section>

          {environment.canAccess("AI") && (
            <ActionPanel.Section title="AI Assistant">
              <Action
                title="Generate Commit Message"
                onAction={generateCommitMessage}
                icon={Icon.Wand}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action
              title="Toggle Amend"
              onAction={() => handleAmendChange(!amend)}
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Commit message"
        placeholder="Enter commit message or use AI generation..."
        value={draftMessage}
        error={draftMessage.length > 0 ? undefined : "Required"}
        onChange={setDraftMessage}
        info="Draft is automatically saved and will be cleared after successful commit"
      />
      <Form.Checkbox
        id="amend"
        label="Amend last commit"
        value={amend}
        onChange={handleAmendChange}
        info="Modify the last commit instead of creating a new one"
      />
    </Form>
  );
}
