import { Color, Icon } from "@raycast/api";
import { RemoteProvider } from "../../types/git-types";

export function RemoteHostIcon(provider: RemoteProvider) {
    switch (provider) {
        case "GitHub":
            return { source: "github.svg", tintColor: Color.PrimaryText };
        case "GitLab":
            return { source: "gitlab.svg", tintColor: Color.Red };
        case "Bitbucket":
            return { source: "bitbucket.svg", tintColor: Color.Blue };
        case "Azure DevOps":
            return { source: "azure-devops.svg", tintColor: Color.Blue };
        case "Gitea":
            return { source: "gitea.svg", tintColor: Color.Green };
        default:
            return { source: Icon.Globe, tintColor: Color.SecondaryText };
    }
}
