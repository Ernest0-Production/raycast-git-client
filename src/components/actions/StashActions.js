"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StashApplyAction = StashApplyAction;
exports.StashDropAction = StashDropAction;
exports.StashCreateAction = StashCreateAction;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
/**
 * Action for applying a stash.
 */
function StashApplyAction(context) {
    const handleApply = async () => {
        if (await (0, api_1.confirmAlert)({
            title: "Apply Stash?",
            message: `Are you sure you want to apply "${context.stash.message}"?`,
            primaryAction: { title: "Apply", style: api_1.Alert.ActionStyle.Default },
        })) {
            try {
                await context.gitManager.applyStash(context.index);
                context.status.revalidate();
                // Ask if user wants to drop the applied stash
                if (await (0, api_1.confirmAlert)({
                    title: "Drop Applied Stash?",
                    message: `Stash "${context.stash.message}" has been applied. Do you want to drop it?`,
                    primaryAction: { title: "Drop", style: api_1.Alert.ActionStyle.Destructive },
                })) {
                    await context.gitManager.dropStash(context.index);
                    context.stashes.revalidate();
                }
                // Automatically switch to StatusView after applying stash
                context.navigateTo("status");
            }
            catch (error) {
                // Git error is already shown by GitManager
            }
        }
    };
    return (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Apply Stash", icon: api_1.Icon.Bookmark, onAction: handleApply });
}
/**
 * Action for dropping a stash.
 */
function StashDropAction(context) {
    const handleDrop = async () => {
        if (await (0, api_1.confirmAlert)({
            title: "Drop Stash?",
            message: `Are you sure you want to drop "${context.stash.message}"? This action cannot be undone.`,
            primaryAction: { title: "Drop", style: api_1.Alert.ActionStyle.Destructive },
        })) {
            try {
                await context.gitManager.dropStash(context.index);
                context.stashes.revalidate();
            }
            catch (error) {
                // Git error is already shown by GitManager
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Drop Stash", style: api_1.Action.Style.Destructive, icon: api_1.Icon.Trash, onAction: handleDrop, shortcut: { modifiers: ["ctrl"], key: "x" } }));
}
function StashCreateAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Stash Changes", icon: api_1.Icon.Bookmark, target: (0, jsx_runtime_1.jsx)(StashCreateForm, { ...context }), shortcut: { modifiers: ["cmd"], key: "s" } }));
}
function StashCreateForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [message, setMessage] = (0, react_1.useState)("");
    const handleSubmit = async (values) => {
        try {
            await context.gitManager.stash(values.message);
            context.stashes.revalidate();
            pop();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Form, { navigationTitle: "Stash Changes", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Stash Changes", onSubmit: handleSubmit }) }), children: (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "message", title: "Stash Message", placeholder: "Describe the changes being stashed", info: "Optional", error: message.trim().length === 0 ? "Required" : undefined, value: message, onChange: setMessage }) }));
}
