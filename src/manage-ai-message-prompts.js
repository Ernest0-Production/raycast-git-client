"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ManageAiMessagePrompts;
exports.AiMessagePresetEditorForm = AiMessagePresetEditorForm;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const useAiPromptPresets_1 = require("./hooks/useAiPromptPresets");
function ManageAiMessagePrompts() {
    const { presets, deletePreset, movePreset } = (0, useAiPromptPresets_1.useAiPromptPresets)();
    return ((0, jsx_runtime_1.jsx)(api_1.List, { navigationTitle: "AI Message Prompts", searchBarPlaceholder: "Search presets by name...", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add New Preset", icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" }, target: (0, jsx_runtime_1.jsx)(AiMessagePresetEditorForm, {}) }) }), children: presets.map((preset) => ((0, jsx_runtime_1.jsx)(PresetListItem, { preset: preset, isDefault: preset.id === "default", onDelete: (id) => deletePreset(id), onMove: (id, direction) => movePreset(id, direction) }, preset.id))) }));
}
function PresetListItem({ preset, isDefault, onDelete, onMove }) {
    const handleDelete = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Delete Preset",
            message: `Are you sure you want to delete preset "${preset.name}"?`,
            primaryAction: {
                title: "Delete",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            onDelete(preset.id);
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: preset.name, accessories: preset.model ? [{ text: preset.model }] : [{ text: "Auto" }], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: preset.name, children: [!isDefault &&
                            (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Edit Preset", icon: api_1.Icon.Pencil, target: (0, jsx_runtime_1.jsx)(AiMessagePresetEditorForm, { initialPreset: preset }), shortcut: { modifiers: ["cmd"], key: "e" } }), !isDefault &&
                            (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Delete Preset", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, onAction: handleDelete, shortcut: { modifiers: ["ctrl"], key: "x" } })] }), (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add New Preset", icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" }, target: (0, jsx_runtime_1.jsx)(AiMessagePresetEditorForm, {}) }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Order", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Move Up", icon: api_1.Icon.ChevronUp, onAction: () => onMove(preset.id, "up"), shortcut: { modifiers: ["cmd", "opt"], key: "arrowUp" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Move Down", icon: api_1.Icon.ChevronDown, onAction: () => onMove(preset.id, "down"), shortcut: { modifiers: ["cmd", "opt"], key: "arrowDown" } })] })] }) }));
}
function AiMessagePresetEditorForm({ initialPreset }) {
    const { pop } = (0, api_1.useNavigation)();
    const { addPreset, updatePreset } = (0, useAiPromptPresets_1.useAiPromptPresets)();
    const [name, setName] = (0, react_1.useState)(initialPreset?.name ?? "");
    const [prompt, setPrompt] = (0, react_1.useState)(initialPreset?.prompt ?? "");
    const [model, setModel] = (0, react_1.useState)(initialPreset?.model ?? "auto");
    const handleSubmit = (values) => {
        const aiModel = values.model === "auto" ? undefined : values.model;
        if (initialPreset) {
            updatePreset(initialPreset.id, values.name.trim(), values.prompt.trim(), aiModel);
        }
        else {
            addPreset(values.name.trim(), values.prompt.trim(), aiModel);
        }
        pop();
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: initialPreset ? `Edit Preset` : "Add Preset", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: initialPreset ? "Save Changes" : "Create Preset", onSubmit: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "name", title: "Name", placeholder: "e.g., Conventional Commits", value: name, error: name.trim().length === 0 ? "Required" : undefined, onChange: setName }), (0, jsx_runtime_1.jsx)(api_1.Form.TextArea, { id: "prompt", title: "Prompt", placeholder: "Write system prompt for AI commit generation...", value: prompt, error: prompt.trim().length === 0 ? "Required" : undefined, onChange: setPrompt }), (0, jsx_runtime_1.jsxs)(api_1.Form.Dropdown, { id: "model", title: "AI Model", value: model ?? "auto", onChange: setModel, children: [(0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "auto", title: "Auto" }), Object.keys(api_1.AI.Model).map((model) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: model, title: model }, model)))] }), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Prompt is used to generate commit message based on diff content. It will be available via 'Generate Commit Message' action in Commit Message Form." })] }));
}
