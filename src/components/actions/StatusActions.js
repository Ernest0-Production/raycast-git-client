"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStageAction = FileStageAction;
exports.FileUnstageAction = FileUnstageAction;
exports.FileDiscardAction = FileDiscardAction;
exports.FileRestoreAction = FileRestoreAction;
exports.FileStageAllAction = FileStageAllAction;
exports.FileUnstageAllAction = FileUnstageAllAction;
exports.FileDiscardAllAction = FileDiscardAllAction;
exports.CommitAction = CommitAction;
exports.ConflictAbortAction = ConflictAbortAction;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const api_2 = require("@raycast/api");
const CommitMessageView_1 = require("../../commands/views/CommitMessageView");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Action for staging a file.
 */
function FileStageAction(context) {
    const isConflicted = context.file.type === "conflicted";
    const handleStageFile = async () => {
        if (isConflicted) {
            const confirmed = await (0, api_2.confirmAlert)({
                title: "Mark as Resolved",
                message: `Are you sure you want to mark "${(0, path_1.basename)(context.file.path)}" as resolved?`,
                primaryAction: {
                    title: "Mark as Resolved"
                },
            });
            if (!confirmed)
                return;
        }
        try {
            await context.gitManager.stageFile(context.file.relativePath);
            context.status.revalidate();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: isConflicted ? "Mark as Resolved" : "Stage", onAction: handleStageFile, icon: isConflicted ? { source: api_1.Icon.Checkmark, tintColor: api_1.Color.Green } : api_1.Icon.Plus }));
}
/**
 * Action for unstaging a file.
 */
