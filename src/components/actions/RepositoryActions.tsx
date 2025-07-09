import { Action, Icon, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../../types";

interface RepositoryActionsProps {
    /** Path to the repository directory */
    repositoryPath: string;
    /** Whether repository actions have secondary priority (removes shortcuts) */
    secondary?: boolean;
}

/**
 * Reusable actions for working with repository as a directory.
 * Includes file system operations and opening in various applications.
 * When secondary=true, removes shortcuts to avoid conflicts with primary file actions.
 */
export function RepositoryActions({ repositoryPath, secondary = false }: RepositoryActionsProps) {
    const preferences = getPreferenceValues<Preferences>();

    return (
        <>
            <Action.Open
                title="Open in Default Editor"
                target={repositoryPath}
                application={preferences.defaultEditor}
                icon={Icon.Folder}
                shortcut={secondary ? undefined : { modifiers: ["cmd"], key: "o" }}
            />
            <Action.ShowInFinder
                path={repositoryPath}
                title="Show in Finder"
                shortcut={secondary ? undefined : { modifiers: ["cmd", "shift"], key: "o" }}
            />
            <Action.Open
                title="Open in Terminal"
                target={repositoryPath}
                application="Terminal"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action.OpenWith
                path={repositoryPath}
                shortcut={secondary ? undefined : { modifiers: ["cmd", "opt"], key: "o" }}
            />
            <Action.CopyToClipboard
                title="Copy Directory Path"
                content={repositoryPath}
                shortcut={secondary ? undefined : { modifiers: ["cmd", "shift"], key: "," }}
            />
        </>
    );
}
