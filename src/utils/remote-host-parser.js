"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteHostParser = remoteHostParser;
/**
 * Remote host parser.
 * Parser for remote host URLs.
 * @param url - The URL to parse.
 * @returns The parsed remote host info.
 */
function remoteHostParser(url) {
    const parsed = parse(url);
    if (!parsed) {
        return unknownParser(url);
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname.includes("github")) {
        return githubParser(url, parsed);
    }
    if (hostname.includes("gitlab")) {
        return gitlabParser(url, parsed);
    }
    if (hostname.includes("bitbucket")) {
        return bitbucketParser(url, parsed);
    }
    if (hostname.includes("azure-devops")) {
        return azureDevopsParser(url, parsed);
    }
    if (hostname.includes("gitea")) {
        return giteaParser(url, parsed);
    }
    return unknownParser(url, parsed);
}
// --- provider-specific parsers ----------------------------------------------
function githubParser(_url, parsed) {
    const { protocol: scheme, hostname, path } = parsed;
    return {
        provider: "GitHub",
        get organizationName() {
            const match = path.match(/^([^\/]+)/);
            return match ? match[1] : undefined;
        },
        get repositoryName() {
            const match = path.match(/\/([^\/]+)$/);
            return match ? match[1] : undefined;
        },
        get repositoryWebUrl() {
            return `${scheme}://${hostname}/${path}`;
        },
        get pullRequestsListUrl() {
            return `${scheme}://${hostname}/${path}/pulls`;
        },
        commitUrl(sha) {
            return `${scheme}://${hostname}/${path}/commit/${encodeURIComponent(sha)}`;
        },
        createPullRequestUrl(branchName) {
            return `${scheme}://${hostname}/${path}/compare/${encodeURIComponent(branchName)}?expand=1`;
        },
    };
}
function gitlabParser(_url, parsed) {
    const { protocol: scheme, hostname, path } = parsed;
    return {
        provider: "GitLab",
        get organizationName() {
            const match = path.match(/^([^\/]+)/);
            return match ? match[1] : undefined;
        },
        get repositoryName() {
            const match = path.match(/\/([^\/]+)$/);
            return match ? match[1] : undefined;
        },
        get repositoryWebUrl() {
            return `${scheme}://${hostname}/${path}`;
        },
        get pullRequestsListUrl() {
            return `${scheme}://${hostname}/${path}/-/merge_requests`;
        },
        commitUrl(sha) {
            return `${scheme}://${hostname}/${path}/-/commit/${encodeURIComponent(sha)}`;
        },
        createPullRequestUrl(branchName) {
            return `${scheme}://${hostname}/${path}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(branchName)}`;
        },
    };
}
function giteaParser(_url, parsed) {
    const { protocol: scheme, hostname, path } = parsed;
    return {
        provider: "Gitea",
        get organizationName() {
            const match = path.match(/^([^\/]+)/);
            return match ? match[1] : undefined;
        },
        get repositoryName() {
            const match = path.match(/\/([^\/]+)$/);
            return match ? match[1] : undefined;
        },
        get repositoryWebUrl() {
            return `${scheme}://${hostname}/${path}`;
        },
        get pullRequestsListUrl() {
            return `${scheme}://${hostname}/${path}/pulls`;
        },
        commitUrl(sha) {
            return `${scheme}://${hostname}/${path}/commit/${encodeURIComponent(sha)}`;
        },
        createPullRequestUrl(_branchName) {
            return undefined;
        },
    };
}
function bitbucketParser(_url, parsed) {
    const { protocol: scheme, hostname, path } = parsed;
    const isSelfHosted = hostname === "bitbucket.org";
    const repoBase = (() => {
        if (isSelfHosted) {
            return `${scheme}://${hostname}/${path}`;
        }
        const match = path.match(/^(?<project>[^\/]+)\/(?<repo>[^\/]+)/);
        if (!match || !match.groups)
            return undefined;
        const { project, repo } = match.groups;
        return `${scheme}://${hostname}/projects/${project}/repos/${repo}`;
    })();
    const repositoryName = (() => {
        if (isSelfHosted) {
            const m = path.match(/\/([^\/]+)$/);
            return m ? m[1] : undefined;
        }
        const m = path.match(/^([^\/]+)\/([^\/]+)/);
        return m ? m[2] : undefined;
    })();
    return {
        provider: "Bitbucket",
        get organizationName() {
            const m = path.match(/^([^\/]+)/);
            return m ? m[1] : undefined;
        },
        get repositoryName() {
            return repositoryName;
        },
        get repositoryWebUrl() {
            return repoBase;
        },
        get pullRequestsListUrl() {
            return repoBase ? `${repoBase}/pull-requests` : undefined;
        },
        commitUrl(sha) {
            return repoBase ? `${repoBase}/commits/${encodeURIComponent(sha)}` : undefined;
        },
        createPullRequestUrl(branchName) {
            if (!repoBase)
                return undefined;
            if (repoBase.includes("/projects/")) {
                return `${repoBase}/pull-requests?create&sourceBranch=${encodeURIComponent(`refs/heads/${branchName}`)}`;
            }
            return `${repoBase}/pull-requests/new?source=${encodeURIComponent(branchName)}`;
        },
    };
}
function azureDevopsParser(_url, parsed) {
    const { hostname, path } = parsed;
    const repoBase = (() => {
        if (hostname === "ssh.dev.azure.com" || hostname === "vs-ssh.visualstudio.com") {
            const pathPattern = path.startsWith("v3/")
                ? /^v3\/(?<org>[^\/]+)\/(?<project>[^\/]+)\/(?<repo>[^\/]+)$/
                : /^(?<org>[^\/]+)\/(?<project>[^\/]+)\/(?<repo>[^\/]+)$/;
            const match = path.match(pathPattern);
            if (!match || !match.groups)
                return undefined;
            const { org, project, repo } = match.groups;
            return `https://dev.azure.com/${org}/${project}/_git/${repo}`;
        }
        if (hostname === "dev.azure.com") {
            const pathPattern = /^(?<org>[^\/]+)\/(?<project>[^\/]+)(?:\/.*)?_git\/(?<repo>[^\/]+)/;
            const match = path.match(pathPattern);
            if (!match || !match.groups)
                return undefined;
            const { org, project, repo } = match.groups;
            if (!org || !project || !repo)
                return undefined;
            return `https://dev.azure.com/${org}/${project}/_git/${repo}`;
        }
        if (hostname.endsWith(".visualstudio.com")) {
            const pathPattern = /^(?<project>[^\/]+)(?:\/.*)?_git\/(?<repo>[^\/]+)/;
            const match = path.match(pathPattern);
            if (!match || !match.groups)
                return undefined;
            const { project, repo } = match.groups;
            if (!project || !repo)
                return undefined;
            return `https://${hostname}/${project}/_git/${repo}`;
        }
        return undefined;
    })();
    return {
        provider: "Azure DevOps",
        get organizationName() {
            if (hostname === "ssh.dev.azure.com" || hostname === "vs-ssh.visualstudio.com") {
                const pathPattern = path.startsWith("v3/")
                    ? /^v3\/(?<org>[^\/]+)\/(?<project>[^\/]+)\/(?<repo>[^\/]+)$/
                    : /^(?<org>[^\/]+)\/(?<project>[^\/]+)\/(?<repo>[^\/]+)$/;
                const match = path.match(pathPattern);
                return match?.groups?.org;
            }
            if (hostname === "dev.azure.com") {
                const pathPattern = /^(?<org>[^\/]+)\/(?<project>[^\/]+)(?:\/.*)?_git\/(?<repo>[^\/]+)/;
                const match = path.match(pathPattern);
                return match?.groups?.org;
            }
            if (hostname.endsWith(".visualstudio.com")) {
                const m = hostname.match(/^([^\.]+)\.visualstudio\.com$/);
                return m ? m[1] : undefined;
            }
            return undefined;
        },
        get repositoryName() {
            if (hostname === "ssh.dev.azure.com" || hostname === "vs-ssh.visualstudio.com") {
                const m = path.match(/^(?:v3\/)?[^\/]+\/[^\/]+\/([^\/]+)$/);
                return m ? m[1] : undefined;
            }
            const m = path.match(/_git\/([^\/]+)/);
            return m ? m[1] : undefined;
        },
        get repositoryWebUrl() {
            return repoBase;
        },
        get pullRequestsListUrl() {
            return repoBase ? `${repoBase}/pullrequests` : undefined;
        },
        commitUrl(sha) {
            return repoBase ? `${repoBase}/commit/${encodeURIComponent(sha)}` : undefined;
        },
        createPullRequestUrl(branchName) {
            return repoBase ? `${repoBase}/pullrequestcreate?sourceRef=${encodeURIComponent(`refs/heads/${branchName}`)}` : undefined;
        },
    };
}
function unknownParser(_url, parsed) {
    const { protocol: scheme, hostname, path } = parsed || {};
    return {
        provider: undefined,
        get organizationName() {
            return undefined;
        },
        get repositoryWebUrl() {
            return scheme && hostname && path ? `${scheme}://${hostname}/${path}` : undefined;
        },
        get repositoryName() {
            return undefined;
        },
        get pullRequestsListUrl() {
            return undefined;
        },
        commitUrl() {
            return undefined;
        },
        createPullRequestUrl() {
            return undefined;
        },
    };
}
function parse(url) {
    // Try SCP-like: user@host:path OR host:path (ssh principal)
    const scpMatch = url.match(/^[^@\s]+@([^:/]+)[:/](.+)$/);
    if (scpMatch) {
        const normalizedPath = scpMatch[2]
            .replace(/^\//, "")
            .replace(/^scm\//, "")
            .replace(/\.git$/i, "");
        return {
            protocol: "https",
            hostname: scpMatch[1],
            path: normalizedPath
        };
    }
    try {
        const parsed = new URL(url);
        const normalizedPath = parsed.pathname
            .replace(/^\//, "")
            .replace(/^scm\//, "")
            .replace(/\.git$/i, "");
        return {
            protocol: parsed.protocol.replace(":", ""),
            hostname: parsed.hostname,
            path: normalizedPath,
        };
    }
    catch {
        return undefined;
    }
}
