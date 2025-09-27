import { Color, Icon } from "@raycast/api";
import { RemoteProvider } from "../../types/git-types";

export function getRemoteHostIcon(provider: RemoteProvider) {
    switch (provider) {
        case "github":
            return { source: "github.svg", tintColor: Color.PrimaryText };
        case "gitlab":
            return { source: "gitlab.svg", tintColor: Color.Red };
        case "bitbucket":
            return { source: "bitbucket.svg", tintColor: Color.Blue };
        case "azure-devops":
            return { source: "azure-devops.svg", tintColor: Color.Blue };
        case "gitea":
            return { source: "gitea.svg", tintColor: Color.Green };
        default:
            return { source: Icon.Globe, tintColor: Color.SecondaryText };
    }
}
