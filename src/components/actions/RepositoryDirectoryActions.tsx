import { Action, ActionPanel, Icon, getPreferenceValues, getApplications, open, confirmAlert, Alert, Application } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useCachedState, usePromise } from "@raycast/utils";
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
  const { data: applications } = usePromise(() => getApplications(repositoryPath));
  const [defaultApp, setDefaultApp] = useCachedState<Application | undefined>(`${repositoryPath}:repo-default-app`, undefined);

  async function handleOpenWith(app: Application) {
    const remember = await confirmAlert({
      title: "Remember choise?",
      message: `Do you want to remember "${app.name}" as the default app for this repository?`,
      primaryAction: {
        title: "Remember",
        style: Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "No",
      }
    });

    await open(repositoryPath, app);
    onOpen?.();

    if (remember) {
      setDefaultApp(app);
    }
  }

  function handleChangeDefault(app: Application) {
    setDefaultApp(app);
  }

  return (
    <ActionPanel.Section title={repositoryPath.split("/").pop() || repositoryPath}>
      {defaultApp ? (
        <Action.Open
          key={defaultApp.bundleId || defaultApp.path}
          title="Open Repository"
          icon={{ fileIcon: defaultApp.path }}
          application={defaultApp}
          target={repositoryPath}
          onOpen={() => onOpen?.()}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
      ) : (
        <ActionPanel.Submenu
          title="Open Repository"
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        >
          {applications?.map((app: Application) => (
            <Action
              key={app.path}
              title={app.name}
              icon={{ fileIcon: app.path }}
              onAction={() => handleOpenWith(app)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
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
          shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          onOpen={() => onOpen?.()}
        />
      )}
      <Action.OpenWith
        path={repositoryPath}
        title="Open Repository with…"
        onOpen={() => onOpen?.()}
        shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "o" }}
      />
      {defaultApp && (
        <ActionPanel.Submenu
          title="Change Repository Default App"
          icon={Icon.AppWindow}
        >
          {applications?.map((app: Application) => (
            <Action
              key={app.path}
              title={app.name}
              icon={{ fileIcon: app.path }}
              onAction={() => handleChangeDefault(app)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action.CopyToClipboard
        title="Copy Repository Path"
        content={repositoryPath}
      />
    </ActionPanel.Section>
  );
}
