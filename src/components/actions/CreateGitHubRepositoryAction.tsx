import { Action } from "@raycast/api";
import { RepositoryContext } from "../../open-repository";

/**
 * Action that opens GitHub's "Create new repository" page with the repository name
 * pre-filled from the current repository's folder name.
 */
export function CreateGitHubRepositoryAction(context: RepositoryContext) {
  const url = `https://github.com/new?name=${encodeURIComponent(context.gitManager.repoName)}`;
  return (
    <Action.OpenInBrowser
      title="Create GitHub Repository"
      url={url}
      icon={"github.svg"}
      shortcut={{ modifiers: ["shift", "cmd"], key: "n" }}
    />
  );
}
