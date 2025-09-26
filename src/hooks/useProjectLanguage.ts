import { Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";

export interface LanguageStats {
    name: string;
    percentage: number;
    color?: Color;
}

const MAIN_LANGUAGE_PERCENTAGE = 70;

// Map language name to tag color for accessories
const LANGUAGES_COLORS: Record<string, Color> = {
    JavaScript: Color.Yellow,
    TypeScript: Color.Blue,
    Python: Color.Blue,
    Java: Color.Orange,
    "C#": Color.Purple,
    "C++": Color.Blue,
    C: Color.Blue,
    Ruby: Color.Red,
    PHP: Color.Blue,
    Go: Color.Blue,
    Swift: Color.Orange,
    "Objective-C": Color.SecondaryText,
    Kotlin: Color.Orange,
};

// Map file extensions to human-friendly language names
const LANGUAGE_EXTENSION: Record<string, string> = {
    // TypeScript / JavaScript
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
    mjs: "JavaScript",
    cjs: "JavaScript",
    // Python
    py: "Python",
    // Java
    java: "Java",
    // C family
    cs: "C#",
    cpp: "C++",
    cxx: "C++",
    cc: "C++",
    hpp: "C++",
    hh: "C++",
    h: "Objective-C",
    m: "Objective-C",
    hxx: "C++",
    c: "C",
    // Ruby
    rb: "Ruby",
    // PHP
    php: "PHP",
    // Go
    go: "Go",
    // Swift
    swift: "Swift",
    // Kotlin
    kt: "Kotlin",
    kts: "Kotlin",
};

/**
 * Detects primary programming language(s) for a single repository using tracked files.
 * The result includes either one language that covers >= 60% of tracked files,
 * or several languages sorted by coverage whose cumulative percentage >= 60%.
 */
export function useProjectLanguage(repositoryPath: string) {
    return useCachedPromise(
        async (path: string): Promise<LanguageStats[]> => {
            const manager = new GitManager(path);
            const trackedFiles = await manager.getTrackedFilePaths();

            let totalFiles = trackedFiles.length;
            if (totalFiles === 0) {
                return [];
            }

            // Count files per language
            const languageFilesCounter: Record<string, number> = {};
            for (const relativePath of trackedFiles) {
                const extension = getExtension(relativePath);
                if (!extension) {
                    totalFiles--;
                    continue;
                }
                const language = LANGUAGE_EXTENSION[extension];
                if (!language) {
                    totalFiles--;
                    continue;
                }
                languageFilesCounter[language] = (languageFilesCounter[language] || 0) + 1;
            }

            if (Object.keys(languageFilesCounter).length === 0) {
                return [];
            }

            // Compute percentages and sort descending
            const sortedLanguages = Object.entries(languageFilesCounter)
                .map(([name, count]) => ({
                    name,
                    percentage: (count / totalFiles) * 100,
                    color: LANGUAGES_COLORS[name as keyof typeof LANGUAGES_COLORS],
                }))
                .sort((a, b) => b.percentage - a.percentage);

            // Early return if single dominant language >= 60%
            if (sortedLanguages[0] && sortedLanguages[0].percentage >= MAIN_LANGUAGE_PERCENTAGE) {
                return [sortedLanguages[0]];
            }

            // Otherwise, accumulate until reaching 60%
            const primaryLanguages: LanguageStats[] = [];
            let sum = 0;
            for (const lang of sortedLanguages) {
                primaryLanguages.push(lang);
                sum += lang.percentage;
                if (sum >= MAIN_LANGUAGE_PERCENTAGE) break;
            }
            return primaryLanguages;
        },
        [repositoryPath],
        {
            initialData: [],
        }
    );
}

function getExtension(filePath: string): string | undefined {
    const lastSlash = filePath.lastIndexOf("/");
    const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot <= 0) return undefined; // no extension or dotfile
    return fileName.slice(lastDot + 1).toLowerCase();
}
