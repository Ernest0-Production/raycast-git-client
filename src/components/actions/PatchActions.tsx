import { Action, ActionPanel, useNavigation, Clipboard, Form, Icon, confirmAlert, Alert } from "@raycast/api";
import { FileStatus, PatchScope } from "../../types";
import { RepositoryContext } from "../../open-repository";
import { useCachedState } from "@raycast/utils";
import { existsSync } from "fs";
import { useEffect, useState } from "react";
import { basename } from "path";


/**
 * Action to create a patch for all unstaged changes.
 */
export function PatchCreateAction(context: RepositoryContext) {
    return (
        <ActionPanel.Submenu
            title="Save as Patch"
            icon={`patch.svg`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        >
            <Action.Push
                title="All Changes"
                target={<PatchCreateForm scope={PatchScope.ALL} {...context} />}
            />
            <Action.Push
                title="Only Staged"
                target={<PatchCreateForm scope={PatchScope.STAGED} {...context} />}
            />
            <Action.Push
                title="Only Unstaged"
                target={<PatchCreateForm scope={PatchScope.UNSTAGED} {...context} />}
            />
        </ActionPanel.Submenu>
    );
}

function PatchCreateForm(context: RepositoryContext & { scope: PatchScope }) {
    const { pop } = useNavigation();
    const [directoryPath, setDirectoryPath] = useCachedState<string[]>(`patches-directory`, []);

    const validateDirectoryPath = (directoryPath: string[]) => {
        if (directoryPath.length === 0) {
            return "Required";
        }

        if (!existsSync(directoryPath[0])) {
            return "Not exists";
        }

        return undefined;
    };

    const handleSubmit = async (values: { directoryPath: string[] }) => {
        try {
            const patchPath = await context.gitManager.createPatch(values.directoryPath[0], context.scope);
            await Clipboard.copy(patchPath);
            pop();
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    return (
        <Form
            navigationTitle="Create Patch"
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Create Patch" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.FilePicker
                id="directoryPath"
                title="Output Directory"
                value={directoryPath}
                error={validateDirectoryPath(directoryPath)}
                onChange={setDirectoryPath}
                allowMultipleSelection={false}
                canChooseDirectories
                canChooseFiles={false}
            />
        </Form>
    );
}

/**
 * Action to create a patch for a specific file.
 */
export function PatchCreateForFileAction(context: RepositoryContext & { file: FileStatus }) {
    return (
        <Action.Push
            title="Save File as Patch"
            icon={`patch.svg`}
            target={<PatchCreateForFileForm {...context} />}
        />
    );
}

function PatchCreateForFileForm(context: RepositoryContext & { file: FileStatus }) {
    const { pop } = useNavigation();
    const [directoryPath, setDirectoryPath] = useCachedState<string[]>(`patches-directory`, []);

    const validateDirectoryPath = (directoryPath: string[]) => {
        if (directoryPath.length === 0) {
            return "Required";
        }

        if (!existsSync(directoryPath[0])) {
            return "Not exists";
        }

        return undefined;
    };

    const handleSubmit = async (values: { directoryPath: string[] }) => {
        try {
            const patchPath = await context.gitManager.createPatchForFile(
                context.file.relativePath,
                context.file.status,
                values.directoryPath[0]
            );
            await Clipboard.copy(patchPath);
            pop();
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    return (
        <Form
            navigationTitle={`Create Patch for ${basename(context.file.relativePath)}`}
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Create Patch" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.FilePicker
                id="directoryPath"
                title="Output Directory"
                value={directoryPath}
                error={validateDirectoryPath(directoryPath)}
                onChange={setDirectoryPath}
                allowMultipleSelection={false}
                canChooseDirectories
                canChooseFiles={false}
            />
        </Form>
    );
}

export function PatchApplyAction(context: RepositoryContext) {
    return (
        <Action.Push
            title="Apply Patch"
            icon={Icon.Download}
            target={<PatchApplyForm {...context} />}
        />
    );
}

function PatchApplyForm(context: RepositoryContext) {
    const { pop } = useNavigation();
    const [patchFilePath, setPatchFilePath] = useState<string[]>([]);

    useEffect(() => {
        (async () => {
            const content = await Clipboard.read();
            if (!content.file) return;
            const filePath = decodeURIComponent(content.file).replace('file://', '');

            if (filePath.endsWith(".patch") && existsSync(filePath)) {
                setPatchFilePath([filePath]);
            }
        })();
    }, []);

    const handleSubmit = async (values: { patchFilePath: string[] }) => {
        try {
            const confirmed = await confirmAlert({
                title: "Apply Patch",
                message: "Are you sure you want to apply the patch? This action cannot be undone.",
                primaryAction: {
                    title: "Apply",
                    style: Alert.ActionStyle.Destructive,
                },
            });

            if (confirmed) {
                await context.gitManager.applyPatch(patchFilePath[0]);
                context.status.revalidate();
                pop();
            }
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    return (
        <Form
            navigationTitle="Apply Patch"
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Apply Patch" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.FilePicker
                id="patchFilePath"
                title="Patch File"
                value={patchFilePath}
                error={patchFilePath.length === 0 ? "Required" : undefined}
                info="It should be a '.patch' file"
                onChange={setPatchFilePath}
                allowMultipleSelection={false}
                canChooseDirectories={false}
                canChooseFiles={true}
            />
        </Form>
    );
}
