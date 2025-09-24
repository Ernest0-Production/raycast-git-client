import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { GitManager } from "../../utils/git-manager";
import { FileCopyPathAction, FileHistoryAction, FileOpenAction, FileOpenWithAction, FileQuickLookAction } from "../../components/actions/FileActions";
import { join } from "path";
import { useMemo, useState } from "react";
import { existsSync } from "fs";
import { search, sortKind } from "fast-fuzzy";

interface FilesViewProps {
    gitManager: GitManager;
    navigationActions: React.ReactNode;
    viewDropdown: React.ReactElement<any>;
    onRefresh: () => void;
}

const MAX_RESULTS = 60;

export default function FilesView({ gitManager, navigationActions, viewDropdown, onRefresh }: FilesViewProps) {
    const [searchText, setSearchText] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [recentFiles, setRecentFiles] = useCachedState<string[]>(`recent-files-${gitManager.repoPath}`, []);

    const { data: filePaths, isLoading: isLoadingRepositoryContent } = usePromise(
        async (repoPath) => {
            return await gitManager.getTrackedFilePaths();
        },
        [gitManager.repoPath],
    );
    const searchResult = useMemo(() => {
        if (!filePaths) return [] as string[];
        const query = searchText.trim();
        if (!query) return [] as string[];

        // Fuzzy search using fast-fuzzy
        setIsSearching(true);
        const results = search(query, filePaths, {
            keySelector: (filePath) => filePath.split("/").pop() || filePath,
            sortBy: sortKind.bestMatch,
            useDamerau: true,
            ignoreCase: true
        });
        setIsSearching(false);
        return results.slice(0, MAX_RESULTS);
    }, [filePaths, searchText]);

    const handleAddRecent = (filePath: string) => {
        setRecentFiles((prev) => {
            const next = [filePath, ...prev.filter((p) => p !== filePath)];
            return next;
        });
    };

    const handleClearRecent = async () => {
        setRecentFiles([]);
        await showToast({ style: Toast.Style.Success, title: "Recent files cleared" });
    };

    return (
        <List
            isLoading={isLoadingRepositoryContent || isSearching}
            navigationTitle="Repository Files"
            searchBarPlaceholder="Search files by name, path..."
            searchBarAccessory={viewDropdown}
            onSearchTextChange={setSearchText}
            searchText={searchText}
            actions={
                <ActionPanel>
                    {navigationActions}
                    <ActionPanel.Section title="Recent">
                        <Action
                            title="Clear Recent Files"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
                            onAction={handleClearRecent}
                        />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        >
            {!filePaths || filePaths.length === 0 ? (
                <List.EmptyView
                    title="No tracked files"
                    description="Repository has no tracked files."
                    icon={Icon.Document}
                    actions={<ActionPanel>{navigationActions}</ActionPanel>}
                />
            ) : (
                <>
                    {searchText.trim().length === 0 ? (
                        recentFiles && recentFiles.length > 0 ? (
                            <List.Section title="Recent Visited Files">
                                {recentFiles
                                    .filter((path: string) => filePaths?.includes(path))
                                    .map((filePath: string) => (
                                        <FileListItem
                                            key={`recent:${filePath}`}
                                            filePath={filePath}
                                            gitManager={gitManager}
                                            navigationActions={navigationActions}
                                            onRefresh={onRefresh}
                                            onOpen={() => handleAddRecent(filePath)}
                                        />
                                    ))}
                            </List.Section>
                        ) : (
                            <List.EmptyView
                                title="Start typing to search files"
                                description="Type to search tracked files using fuzzy match"
                                icon={Icon.MagnifyingGlass}
                                actions={<ActionPanel>{navigationActions}</ActionPanel>}
                            />
                        )
                    ) : searchResult.length === 0 ? (
                        <List.EmptyView
                            title="No results"
                            description="Try different search terms."
                            icon={Icon.MagnifyingGlass}
                            actions={<ActionPanel>{navigationActions}</ActionPanel>}
                        />
                    ) : (
                        searchResult.map((filePath: string) => (
                            <FileListItem
                                key={filePath}
                                filePath={filePath}
                                gitManager={gitManager}
                                navigationActions={navigationActions}
                                onRefresh={onRefresh}
                                onOpen={() => handleAddRecent(filePath)}
                            />
                        ))
                    )}
                </>
            )}
        </List>
    );
}

function FileListItem({
    filePath,
    gitManager,
    navigationActions,
    onRefresh,
    onOpen,
}: {
    filePath: string;
    gitManager: GitManager;
    navigationActions: React.ReactNode;
    onRefresh: () => void;
    onOpen?: () => void;
}) {
    const fileName = useMemo(() => filePath.split("/").pop() || filePath, [filePath]);
    const absolutePath = join(gitManager.repoPath, filePath);

    return (
        <List.Item
            id={filePath}
            title={fileName}
            subtitle={filePath}
            icon={existsSync(absolutePath) ? { fileIcon: absolutePath } : undefined}
            quickLook={existsSync(absolutePath) ? { path: absolutePath, name: absolutePath } : undefined}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title={fileName}>
                        <FileHistoryAction
                            filePath={absolutePath}
                            gitManager={gitManager}
                            onRefresh={onRefresh}
                            onOpen={onOpen}
                        />
                        <FileOpenAction
                            filePath={absolutePath}
                            onOpen={onOpen}
                        />
                        <FileOpenWithAction
                            filePath={absolutePath}
                            shortcut={{ modifiers: ["cmd"], key: "o" }}
                            onOpen={onOpen}
                        />
                        <FileQuickLookAction filePath={absolutePath} />
                        <FileCopyPathAction filePath={absolutePath} />
                    </ActionPanel.Section>

                    {navigationActions}
                </ActionPanel>
            }
        />
    );
}


