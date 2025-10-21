import { RemoteProvider } from "../types";

/**
 * Remote host parser.
 * Parser for remote host URLs.
 * @param url - The URL to parse.
 * @returns The parsed remote host info.
 */
export function remoteHostParser(url: string) {
    const parsed = parse(url);

    if (!parsed) {
        return unknownParser(url);
    }

    const hostname = parsed.hostname.toLowerCase()
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

function githubParser(_url: string, parsed: URLComponents) {
    const { protocol: scheme, hostname, path } = parsed;

    return {
        provider: "GitHub" as RemoteProvider,
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
        commitUrl(sha: string) {
            return `${scheme}://${hostname}/${path}/commit/${encodeURIComponent(sha)}`;
        },
        createPullRequestUrl(branchName: string) {
            return `${scheme}://${hostname}/${path}/compare/${encodeURIComponent(branchName)}?expand=1`;
        },
        fileUrl(filePath: string, ref: string) {
            return `${scheme}://${hostname}/${path}/blob/${encodeURIComponent(ref)}/${filePath}`;
        },
    };
}

function gitlabParser(_url: string, parsed: URLComponents) {
    const { protocol: scheme, hostname, path } = parsed;

    return {
        provider: "GitLab" as RemoteProvider,
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
        commitUrl(sha: string) {
            return `${scheme}://${hostname}/${path}/-/commit/${encodeURIComponent(sha)}`;
        },
        createPullRequestUrl(branchName: string) {
            return `${scheme}://${hostname}/${path}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(branchName)}`;
        },
        fileUrl(filePath: string, ref: string) {
            return `${scheme}://${hostname}/${path}/-/blob/${encodeURIComponent(ref)}/${filePath}`;
        },
    };
}

function giteaParser(_url: string, parsed: URLComponents) {
    const { protocol: scheme, hostname, path } = parsed;

    return {
        provider: "Gitea" as RemoteProvider,
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
        commitUrl(sha: string) {
            return `${scheme}://${hostname}/${path}/commit/${encodeURIComponent(sha)}`;
        },
        createPullRequestUrl(_branchName: string) {
            return undefined;
        },
        fileUrl(filePath: string, ref: string) {
            return `${scheme}://${hostname}/${path}/src/branch/${encodeURIComponent(ref)}/${filePath}`;
        },
    };
}

function bitbucketParser(_url: string, parsed: URLComponents) {
    const { protocol: scheme, hostname, path } = parsed;

    const isSelfHosted = hostname === "bitbucket.org";

    const repoBase = (() => {
        if (isSelfHosted) {
            return `${scheme}://${hostname}/${path}`;
        }

        const match = path.match(/^(?<project>[^\/]+)\/(?<repo>[^\/]+)/);
        if (!match || !match.groups) return undefined;

        const { project, repo } = match.groups as { project: string; repo: string };
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
        provider: "Bitbucket" as RemoteProvider,
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
        commitUrl(sha: string) {
            return repoBase ? `${repoBase}/commits/${encodeURIComponent(sha)}` : undefined;
        },
        createPullRequestUrl(branchName: string) {
            if (!repoBase) return undefined;
            if (repoBase.includes("/projects/")) {
                return `${repoBase}/pull-requests?create&sourceBranch=${encodeURIComponent(`refs/heads/${branchName}`)}`;
            }
            return `${repoBase}/pull-requests/new?source=${encodeURIComponent(branchName)}`;
        },
        fileUrl(filePath: string, ref: string) {
            if (!repoBase) return undefined;
            if (repoBase.includes("/projects/")) {
                return `${repoBase}/browse/${filePath}?at=${encodeURIComponent(ref)}`;
            }
            return `${repoBase}/src/${encodeURIComponent(ref)}/${filePath}`;
        },
    };
}

function azureDevopsParser(_url: string, parsed: URLComponents) {
    const { hostname, path } = parsed;

    const repoBase = (() => {
        if (hostname === "ssh.dev.azure.com" || hostname === "vs-ssh.visualstudio.com") {
            const pathPattern = path.startsWith("v3/")
                ? /^v3\/(?<org>[^\/]+)\/(?<project>[^\/]+)\/(?<repo>[^\/]+)$/
                : /^(?<org>[^\/]+)\/(?<project>[^\/]+)\/(?<repo>[^\/]+)$/;
            const match = path.match(pathPattern);
            if (!match || !match.groups) return undefined;
            const { org, project, repo } = match.groups as { org: string; project: string; repo: string };
            return `https://dev.azure.com/${org}/${project}/_git/${repo}`;
        }
        if (hostname === "dev.azure.com") {
            const pathPattern = /^(?<org>[^\/]+)\/(?<project>[^\/]+)(?:\/.*)?_git\/(?<repo>[^\/]+)/;
            const match = path.match(pathPattern);
            if (!match || !match.groups) return undefined;
            const { org, project, repo } = match.groups as { org: string; project: string; repo: string };
            if (!org || !project || !repo) return undefined;
            return `https://dev.azure.com/${org}/${project}/_git/${repo}`;
        }
        if (hostname.endsWith(".visualstudio.com")) {
            const pathPattern = /^(?<project>[^\/]+)(?:\/.*)?_git\/(?<repo>[^\/]+)/;
            const match = path.match(pathPattern);
            if (!match || !match.groups) return undefined;
            const { project, repo } = match.groups as { project: string; repo: string };
            if (!project || !repo) return undefined;
            return `https://${hostname}/${project}/_git/${repo}`;
        }
        return undefined;
    })();

    return {
        provider: "Azure DevOps" as RemoteProvider,
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
        commitUrl(sha: string) {
            return repoBase ? `${repoBase}/commit/${encodeURIComponent(sha)}` : undefined;
        },
        createPullRequestUrl(branchName: string) {
            return repoBase ? `${repoBase}/pullrequestcreate?sourceRef=${encodeURIComponent(`refs/heads/${branchName}`)}` : undefined;
        },
        fileUrl(filePath: string, ref: string) {
            return repoBase ? `${repoBase}?path=/${filePath}&version=GB${encodeURIComponent(ref)}` : undefined;
        },
    };
}

function unknownParser(_url: string, parsed?: URLComponents) {
    const { protocol: scheme, hostname, path } = parsed || {};

    return {
        provider: undefined as RemoteProvider,
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
        fileUrl() {
            return undefined;
        },
    };
}

// --- internals ---------------------------------------------------------------

type URLComponents = {
    protocol: string;
    hostname: string;
    path: string
};

function parse(url: string): URLComponents | undefined {
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
    } catch {
        return undefined;
    }
}
