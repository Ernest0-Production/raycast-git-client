import { Action, Icon, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../../types";

interface RepositoryDirectoryActionsProps {
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
export function RepositoryDirectoryActions({ repositoryPath, secondary = false }: RepositoryDirectoryActionsProps) {
    const preferences = getPreferenceValues<Preferences>();

    return (
        <>
            <Action.Open
                title={secondary ? "Open Repository in Default Editor" : "Open in Default Editor"}
                target={repositoryPath}
                application={preferences.defaultEditor}
                icon={Icon.Folder}
                shortcut={secondary ? undefined : { modifiers: ["cmd"], key: "o" }}
            />
            <Action.ShowInFinder
                path={repositoryPath}
                title={secondary ? "Show Repository in Finder" : "Show in Finder"}
                shortcut={secondary ? undefined : { modifiers: ["cmd", "shift"], key: "o" }}
            />
            <Action.Open
                title={secondary ? "Open Repository in Terminal" : "Open in Terminal"}
                target={repositoryPath}
                application="Terminal"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action.OpenWith
                path={repositoryPath}
                title={secondary ? "Open Repository With..." : undefined}
                shortcut={secondary ? undefined : { modifiers: ["cmd", "opt"], key: "o" }}
            />
            <Action.CopyToClipboard
                title={secondary ? "Copy Repository Path" : "Copy Directory Path"}
                content={repositoryPath}
                shortcut={secondary ? undefined : { modifiers: ["cmd", "shift"], key: "," }}
            />
        </>
    );
}
