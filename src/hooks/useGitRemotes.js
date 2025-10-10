"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitRemotes = useGitRemotes;
const utils_1 = require("@raycast/utils");
const remote_host_parser_1 = require("../utils/remote-host-parser");
/**
 * Hook for fetching Git remotes metadata.
 * Returns a dictionary keyed by remote name.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
function useGitRemotes(gitManager) {
    const { data: remotes = [], isLoading, revalidate } = (0, utils_1.useCachedPromise)(async (repoPath) => gitManager.getRemotes(), [gitManager.repoPath], {
        initialData: []
    });
    const remotesRecords = remotes.reduce((dictionary, remote) => {
        const primaryUrl = remote.fetchUrl || remote.pushUrl || "";
        const parser = (0, remote_host_parser_1.remoteHostParser)(primaryUrl);
        const info = {
            name: remote.name,
            fetchUrl: remote.fetchUrl,
            pushUrl: remote.pushUrl,
            type: detectRemoteProtocol(primaryUrl),
            organizationName: parser.organizationName,
            repositoryName: parser.repositoryName,
            provider: parser.provider,
            pages: {
                get mainPage() { return parser.repositoryWebUrl; },
                get pullRequests() { return parser.pullRequestsListUrl; },
                commitPage: parser.commitUrl,
                createPullRequestForm: parser.createPullRequestUrl,
            }
        };
        dictionary[remote.name] = info;
        return dictionary;
    }, {});
    return {
        data: remotesRecords,
        isLoading,
        revalidate
    };
}
function detectRemoteProtocol(url) {
    const lower = url.toLowerCase();
    if (lower.startsWith("ssh://") || /^[^@\s]+@[^:]+:/.test(url)) {
        return "ssh";
    }
    return "http";
}
