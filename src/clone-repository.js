"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CloneRepository;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const utils_1 = require("@raycast/utils");
const path_1 = require("path");
const useRepositoriesList_1 = require("./hooks/useRepositoriesList");
const git_manager_1 = require("./utils/git-manager");
const fs_1 = require("fs");
const path_utils_1 = require("./utils/path-utils");
function CloneRepository(props) {
    const { url } = props.arguments;
    const [parentDirectory, setParentDirectory] = (0, utils_1.useCachedState)("clone-parent-directory", undefined);
    const { addRepository } = (0, useRepositoriesList_1.useRepositoriesList)();
    const targetDirectory = (0, react_1.useMemo)(() => {
        if (!parentDirectory) {
            return undefined;
        }
        const repoName = extractRepoNameFromUrl(url);
        return (0, path_1.join)(parentDirectory, repoName);
    }, [url, parentDirectory]);
    const validateRepositoryPath = (0, react_1.useMemo)(() => {
        if (!parentDirectory) {
            return "Required";
        }
        // Check if repository already exists
        if (targetDirectory && (0, fs_1.existsSync)(targetDirectory)) {
            return `Directory "${targetDirectory}" already exists"`;
        }
        return undefined;
    }, [url, targetDirectory]);
    const handleSubmit = async () => {
        if (!targetDirectory) {
            return;
        }
        await (0, api_1.showToast)({
            style: api_1.Toast.Style.Animated,
            title: "Starting Clone"
        });
        try {
            const resolvedTargetDirectory = (0, path_utils_1.resolveTildePath)(targetDirectory);
            // Start non-blocking clone process (init + fetch via GitManager)
            const cloningProcess = await git_manager_1.GitManager.startCloneRepository(url, resolvedTargetDirectory);
            // Add to cloning repositories list
            addRepository(resolvedTargetDirectory, cloningProcess);
            // Navigate to manage repositories to show progress
            (0, api_1.launchCommand)({ name: "manage-repositories", type: api_1.LaunchType.UserInitiated });
        }
        catch (error) {
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Failed to Start Clone",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: "Clone Git Repository", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Clone Repository", icon: api_1.Icon.Download, onSubmit: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: "URL", text: url }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.FilePicker, { id: "parentDirectory", title: "Parent Directory", value: parentDirectory ? [parentDirectory] : [], error: validateRepositoryPath, onChange: (paths) => setParentDirectory(paths[0] || undefined), allowMultipleSelection: false, canChooseDirectories: true, canChooseFiles: false }), targetDirectory &&
                (0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: "Target Directory", text: targetDirectory })] }));
}
/**
 * Extracts repository name from git URL.
 * Handles both HTTPS and SSH URLs.
 */
function extractRepoNameFromUrl(url) {
    // Regular expression to extract repository name from URL
    // Supports HTTPS and SSH formats URLs
    const repoNameRegex = /(?:\/|:)(?<repoName>[^\/]+?)(?:\.git)?$/;
    const match = url.match(repoNameRegex);
    // Extract repository name from named capture group
    if (match && match.groups && match.groups.repoName) {
        return match.groups.repoName;
    }
    // Default value if not found
    return "repository";
}
