import { Color } from "@raycast/api";
import { LanguageStats } from "../types";
import { GitManager } from "./git-manager";

const MAIN_LANGUAGE_PERCENTAGE = 70;

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
    Kotlin: Color.Purple,
};

const LANGUAGE_EXTENSION: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
    mjs: "JavaScript",
    cjs: "JavaScript",
    py: "Python",
    java: "Java",
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
    rb: "Ruby",
    php: "PHP",
    go: "Go",
    swift: "Swift",
    kt: "Kotlin",
    kts: "Kotlin",
};

function getExtension(filePath: string): string | undefined {
    const lastSlash = filePath.lastIndexOf("/");
    const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot <= 0) return undefined;
    return fileName.slice(lastDot + 1).toLowerCase();
}

export async function detectRepositoryLanguages(repositoryPath: string): Promise<LanguageStats[]> {
    const manager = new GitManager(repositoryPath);
    const trackedFiles = await manager.getTrackedFilePaths();

    let totalFiles = trackedFiles.length;
    if (totalFiles === 0) return [];

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

    if (Object.keys(languageFilesCounter).length === 0) return [];

    const sortedLanguages = Object.entries(languageFilesCounter)
        .map(([name, count]) => ({
            name,
            percentage: (count / totalFiles) * 100,
            color: LANGUAGES_COLORS[name as keyof typeof LANGUAGES_COLORS],
        }))
        .sort((a, b) => b.percentage - a.percentage);

    if (sortedLanguages[0] && sortedLanguages[0].percentage >= MAIN_LANGUAGE_PERCENTAGE) {
        return [sortedLanguages[0]];
    }

    const primaryLanguages: LanguageStats[] = [];
    let sum = 0;
    for (const lang of sortedLanguages) {
        primaryLanguages.push(lang);
        sum += lang.percentage;
        if (sum >= MAIN_LANGUAGE_PERCENTAGE) break;
    }
    return primaryLanguages;
}
