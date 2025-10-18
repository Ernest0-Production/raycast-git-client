import { useEffect, useState } from "react";
import { ConflictSegment, FileConflicts } from "../types";
import { readFileSync, writeFileSync } from "fs";
import { nanoid } from "nanoid";

/**
 * Parses a conflicted file and extracts all conflict segments.
 */
function parseConflictedFile(filePath: string): FileConflicts {
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");
  const segments: ConflictSegment[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Look for conflict start marker
    if (line.startsWith("<<<<<<<")) {
      const startLine = i + 1;
      const currentLabel = line.replace(/^<{7}\s*/, "").trim() || "HEAD";

      // Find the separator
      let separatorIndex = i + 1;
      while (separatorIndex < lines.length && !lines[separatorIndex].startsWith("=======")) {
        separatorIndex++;
      }

      // Find the end marker
      let endIndex = separatorIndex + 1;
      while (endIndex < lines.length && !lines[endIndex].startsWith(">>>>>>>")) {
        endIndex++;
      }

      if (separatorIndex < lines.length && endIndex < lines.length) {
        const currentContent = lines.slice(i + 1, separatorIndex).join("\n");
        const incomingContent = lines.slice(separatorIndex + 1, endIndex).join("\n");
        const incomingLabel = lines[endIndex].replace(/^>{7}\s*/, "").trim() || "incoming";

        segments.push({
          id: nanoid(),
          startLine,
          endLine: endIndex + 1,
          currentContent,
          incomingContent,
          currentLabel,
          incomingLabel,
          resolution: null,
        });

        i = endIndex + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return {
    filePath,
    segments,
  };
}

/**
 * Applies conflict resolutions to a file and returns the resolved content.
 */
function applyConflictResolutions(filePath: string, segments: ConflictSegment[]): string {
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  // Build a map of segment IDs to their resolution
  const resolutionMap = new Map<number, ConflictSegment>();
  for (const segment of segments) {
    if (segment.resolution) {
      resolutionMap.set(segment.startLine, segment);
    }
  }

  const resolvedLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for conflict start marker
    if (line.startsWith("<<<<<<<")) {
      const startLine = i + 1;

      // Find the separator
      let separatorIndex = i + 1;
      while (separatorIndex < lines.length && !lines[separatorIndex].startsWith("=======")) {
        separatorIndex++;
      }

      // Find the end marker
      let endIndex = separatorIndex + 1;
      while (endIndex < lines.length && !lines[endIndex].startsWith(">>>>>>>")) {
        endIndex++;
      }

      if (separatorIndex < lines.length && endIndex < lines.length) {
        const segment = resolutionMap.get(startLine);

        if (segment && segment.resolution) {
          // Apply the resolution
          const resolvedContent = segment.resolution === "current" 
            ? segment.currentContent 
            : segment.incomingContent;

          resolvedLines.push(resolvedContent);
        } else {
          // Keep the conflict markers if not resolved
          resolvedLines.push(...lines.slice(i, endIndex + 1));
        }

        i = endIndex + 1;
      } else {
        resolvedLines.push(line);
        i++;
      }
    } else {
      resolvedLines.push(line);
      i++;
    }
  }

  return resolvedLines.join("\n");
}

/**
 * Custom hook for managing conflict resolution in a file.
 * 
 * @param filePath - Path to the conflicted file
 * @returns Object containing:
 *   - conflicts: Parsed conflict data
 *   - segments: Array of conflict segments with resolution state
 *   - isLoading: Loading state
 *   - error: Error message if parsing failed
 *   - resolveSegment: Function to set resolution for a segment
 *   - applyResolution: Function to write resolved content to file
 *   - allResolved: Boolean indicating if all conflicts are resolved
 */
export function useConflictResolver(filePath: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [conflicts, setConflicts] = useState<FileConflicts | null>(null);
  const [segments, setSegments] = useState<ConflictSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);
      const parsed = parseConflictedFile(filePath);
      setConflicts(parsed);
      setSegments(parsed.segments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);

  const resolveSegment = (segmentId: string, resolution: "current" | "incoming") => {
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === segmentId ? { ...seg, resolution } : seg
      )
    );
  };

  const applyResolution = () => {
    const resolvedContent = applyConflictResolutions(filePath, segments);
    writeFileSync(filePath, resolvedContent, "utf-8");
  };

  const allResolved = segments.every((seg) => seg.resolution !== null);

  return {
    conflicts,
    segments,
    isLoading,
    error,
    resolveSegment,
    applyResolution,
    allResolved,
  };
}
