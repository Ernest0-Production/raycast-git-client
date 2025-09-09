import { Action, Icon, confirmAlert, Alert } from "@raycast/api";
import { GitManager } from "../../utils/git-utils";
import { Commit } from "../../types";
import { CreateTagForm } from "../shared/CreateTagForm";

interface TagActionProps {
    commit: Commit;
    gitManager: GitManager;
    onRefresh: () => void;
}

/**
 * Action for creating a tag on a commit.
 */
export function TagCreateAction({ commit, gitManager, onRefresh }: TagActionProps) {
    return (
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
    );
}

/**
 * Action for removing a tag from a commit.
 */
export function TagRemoveAction({
    tagName,
    gitManager,
    onRefresh
}: {
    tagName: string;
    gitManager: GitManager;
    onRefresh: () => void;
}) {
    const handleRemoveTag = async () => {
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
        <Action
            title={`Remove Tag "${tagName}"`}
            onAction={handleRemoveTag}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
        />
    );
}
