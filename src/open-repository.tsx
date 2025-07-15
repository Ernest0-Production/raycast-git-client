import { Action, Icon } from "@raycast/api";
import { GitView } from "./types";
import { useCachedState } from "@raycast/utils";
import { useGitRepository } from "./hooks/useGitRepository";
import { ErrorView } from "./components/shared/ErrorView";
import { BranchesView } from "./commands/views/BranchesView";
import { StatusView } from "./commands/views/StatusView";
import { CommitsView } from "./commands/views/CommitsView";
import { StashesView } from "./commands/views/StashesView";

interface Arguments {
  path: string;
}

export default function OpenRepository({ arguments: args }: { arguments: Arguments }) {
  const [currentView, setCurrentView] = useCachedState<GitView>("git-current-view", "commits");
  const repositoryPath = args.path;

  // Hook for working with a Git repository (synchronous validation)
  const { data: gitManager, error: repoError } = useGitRepository(repositoryPath);

  // Validation error state
  if (repoError || !gitManager) {
    return (
      <ErrorView
        title="Error opening repository"
        message={repoError?.message || "Unknown error"}
        navigationTitle="Git Repository"
        onRetry={undefined}
      />
    );
  }

  // Navigation actions for all views
  const navigationActions = (
    <>
      <Action
        title="Go to Status"
        onAction={() => setCurrentView("status")}
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "1" }}
      />
      <Action
        title="Go to Commits"
        onAction={() => setCurrentView("commits")}
        icon={Icon.List}
        shortcut={{ modifiers: ["cmd"], key: "2" }}
      />
      <Action
        title="Go to Branches"
        onAction={() => setCurrentView("branches")}
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["cmd"], key: "3" }}
      />
      <Action
        title="Go to Stash"
        onAction={() => setCurrentView("stashes")}
        icon={Icon.Box}
        shortcut={{ modifiers: ["cmd"], key: "4" }}
      />
      <Action.ShowInFinder path={repositoryPath} title="Show in Finder" shortcut={{ modifiers: ["cmd"], key: "o" }} />
    </>
  );

  // Render the corresponding view
  switch (currentView) {
    case "branches":
      return <BranchesView gitManager={gitManager} navigationActions={navigationActions} />;
    case "status":
      return <StatusView gitManager={gitManager} navigationActions={navigationActions} />;
    case "commits":
      return <CommitsView gitManager={gitManager} navigationActions={navigationActions} />;
    case "stashes":
      return (
        <StashesView
          gitManager={gitManager}
          navigationActions={navigationActions}
          onNavigateToStatus={() => setCurrentView("status")}
        />
      );
    default:
      return <StatusView gitManager={gitManager} navigationActions={navigationActions} />;
  }
}
