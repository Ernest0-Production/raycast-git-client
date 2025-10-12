import { Action, Icon, Color, Alert } from "@raycast/api";
import { RepositoryContext } from "../../open-repository";
import { confirmAlert } from "@raycast/api";
import { Commit, FileStatus } from "../../types";
import { CommitMessageForm } from "../../commands/views/CommitMessageView";
import { existsSync } from "fs";
import { basename } from "path";

/**
 * Action for staging a file.
 */
export function FileStageAction(context: RepositoryContext & { file: FileStatus }) {
    const isConflicted = context.file.type === "conflicted";

    const handleStageFile = async () => {
        if (isConflicted) {
            const confirmed = await confirmAlert({
                title: "Mark as Resolved",
                message: `Are you sure you want to mark "${basename(context.file.path)}" as resolved?`,
                primaryAction: {
                    title: "Mark as Resolved"
                },
            });

            if (!confirmed) return;
        }

        try {
            await context.gitManager.stageFile(context.file.relativePath);
            context.status.revalidate();
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    return (
        <Action
            title={isConflicted ? "Mark as Resolved" : "Stage"}
            onAction={handleStageFile}
            icon={isConflicted ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Plus}
        />
    );
}

/**
 * Action for unstaging a file.
 */
export function FileUnstageAction(context: RepositoryContext & { file: FileStatus }) {
    const handleUnstageFile = async () => {
        try {
            await context.gitManager.unstageFile(context.file.relativePath);
            context.status.revalidate();
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    return <Action title="Unstage" onAction={handleUnstageFile} icon={Icon.Minus} />;
}

/**
 * Action for discarding changes to a file.
 */
export function FileDiscardAction(context: RepositoryContext & { file: FileStatus }) {
    if (context.file.type === "added" && existsSync(context.file.path)) {
        return (
            <Action.Trash
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                paths={[context.file.path]}
                onTrash={context.status.revalidate}
            />
        )
    }

    const handleDiscardChanges = async () => {
        const confirmed = await confirmAlert({
            title: "Discard changes",
            message: `Are you sure you want to discard changes in file "${basename(context.file.path)}"? This action cannot be undone.`,
            primaryAction: {
                title: "Discard changes",
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (confirmed) {
            try {
                await context.gitManager.discardChanges(context.file.relativePath);
                context.status.revalidate();
            } catch (error) {
                // Git error is already shown by GitManager
            }
        }
    };

    return (
        <Action
            title="Discard Changes"
            onAction={handleDiscardChanges}
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
    );
}

/**
 * Action for restoring a file to a previous commit.
 */
export function FileRestoreAction(context: RepositoryContext & { filePath: string, before?: boolean, commit: Commit }) {
    const handleRestore = async () => {
        const confirmed = await confirmAlert({
            title: context.before ? "Restore File to Before Commit" : "Restore File to This Commit",
            message: `Are you sure you want to restore '${basename(context.filePath)}' to commit ${context.commit}? This will modify the working tree`,
            primaryAction: {
                title: "Restore",
                style: Alert.ActionStyle.Destructive
            },
        });

        if (!confirmed) return;
        try {
            await context.gitManager.restoreFileToCommit(context.filePath, context.before ? `${context.commit.hash}^` : context.commit.hash);
            context.status.revalidate();
        } catch (error) {
            // Error toast is shown by GitManager
        }
    };

    return (
        <Action
            title={context.before ? "Restore File to Before Commit" : "Restore File to This Commit"}
            icon={Icon.RotateClockwise}
            style={Action.Style.Destructive}
            onAction={handleRestore}
        />
    );
}

/**
 * Action for staging all files.
 */
export function FileStageAllAction(context: RepositoryContext) {
    const handleStageAll = async () => {
        try {
            await context.gitManager.stageAll();
            context.status.revalidate();
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    return (
        <Action
            title="Stage All Files"
            onAction={handleStageAll}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        />
    );
}

/**
 * Action for unstaging all files.
 */
export function FileUnstageAllAction(context: RepositoryContext) {
    const handleUnstageAll = async () => {
        try {
            await context.gitManager.unstageAll();
            context.status.revalidate();
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    return (
        <Action
            title="Unstage All Files"
            onAction={handleUnstageAll}
            icon={Icon.Minus}
            shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
        />
    );
}

/**
 * Action for discarding all changes.
 */
export function FileDiscardAllAction(context: RepositoryContext) {
    const handleDiscardAll = async () => {
        const confirmed = await confirmAlert({
            title: "Discard All Changes",
            message: "Are you sure you want to discard all unstaged changes? This action cannot be undone.",
            primaryAction: {
                title: "Discard All Changes",
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (confirmed) {
            try {
                await context.gitManager.discardAllChanges();
                context.status.revalidate();
            } catch (error) {
                // Git error is already shown by GitManager
            }
        }
    };

    return (
        <Action
            title="Discard All Changes"
            onAction={handleDiscardAll}
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "cmd"], key: "x" }}
        />
    );
}

/**
 * Action to commit changes or continue a rebase/merge.
 */
export function CommitChangesAction(context: RepositoryContext) {
    const hasStagedFiles = context.status.data?.files.some((f) => f.status === "staged");
    const hasConflictedFiles = context.status.data?.files.some((f) => f.type === "conflicted");

    if (context.status.data?.conflict) {
        if (hasConflictedFiles) {
            return null; // Don't show if there are still conflicts
        }

        switch (context.status.data.conflict.type) {
            case "rebase":
                const handleContinueRebase = async () => {
                    try { await context.gitManager.continueRebase(); }
                    // Git error is already shown by GitManager
                    catch (error) { }
                    context.status.revalidate();
                    context.branches.revalidate();
                    context.commits.revalidate();
                };
                return <
                    Action title="Continue Rebase"
                    onAction={handleContinueRebase}
                    icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />;

            case "merge":
                const handleCommitMerge = async () => {
                    try { await context.gitManager.commitMerge(); }
                    catch (error) { }
                    context.status.revalidate();
                    context.branches.revalidate();
                    context.commits.revalidate();
                };

                return <Action
                    title="Commit Merge"
                    onAction={handleCommitMerge}
                    icon={{ source: Icon.Check, tintColor: Color.Green }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />;

            case "squash":
                // It should be regular commit
                break;

            case undefined:
                return null;
        }
    }

    if (!context.branches.data.currentBranch) return undefined;

    return (
        <>
            {hasStagedFiles &&
                <Action.Push
                    title="Commit Staged Changes"
                    icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
                    target={<CommitMessageForm {...context} />}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
            }
            <Action.Push
                title="Commit All Changes"
                icon={{ source: Icon.Checkmark, tintColor: Color.Yellow }}
                target={<CommitMessageForm {...context} />}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "enter" }}
                onPush={async () => {
                    await context.gitManager.stageAll();
                    context.status.revalidate();
                }}
            />
        </>
    );
}

/**
 * Action to abort a rebase or merge.
 */
export function ConflictAbortAction(context: RepositoryContext) {
    if (!context.status.data?.conflict) {
        return null;
    }

    switch (context.status.data.conflict?.type) {
        case "rebase":
            return (
                <Action
                    title="Abort Rebase"
                    onAction={async () => {
                        const confirmed = await confirmAlert({
                            title: "Abort Rebase",
                            message: "Are you sure you want to abort the rebase? This action cannot be undone.",
                            primaryAction: {
                                title: "Abort Rebase",
                                style: Alert.ActionStyle.Destructive,
                            },
                        });

                        if (confirmed) {
                            await context.gitManager.abortRebase();
                            context.status.revalidate();
                        }
                    }}
                    icon={Icon.XMarkCircleHalfDash}
                    style={Action.Style.Destructive}
                />
            );
        case "merge":
        case undefined:
            return (
                <Action
                    title="Abort Merge"
                    onAction={async () => {
                        const confirmed = await confirmAlert({
                            title: "Abort Merge",
                            message: "Are you sure you want to abort the merge? This action cannot be undone.",
                            primaryAction: {
                                title: "Abort Merge",
                                style: Alert.ActionStyle.Destructive,
                            },
                        });

                        if (confirmed) {
                            await context.gitManager.abortMerge();
                            context.status.revalidate();
                        }
                    }}
                    icon={Icon.XMarkCircleHalfDash}
                    style={Action.Style.Destructive}
                />
            );
    }
}
