import { homedir } from "os";
import { join } from "path";

/**
 * Resolves a tilde (~) path to an absolute path.
 * @param path - The path, which may start with ~.
 * @returns The absolute path.
 */
export function resolveTildePath(path: string): string {
    if (path.startsWith("~/")) {
        return join(homedir(), path.slice(2));
    }
    if (path === "~") {
        return homedir();
    }
    return path;
}

// export function uniquePathsLabels(paths: string[]): Record<string, string> {
//     const pathsComponents = paths.map(path => path.split("/"));

//     let result: Record<string, string> = {};

//     // Handle edge cases
//     if (paths.length === 0) return {};
//     if (paths.length === 1) {
//         const path = paths[0];
//         const lastComponent = path.split("/").pop() || path;
//         return { [path]: lastComponent };
//     }

//     // Build a trie-like structure to find conflicts efficiently
//     const suffixMap = new Map<string, string[]>();

//     // Start by mapping each path to its last component
//     for (const path of paths) {
//         const components = path.split("/");
//         const lastComponent = components[components.length - 1];

//         if (!suffixMap.has(lastComponent)) {
//             suffixMap.set(lastComponent, []);
//         }
//         suffixMap.get(lastComponent)!.push(path);
//     }

//     // Process each group of paths with the same suffix
//     for (const [suffix, pathsWithSameSuffix] of suffixMap) {
//         if (pathsWithSameSuffix.length === 1) {
//             // No conflict, use just the last component
//             result[pathsWithSameSuffix[0]] = suffix;
//         } else {
//             // Conflict exists, need to find unique suffixes
//             const conflictingPaths = pathsWithSameSuffix.map(path => ({
//                 path,
//                 components: path.split("/")
//             }));

//             // For each conflicting path, find minimal unique suffix
//             for (const { path, components } of conflictingPaths) {
//                 let suffixLength = 2; // Start with 2 since 1 component already conflicts
//                 let uniqueSuffix = components[components.length - 1];

//                 while (suffixLength <= components.length) {
//                     const candidateSuffix = components.slice(-suffixLength).join("/");

//                     // Check if this suffix is unique among the conflicting paths
//                     const isUnique = conflictingPaths.every(other => {
//                         if (other.path === path) return true;
//                         if (other.components.length < suffixLength) return true;

//                         const otherSuffix = other.components.slice(-suffixLength).join("/");
//                         return candidateSuffix !== otherSuffix;
//                     });

//                     if (isUnique) {
//                         uniqueSuffix = candidateSuffix;
//                         break;
//                     }

//                     suffixLength++;
//                 }

//                 result[path] = uniqueSuffix;
//             }
//         }
//     }

//     return result;
// }
