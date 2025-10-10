"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteHostIcon = RemoteHostIcon;
const api_1 = require("@raycast/api");
function RemoteHostIcon(provider) {
    switch (provider) {
        case "GitHub":
            return { source: "github.svg", tintColor: api_1.Color.PrimaryText };
        case "GitLab":
            return { source: "gitlab.svg", tintColor: api_1.Color.Red };
        case "Bitbucket":
            return { source: "bitbucket.svg", tintColor: api_1.Color.Blue };
        case "Azure DevOps":
            return { source: "azure-devops.svg", tintColor: api_1.Color.Blue };
        case "Gitea":
            return { source: "gitea.svg", tintColor: api_1.Color.Green };
        default:
            return { source: api_1.Icon.Globe, tintColor: api_1.Color.SecondaryText };
    }
}