function FileUnstageAction(context) {
    const handleUnstageFile = async () => {
        try {
            await context.gitManager.unstageFile(context.file.relativePath);
            context.status.revalidate();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    return (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Unstage", onAction: handleUnstageFile, icon: api_1.Icon.Minus });
}
/**
 * Action for discarding changes to a file.
 */
function FileDiscardAction(context) {
    if (context.file.type === "added" && (0, fs_1.existsSync)(context.file.path)) {
        return ((0, jsx_runtime_1.jsx)(api_1.Action.Trash, { shortcut: { modifiers: ["ctrl"], key: "x" }, paths: [context.file.path], onTrash: context.status.revalidate }));
    }
    const handleDiscardChanges = async () => {
        const confirmed = await (0, api_2.confirmAlert)({
            title: "Discard changes",
            message: `Are you sure you want to discard changes in file "${(0, path_1.basename)(context.file.path)}"? This action cannot be undone.`,
            primaryAction: {
                title: "Discard changes",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            try {
                await context.gitManager.discardChanges(context.file.relativePath);
                context.status.revalidate();
            }
            catch (error) {
                // Git error is already shown by GitManager
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Discard Changes", onAction: handleDiscardChanges, icon: api_1.Icon.ArrowCounterClockwise, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["ctrl"], key: "x" } }));
}
/**
 * Action for restoring a file to a previous commit.
 */
function FileRestoreAction(context) {
    const handleRestore = async () => {
        const confirmed = await (0, api_2.confirmAlert)({
            title: context.before ? "Restore File to Before Commit" : "Restore File to This Commit",
            message: `Are you sure you want to restore '${(0, path_1.basename)(context.filePath)}' to commit ${context.commit}? This will modify the working tree`,
            primaryAction: {
                title: "Restore",
                style: api_1.Alert.ActionStyle.Destructive
            },
        });
        if (!confirmed)
            return;
        try {
            await context.gitManager.restoreFileToCommit(context.filePath, context.before ? `${context.commit.hash}^` : context.commit.hash);
            context.status.revalidate();
        }
        catch (error) {
            // Error toast is shown by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: context.before ? "Restore File to Before Commit" : "Restore File to This Commit", icon: api_1.Icon.RotateClockwise, style: api_1.Action.Style.Destructive, onAction: handleRestore }));
}
/**
 * Action for staging all files.
 */
function FileStageAllAction(context) {
    const handleStageAll = async () => {
        try {
            await context.gitManager.stageAll();
            context.status.revalidate();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Stage All Files", onAction: handleStageAll, icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd", "shift"], key: "a" } }));
}
/**
 * Action for unstaging all files.
 */
function FileUnstageAllAction(context) {
    const handleUnstageAll = async () => {
        try {
            await context.gitManager.unstageAll();
            context.status.revalidate();
        }
        catch (error) {
            // Git error is already shown by GitManager
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Unstage All Files", onAction: handleUnstageAll, icon: api_1.Icon.Minus, shortcut: { modifiers: ["cmd", "shift"], key: "z" } }));
}
/**
 * Action for discarding all changes.
 */
function FileDiscardAllAction(context) {
    const handleDiscardAll = async () => {
        const confirmed = await (0, api_2.confirmAlert)({
            title: "Discard All Changes",
            message: "Are you sure you want to discard all unstaged changes? This action cannot be undone.",
            primaryAction: {
                title: "Discard All Changes",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            try {
                await context.gitManager.discardAllChanges();
                context.status.revalidate();
            }
            catch (error) {
                // Git error is already shown by GitManager
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Discard All Changes", onAction: handleDiscardAll, icon: api_1.Icon.ArrowCounterClockwise, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["ctrl", "cmd"], key: "x" } }));
}
/**
 * Action to commit changes or continue a rebase/merge.
 */
function CommitAction(context) {
    const hasStagedFiles = context.status.data?.files.some((f) => f.status === "staged");
    const hasConflictedFiles = context.status.data?.files.some((f) => f.type === "conflicted");
    if (context.status.data?.conflict) {
        if (hasConflictedFiles) {
            return null; // Don't show if there are still conflicts
        }
        switch (context.status.data.conflict.type) {
            case "rebase":
                const handleContinueRebase = async () => {
                    try {
                        await context.gitManager.continueRebase();
                    }
                    // Git error is already shown by GitManager
                    catch (error) { }
                    context.status.revalidate();
                    context.branches.revalidate();
                    context.commits.revalidate();
                };
                return (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Continue Rebase", onAction: handleContinueRebase, icon: { source: api_1.Icon.ArrowRight, tintColor: api_1.Color.Blue }, shortcut: { modifiers: ["cmd", "shift"], key: "enter" } });
            case "merge":
                const handleCommitMerge = async () => {
                    try {
                        await context.gitManager.commitMerge();
                    }
                    catch (error) { }
                    context.status.revalidate();
                    context.branches.revalidate();
                    context.commits.revalidate();
                };
                return (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Commit Merge", onAction: handleCommitMerge, icon: { source: api_1.Icon.Check, tintColor: api_1.Color.Green }, shortcut: { modifiers: ["cmd", "shift"], key: "enter" } });
            case "squash":
                // It should be regular commit
                break;
            case undefined:
                return null;
        }
    }
    if (hasStagedFiles && context.branches.data.currentBranch) {
        return ((0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Commit Changes", icon: { source: api_1.Icon.Checkmark, tintColor: api_1.Color.Green }, target: (0, jsx_runtime_1.jsx)(CommitMessageView_1.CommitMessageForm, { ...context }), shortcut: { modifiers: ["cmd", "shift"], key: "enter" } }));
    }
    return null;
}
/**
 * Action to abort a rebase or merge.
 */
function ConflictAbortAction(context) {
    if (!context.status.data?.conflict) {
        return null;
    }
    switch (context.status.data.conflict?.type) {
        case "rebase":
            return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Abort Rebase", onAction: async () => {
                    const confirmed = await (0, api_2.confirmAlert)({
                        title: "Abort Rebase",
                        message: "Are you sure you want to abort the rebase? This action cannot be undone.",
                        primaryAction: {
                            title: "Abort Rebase",
                            style: api_1.Alert.ActionStyle.Destructive,
                        },
                    });
                    if (confirmed) {
                        await context.gitManager.abortRebase();
                        context.status.revalidate();
                    }
                }, icon: api_1.Icon.XMarkCircleHalfDash, style: api_1.Action.Style.Destructive }));
        case "merge":
        case undefined:
            return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Abort Merge", onAction: async () => {
                    const confirmed = await (0, api_2.confirmAlert)({
                        title: "Abort Merge",
                        message: "Are you sure you want to abort the merge? This action cannot be undone.",
                        primaryAction: {
                            title: "Abort Merge",
                            style: api_1.Alert.ActionStyle.Destructive,
                        },
                    });
                    if (confirmed) {
                        await context.gitManager.abortMerge();
                        context.status.revalidate();
                    }
                }, icon: api_1.Icon.XMarkCircleHalfDash, style: api_1.Action.Style.Destructive }));
    }
}
