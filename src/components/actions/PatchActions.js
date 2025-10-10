"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchCreateAction = PatchCreateAction;
exports.PatchApplyAction = PatchApplyAction;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const types_1 = require("../../types");
const utils_1 = require("@raycast/utils");
const fs_1 = require("fs");
const react_1 = require("react");
/**
 * Action to create a patch for all unstaged changes.
 */
function PatchCreateAction(context) {
    return ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Submenu, { title: "Save as Patch", icon: `patch.svg`, shortcut: { modifiers: ["cmd", "shift"], key: "s" }, children: [(0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "All Changes", target: (0, jsx_runtime_1.jsx)(PatchCreateForm, { scope: types_1.PatchScope.ALL, ...context }) }), (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Only Staged", target: (0, jsx_runtime_1.jsx)(PatchCreateForm, { scope: types_1.PatchScope.STAGED, ...context }) }), (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Only Unstaged", target: (0, jsx_runtime_1.jsx)(PatchCreateForm, { scope: types_1.PatchScope.UNSTAGED, ...context }) })] }));
}
function PatchCreateForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [directoryPath, setDirectoryPath] = (0, utils_1.useCachedState)(`patches-directory`, []);
    const validateDirectoryPath = (directoryPath) => {
        if (directoryPath.length === 0) {
            return "Required";
        }
        if (!(0, fs_1.existsSync)(directoryPath[0])) {
            return "Not exists";
        }
        return undefined;
    };
    const handleSubmit = async (values) => {
        try {
            const patchPath = await context.gitManager.createPatch(values.directoryPath[0], context.scope);
            await api_1.Clipboard.copy(patchPath);
            pop();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Form, { navigationTitle: "Create Patch", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Create Patch", onSubmit: handleSubmit }) }), children: (0, jsx_runtime_1.jsx)(api_1.Form.FilePicker, { id: "directoryPath", title: "Output Directory", value: directoryPath, error: validateDirectoryPath(directoryPath), onChange: setDirectoryPath, allowMultipleSelection: false, canChooseDirectories: true, canChooseFiles: false }) }));
}
function PatchApplyAction(context) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Apply Patch", icon: api_1.Icon.Download, target: (0, jsx_runtime_1.jsx)(PatchApplyForm, { ...context }) }));
}
function PatchApplyForm(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [patchFilePath, setPatchFilePath] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        (async () => {
            const content = await api_1.Clipboard.read();
            if (!content.file)
                return;
            const filePath = decodeURIComponent(content.file).replace('file://', '');
            if (filePath.endsWith(".patch") && (0, fs_1.existsSync)(filePath)) {
                setPatchFilePath([filePath]);
            }
        })();
    }, []);
    const handleSubmit = async (values) => {
        try {
            const confirmed = await (0, api_1.confirmAlert)({
                title: "Apply Patch",
                message: "Are you sure you want to apply the patch? This action cannot be undone.",
                primaryAction: {
                    title: "Apply",
                    style: api_1.Alert.ActionStyle.Destructive,
                },
            });
            if (confirmed) {
                await context.gitManager.applyPatch(patchFilePath[0]);
                context.status.revalidate();
                pop();
            }
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Form, { navigationTitle: "Apply Patch", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Apply Patch", onSubmit: handleSubmit }) }), children: (0, jsx_runtime_1.jsx)(api_1.Form.FilePicker, { id: "patchFilePath", title: "Patch File", value: patchFilePath, error: patchFilePath.length === 0 ? "Required" : undefined, info: "It should be a '.patch' file", onChange: setPatchFilePath, allowMultipleSelection: false, canChooseDirectories: false, canChooseFiles: true }) }));
}
