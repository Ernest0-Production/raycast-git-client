import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../../types";

interface RepositoryDirectoryActionsProps {
  /** Path to the repository directory */
  repositoryPath: string;
  /** Callback called when repository is opened via any "Open" action */
  onOpen?: () => void;
}

/**
 * Reusable actions for working with repository as a directory.
 * Includes file system operations and opening in various applications.
 */
export function RepositoryDirectoryActions({ repositoryPath, onOpen }: RepositoryDirectoryActionsProps) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <ActionPanel.Section title="Repository">
      <Action.Open
        title={`Open Repository in ${preferences.defaultEditor.name}`}
        target={repositoryPath}
        application={preferences.defaultEditor}
        icon={{ fileIcon: preferences.defaultEditor.path }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        onOpen={() => onOpen?.()}
      />
      <Action.Open
        title={`Open Repository in ${preferences.defaultTerminal.name}`}
        target={repositoryPath}
        application={preferences.defaultTerminal}
        icon={{ fileIcon: preferences.defaultTerminal.path }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        onOpen={() => onOpen?.()}
      />
      {preferences.externalGitClient && (
        <Action.Open
          title={`Open Repository in ${preferences.externalGitClient.name}`}
          target={repositoryPath}
          application={preferences.externalGitClient}
          icon={{ fileIcon: preferences.externalGitClient.path }}
          shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "o" }}
          onOpen={() => onOpen?.()}
        />
      )}
      <Action.OpenWith path={repositoryPath} title="Open Repository with…" onOpen={() => onOpen?.()} />
      <Action.CopyToClipboard title="Copy Repository Path" content={repositoryPath} />
    </ActionPanel.Section>
  );
}
