"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRepositoriesView = useRepositoriesView;
const utils_1 = require("@raycast/utils");
const react_1 = require("react");
function useRepositoriesView(repositories) {
    const [currentView, setCurrentView] = (0, utils_1.useCachedState)("repositories-list-view", { order: "visit-date", group: "none" });
    const displayedRepositories = (0, react_1.useMemo)(() => {
        const sorted = [...repositories].sort((a, b) => {
            switch (currentView.order) {
                case "visit-date":
                    return b.lastOpenedAt - a.lastOpenedAt;
                case "alphabetical":
                    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
            }
        });
        if (currentView.group === "none") {
            switch (currentView.order) {
                case "visit-date":
                    return [{ groupTitle: "Recently Visited Repositories", repositories: sorted }];
                case "alphabetical":
                    return [{ groupTitle: "Alphabetically Sorted", repositories: sorted }];
            }
        }
        const groups = new Map();
        const getParentDirectoryName = (fullPath) => {
            const trimmed = fullPath.replace(/\/+$/, "");
            const lastSlashIdx = trimmed.lastIndexOf("/");
            if (lastSlashIdx <= 0)
                return "/";
            const parent = trimmed.slice(0, lastSlashIdx);
            const parentLastSlashIdx = parent.lastIndexOf("/");
            if (parentLastSlashIdx < 0)
                return parent;
            const name = parent.slice(parentLastSlashIdx + 1) || parent;
            return name;
        };
        for (const repo of sorted) {
            switch (currentView.group) {
                case "language":
                    if (repo.languageStats && repo.languageStats.length > 0) {
                        const primaryLanguage = repo.languageStats[0];
                        const groupTitle = primaryLanguage.name;
                        const existingGroup = groups.get(groupTitle) || [];
                        groups.set(groupTitle, [...existingGroup, repo]);
                        break;
                    }
                    else {
                        const groupTitle = "Unknown";
                        const existingGroup = groups.get(groupTitle) || [];
                        groups.set(groupTitle, [...existingGroup, repo]);
                    }
                    break;
                case "parent":
                    const groupTitle = getParentDirectoryName(repo.path);
                    const existingGroup = groups.get(groupTitle) || [];
                    groups.set(groupTitle, [...existingGroup, repo]);
                    break;
            }
        }
        return Array.from(groups.entries())
            .sort(([a, aRepos], [b, bRepos]) => {
            switch (currentView.order) {
                case "visit-date":
                    const aLatestVisit = Math.max(...aRepos.map(repo => repo.lastOpenedAt || 0));
                    const bLatestVisit = Math.max(...bRepos.map(repo => repo.lastOpenedAt || 0));
                    return bLatestVisit - aLatestVisit;
                case "alphabetical":
                    return a.localeCompare(b, undefined, { sensitivity: "base" });
            }
        })
            .map(([groupTitle, repos]) => ({ groupTitle, repositories: repos }));
    }, [repositories, currentView]);
    const lastVisitedRepository = (0, react_1.useMemo)(() => {
        return repositories.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)[0];
    }, [repositories]);
    return {
        currentView,
        setCurrentView,
        displayedRepositories,
        lastVisitedRepository,
    };
}
