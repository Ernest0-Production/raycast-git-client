"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConfigureUrlTrackers;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const useIssueTracker_1 = require("./hooks/useIssueTracker");
function ConfigureUrlTrackers() {
    const { configs, deleteConfig } = (0, useIssueTracker_1.useIssueTracker)();
    return ((0, jsx_runtime_1.jsx)(api_1.List, { navigationTitle: "Configure URL Trackers", searchBarPlaceholder: "Search rules by title...", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add New Rule", icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" }, target: (0, jsx_runtime_1.jsx)(UrlTrackerEditorForm, {}) }) }), children: configs.map((config) => ((0, jsx_runtime_1.jsx)(RuleListItem, { config: config, onDelete: deleteConfig }, config.id))) }));
}
function RuleListItem({ config, onDelete }) {
    const handleDelete = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Delete Rule",
            message: `Are you sure you want to delete rule "${config.title}"?`,
            primaryAction: {
                title: "Delete",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            onDelete(config.id);
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: config.title, accessories: [{ text: config.urlPlaceholder }], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: config.title, children: [(0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Edit Rule", icon: api_1.Icon.Pencil, shortcut: { modifiers: ["cmd"], key: "e" }, target: (0, jsx_runtime_1.jsx)(UrlTrackerEditorForm, { initialConfig: config }) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Delete Rule", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, onAction: handleDelete, shortcut: { modifiers: ["ctrl"], key: "x" } })] }), (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add New Rule", icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" }, target: (0, jsx_runtime_1.jsx)(UrlTrackerEditorForm, {}) })] }) }));
}
function UrlTrackerEditorForm({ initialConfig }) {
    const { pop } = (0, api_1.useNavigation)();
    const { addConfig, updateConfig, validateConfig } = (0, useIssueTracker_1.useIssueTracker)();
    const [title, setTitle] = (0, react_1.useState)(initialConfig?.title ?? "");
    const [regex, setRegex] = (0, react_1.useState)(initialConfig?.regex ?? "");
    const [urlPlaceholder, setUrlPlaceholder] = (0, react_1.useState)(initialConfig?.urlPlaceholder ?? "");
    const handleSubmit = (values) => {
        validateConfig(values);
        if (initialConfig) {
            updateConfig(initialConfig.id, values.title.trim(), values.regex.trim(), values.urlPlaceholder.trim());
        }
        else {
            addConfig(values.title.trim(), values.regex.trim(), values.urlPlaceholder.trim());
        }
        pop();
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: initialConfig ? "Edit Rule" : "Add Rule", searchBarAccessory: (0, jsx_runtime_1.jsx)(api_1.Form.LinkAccessory, { text: "Regex Playground", target: "https://regex101.com/" }), actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: initialConfig ? "Save Changes" : "Create Rule", onSubmit: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "title", title: "Title", placeholder: "e.g., Jira Ticket, GitHub Issue, Pull Request", value: title, error: title.trim().length === 0 ? "Required" : undefined, onChange: setTitle }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "regex", title: "Regex Pattern", placeholder: "([A-Z]+-\\\\d+) for JIRA-123", value: regex, error: regex.trim().length === 0 ? "Required" : undefined, onChange: setRegex }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "urlPlaceholder", title: "URL Template", placeholder: "https://company.atlassian.net/browse/@key", info: "Use @key placeholder where the regex match should be inserted", value: urlPlaceholder, error: urlPlaceholder.trim().length === 0 ? "Required" : undefined, onChange: setUrlPlaceholder })] }));
}
