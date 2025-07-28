import { Action, Icon, confirmAlert, Alert } from "@raycast/api";
import { GitManager } from "../../utils/git-utils";
import { Commit } from "../../types";
import { CreateTagForm } from "../shared/CreateTagForm";

interface TagActionsProps {
    commit: Commit;
    gitManager: GitManager;
    onRefresh: () => void;
}

/**
 * Reusable actions for working with tags on commits.
 */
export function TagActions({ commit, gitManager, onRefresh }: TagActionsProps) {
    const handleRemoveTag = async (tagName: string) => {
        const confirmed = await confirmAlert({
            title: "Remove tag",
            message: `Are you sure you want to remove tag "${tagName}"?`,
            primaryAction: {
                title: "Remove",
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (!confirmed) return;

        try {
            await gitManager.deleteTag(tagName);

            const shouldPushTags = await confirmAlert({
                title: "Push tag deletion to remote?",
                message: `Tag "${tagName}" was removed successfully. Do you want to push changes to remote repository?`,
                primaryAction: {
                    title: "Push",
                    style: Alert.ActionStyle.Destructive,
                },
                dismissAction: {
                    title: "Don't Push",
                },
            });

            if (shouldPushTags) {
                await gitManager.pushTag(tagName, undefined, true);
            }

            onRefresh();
        } catch (error) {
            // Git error is already shown by GitManager
        }
    };

    return (
        <>
            <Action.Push
                title="Create Tag"
                target={
                    <CreateTagForm
                        commit={commit}
                        gitManager={gitManager}
                        onRefresh={onRefresh} />
                }
                icon={Icon.Tag}
                shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
            />
            {commit.tags.map((tag) => (
                <Action
                    key={tag}
                    title={`Remove Tag "${tag}"`}
                    onAction={() => handleRemoveTag(tag)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                />
            ))}
        </>
    );
}
