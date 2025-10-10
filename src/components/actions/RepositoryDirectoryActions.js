"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryDirectoryActions = RepositoryDirectoryActions;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const utils_1 = require("@raycast/utils");
const path_1 = require("path");
/**
 * Reusable actions for working with repository as a directory.
 * Includes file system operations and opening in various applications.
 */
function RepositoryDirectoryActions({ repositoryPath, onOpen }) {
    const preferences = (0, api_1.getPreferenceValues)();
    const { data: applications } = (0, utils_1.usePromise)(() => (0, api_1.getApplications)(repositoryPath));
    const [defaultApp, setDefaultApp] = (0, utils_1.useCachedState)(`${repositoryPath}:repo-default-app`, undefined);
    async function handleOpenWith(app) {
        const remember = await (0, api_1.confirmAlert)({
            title: "Remember choise?",
            message: `Do you want to remember "${app.name}" as the default app for this repository?`,
            primaryAction: {
                title: "Remember",
                style: api_1.Alert.ActionStyle.Default,
            },
            dismissAction: {
                title: "No",
            }
        });
        await (0, api_1.open)(repositoryPath, app);
        onOpen?.();
        if (remember) {
            setDefaultApp(app);
        }
    }
    function handleChangeDefault(app) {
        setDefaultApp(app);
    }
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: (0, path_1.basename)(repositoryPath), children: [defaultApp ? ((0, jsx_runtime_1.jsx)(api_1.Action.Open, { title: "Open Repository", icon: { fileIcon: defaultApp.path }, application: defaultApp, target: repositoryPath, onOpen: () => onOpen?.(), shortcut: { modifiers: ["cmd", "shift"], key: "o" } }, defaultApp.bundleId || defaultApp.path)) : ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Submenu, { title: "Open Repository", icon: api_1.Icon.AppWindow, shortcut: { modifiers: ["cmd", "shift"], key: "o" }, children: applications?.map((app) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: app.name, icon: { fileIcon: app.path }, onAction: () => handleOpenWith(app) }, app.path))) })), (0, jsx_runtime_1.jsx)(api_1.Action.Open, { title: `Open Repository in ${preferences.defaultTerminal.name}`, target: repositoryPath, application: preferences.defaultTerminal, icon: { fileIcon: preferences.defaultTerminal.path }, shortcut: { modifiers: ["cmd", "shift"], key: "t" }, onOpen: () => onOpen?.() }), preferences.externalGitClient && ((0, jsx_runtime_1.jsx)(api_1.Action.Open, { title: `Open Repository in ${preferences.externalGitClient.name}`, target: repositoryPath, application: preferences.externalGitClient, icon: { fileIcon: preferences.externalGitClient.path }, shortcut: { modifiers: ["cmd", "shift"], key: "g" }, onOpen: () => onOpen?.() })), (0, jsx_runtime_1.jsx)(api_1.Action.OpenWith, { path: repositoryPath, title: "Open Repository with\u2026", onOpen: () => onOpen?.(), shortcut: { modifiers: ["cmd", "shift", "opt"], key: "o" } }), defaultApp && ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Submenu, { title: "Change Repository Default App", icon: api_1.Icon.AppWindow, children: applications?.map((app) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: app.name, icon: { fileIcon: app.path }, onAction: () => handleChangeDefault(app) }, app.path))) })), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Repository Path", content: repositoryPath })] }));
}
