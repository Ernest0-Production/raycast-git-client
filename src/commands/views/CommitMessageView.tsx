import { GitManager } from "../../utils/git-utils";
import { Preferences } from "../../types";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { showToast, Toast, getPreferenceValues, confirmAlert, popToRoot, environment } from "@raycast/api";
import { AI } from "@raycast/api";
import { Action, ActionPanel, Form, Icon, Alert } from "@raycast/api";

/**
 * Form for creating a commit with AI generation support.
 */
export function CommitMessageForm({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
    const preferences = getPreferenceValues<Preferences>();
    const [aiMessage, setAiMessage] = useState("");
    const [draftMessage, setDraftMessage] = useCachedState(`commit-draft-${gitManager.repoPath}`, "");
    const [amend, setAmend] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const clearDraft = () => {
        setDraftMessage("");
    };

    const generateCommitMessage = async () => {
        try {
            setIsGenerating(true);

            // Get staged changes diff
            const diff = await gitManager.getDiff();

            // Form a more structured and readable prompt for AI generation of commit message
            const prompt = [
                preferences.aiCommitPrompt!.trim(),
                "",
                "--------------------",
                "GIT DIFF:",
                "--------------------",
                diff.trim(),
                "",
                "--------------------",
                "Please provide only the commit message, no explanations."
            ].join("\n");

            const aiResponse = AI.ask(prompt, { creativity: "none" });
            await showToast({
                style: Toast.Style.Animated,
                title: "Generating commit message...",
                message: "AI is generating commit message. This may take a few seconds."
            });
            setAiMessage("");
            aiResponse.on("data", (chunk) => {
                setAiMessage(prev => prev + chunk);
            });
            setDraftMessage(await aiResponse);
            setAiMessage("");

            await showToast({
                style: Toast.Style.Success,
                title: "Commit message generated",
                message: "AI generated commit message. Review and edit as needed."
            });

        } catch (error) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to generate commit message",
                message: error instanceof Error ? error.message : "Unknown error occurred"
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
            // Commit changes
            await gitManager.commit(draftMessage.trim(), amend);

            // Clear draft after successful commit
            clearDraft();

            // Push if requested
            if (push) {
                await gitManager.push(forcePush);
            }

            onRefresh();
            await popToRoot();
        } catch (error) {
            // Git error is already shown by GitManager
        }
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
                        <Action.SubmitForm
                            title={amend ? "Amend" : "Commit"}
                            onSubmit={handleSubmit}
                            icon={Icon.CheckCircle}
                        />
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
                </ActionPanel>
            }
        >
            <Form.TextArea
                id="message"
                title="Commit message"
                placeholder="Enter commit message or use AI generation..."
                value={aiMessage.length > 0 ? aiMessage : draftMessage}
                error={draftMessage.length > 0 ? undefined : "Required"}
                onChange={setDraftMessage}
                info="Draft is automatically saved and will be cleared after successful commit"
            />
            <Form.Checkbox
                id="amend"
                label="Amend last commit"
                value={amend}
                onChange={setAmend}
                info="Modify the last commit instead of creating a new one"
            />
        </Form>
    );
}
