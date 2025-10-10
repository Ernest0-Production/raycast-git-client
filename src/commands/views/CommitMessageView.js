"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitMessageForm = CommitMessageForm;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("@raycast/utils");
const react_1 = require("react");
const api_1 = require("@raycast/api");
const api_2 = require("@raycast/api");
const api_3 = require("@raycast/api");
const useAiPromptPresets_1 = require("../../hooks/useAiPromptPresets");
const manage_ai_message_prompts_1 = require("../../manage-ai-message-prompts");
const RemoteHostIcons_1 = require("../../components/icons/RemoteHostIcons");
/**
 * Form for creating a commit with AI generation support.
 */
function CommitMessageForm(context) {
    const preferences = (0, api_1.getPreferenceValues)();
    // Use useState for autoGenerateCommitMessage mode, and useCachedState for amendOnly mode
    const [draftMessage, setDraftMessage] = preferences.autoGenerateCommitMessage
        ? (0, react_1.useState)("")
        : (0, utils_1.useCachedState)(`commit-draft-${context.gitManager.repoPath}`, "");
    // Use useState for amendOnly mode, and useCachedState for autoGenerateCommitMessage mode
    const [amend, setAmend] = context.amendOnly
        ? (0, react_1.useState)(true)
        : (0, utils_1.useCachedState)(`commit-amend-${context.gitManager.repoPath}`, false);
    const [isGenerating, setIsGenerating] = (0, react_1.useState)(false);
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const { pop } = (0, api_1.useNavigation)();
    const { presets } = (0, useAiPromptPresets_1.useAiPromptPresets)();
    (0, react_1.useEffect)(() => {
        if (preferences.autoGenerateCommitMessage && !context.amendOnly) {
            generateCommitMessage(presets[0]);
        }
    }, []);
    // Handle amend checkbox changes
    const handleAmendChange = async (newAmendValue) => {
        let lastCommit = null;
        if (newAmendValue) {
            lastCommit = await context.gitManager.getLastCommit();
        }
        setAmend(newAmendValue);
        if (newAmendValue && lastCommit) {
            // If amend is enabled, populate with last commit message (trimmed)
            setDraftMessage((lastCommit.message + "\n\n" + lastCommit.body).trim());
        }
        else if (!newAmendValue && amend !== newAmendValue) {
            // If amend is disabled, clear draft message
            setDraftMessage("");
        }
    };
    const clearDraft = () => {
        setDraftMessage("");
        setAmend(false);
    };
    const generateCommitMessage = async (presetPrompt) => {
        const gitManager = context.gitManager;
        try {
            setIsGenerating(true);
            // Get staged changes diff
            const diff = await context.gitManager.getDiff();
            let lastCommit = null;
            if (amend) {
                lastCommit = await context.gitManager.getLastCommit();
            }
            // Form a more structured and readable prompt for AI generation of commit message using selected preset
            const promptParts = [presetPrompt.prompt.trim(), ""];
            // If amend is enabled and we have a last commit, include it in the context
            if (amend && lastCommit) {
                promptParts.push("--------------------", "PREVIOUS COMMIT MESSAGE (for amend):", "--------------------", lastCommit.message.trim(), "", lastCommit.body.trim(), "");
            }
            if (!context.amendOnly) {
                promptParts.push("--------------------", "GIT DIFF:", "--------------------", diff.trim(), "", "--------------------");
            }
            const prompt = promptParts.join("\n");
            const model = presetPrompt.model ? api_2.AI.Model[presetPrompt.model] : undefined;
            const aiResponse = api_2.AI.ask(prompt, {
                creativity: "none",
                model: model,
            });
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Animated,
                title: "Generating commit message...",
                message: "This may take a few seconds.",
            });
            setDraftMessage(await aiResponse);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Commit message generated",
                message: "Review and edit as needed.",
            });
        }
        catch (error) {
            await (0, utils_1.showFailureToast)(error, { title: "Failed to generate commit message" });
        }
        finally {
            setIsGenerating(false);
        }
    };
    const handleCommit = async (push = false, forcePush = false, remote) => {
        // Confirm force push if requested
        if (push && forcePush && remote) {
            const confirmed = await (0, api_1.confirmAlert)({
                title: "Force Push Confirmation",
                message: "Force push will rewrite Git history on the remote repository. This can cause problems for other collaborators. Are you sure you want to continue?",
                primaryAction: {
                    title: "Force Push",
                    style: api_3.Alert.ActionStyle.Destructive,
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
            await context.gitManager.commit(draftMessage.trim(), amend);
        }
        catch (error) {
            // Git error is already shown by GitManager
            return;
        }
        finally {
            setIsSubmitting(false);
        }
        // Push if requested
        if (push && remote) {
            try {
                await context.gitManager.push(forcePush, context.branches.data.currentBranch, remote);
            }
            // Git error is already shown by GitManager
            catch (error) { }
        }
        // Clear draft after successful commit
        clearDraft();
        pop();
        context.status.revalidate();
        context.branches.revalidate();
        context.commits.revalidate();
    };
    return ((0, jsx_runtime_1.jsxs)(api_3.Form, { navigationTitle: "Commit Message", isLoading: isGenerating || isSubmitting, actions: (0, jsx_runtime_1.jsxs)(api_3.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_3.ActionPanel.Section, { children: [(0, jsx_runtime_1.jsx)(api_3.Action.SubmitForm, { title: amend ? "Amend" : "Commit", onSubmit: () => handleCommit(false, false, undefined), icon: { source: api_3.Icon.Checkmark, tintColor: api_1.Color.Green } }), (0, jsx_runtime_1.jsx)(CommitAndPushAction, { amend: amend, forcePush: false, handleCommit: (remote) => handleCommit(true, false, remote), ...context }), (0, jsx_runtime_1.jsx)(CommitAndPushAction, { amend: amend, forcePush: true, handleCommit: (remote) => handleCommit(true, true, remote), ...context })] }), api_1.environment.canAccess("AI") && ((0, jsx_runtime_1.jsxs)(api_3.ActionPanel.Section, { title: "AI Assistant", children: [presets.length > 0 && ((0, jsx_runtime_1.jsx)(api_3.Action, { title: "Generate Message", icon: api_3.Icon.Wand, onAction: () => generateCommitMessage(presets[0]), shortcut: { modifiers: ["cmd"], key: "g" } }, presets[0].id)), (0, jsx_runtime_1.jsxs)(api_3.ActionPanel.Submenu, { title: "Generate Message with", icon: api_3.Icon.Wand, shortcut: { modifiers: ["cmd", "shift"], key: "g" }, children: [presets.map((preset) => ((0, jsx_runtime_1.jsx)(api_3.Action, { title: preset.name, onAction: () => generateCommitMessage(preset) }, preset.id))), (0, jsx_runtime_1.jsx)(api_3.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(api_3.Action.Push, { icon: api_3.Icon.Plus, title: "Add New Preset", target: (0, jsx_runtime_1.jsx)(manage_ai_message_prompts_1.AiMessagePresetEditorForm, {}) }) })] })] })), (0, jsx_runtime_1.jsx)(api_3.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(api_3.Action, { title: "Toggle Amend", onAction: () => handleAmendChange(!amend), icon: api_3.Icon.ArrowCounterClockwise, shortcut: { modifiers: ["cmd", "shift"], key: "a" } }) })] }), children: [(0, jsx_runtime_1.jsx)(api_3.Form.TextArea, { id: "message", title: "Message", placeholder: "Enter commit message or use AI generation...", value: draftMessage, error: draftMessage.length > 0 ? undefined : "Required", onChange: setDraftMessage, info: !context.amendOnly ? "Draft is automatically saved and will be cleared after successful commit" : undefined }), (0, jsx_runtime_1.jsx)(api_3.Form.Checkbox, { id: "amend", label: "Amend", value: amend, onChange: handleAmendChange })] }));
}
function CommitAndPushAction(context) {
    if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
        return undefined;
    }
    const title = (0, react_1.useMemo)(() => {
        if (context.amend && context.forcePush) {
            return "Amend and Force Push";
        }
        else if (context.amend) {
            return "Amend and Push";
        }
        else if (context.forcePush) {
            return "Force Push";
        }
        else {
            return "Push";
        }
    }, [context.amend, context.forcePush]);
    if (Object.keys(context.remotes.data).length === 1) {
        return ((0, jsx_runtime_1.jsx)(api_3.Action, { title: title, onAction: () => context.handleCommit(Object.keys(context.remotes.data)[0]), icon: context.forcePush ? api_3.Icon.ExclamationMark : api_3.Icon.Upload, style: context.forcePush ? api_3.Action.Style.Destructive : undefined, shortcut: context.forcePush
                ? { modifiers: ["cmd", "opt", "shift"], key: "enter" }
                : { modifiers: ["cmd", "shift"], key: "enter" } }));
    }
    return ((0, jsx_runtime_1.jsx)(api_3.ActionPanel.Submenu, { title: `${title} to`, icon: context.forcePush ? api_3.Icon.ExclamationMark : api_3.Icon.Upload, shortcut: context.forcePush
            ? { modifiers: ["cmd", "opt", "shift"], key: "enter" }
            : { modifiers: ["cmd", "shift"], key: "enter" }, children: Object.keys(context.remotes.data).map((remote) => ((0, jsx_runtime_1.jsx)(api_3.Action, { title: remote, icon: (0, RemoteHostIcons_1.RemoteHostIcon)(context.remotes.data[remote].provider), onAction: () => context.handleCommit(remote) }, `${remote}:commit-and-push`))) }));
}
