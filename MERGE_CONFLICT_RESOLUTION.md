# Git Merge Conflict Resolution Feature

## Overview

This feature allows users to resolve git merge conflicts directly within the Raycast extension using a visual interface.

## Implementation

### Files Created

1. **`src/utils/conflict-parser.ts`**
   - Parses git conflict markers from files
   - Extracts conflict segments with current and incoming versions
   - Applies user-selected resolutions back to the file

2. **`src/components/views/FileMergeResolveView.tsx`**
   - Main UI for resolving conflicts
   - Displays all conflict segments in a file as a list
   - Shows detailed view with markdown-formatted content from both versions
   - Allows selecting resolution for each conflict segment
   - Applies all resolutions when complete

### Files Modified

1. **`src/types/git-types.ts`**
   - Added `ConflictSegment` interface for representing individual conflict segments
   - Added `FileConflicts` interface for file-level conflict data

2. **`src/components/actions/StatusActions.tsx`**
   - Added `FileResolveConflictAction` - Action.Push wrapper for opening the merge resolve view

3. **`src/components/views/StatusView.tsx`**
   - Integrated conflict resolution action for conflicted files (both staged and unstaged)

## Usage

1. When a merge/rebase conflict occurs, conflicted files appear in the Status View with a conflict icon
2. Select a conflicted file and press `Cmd+M` (or choose "Resolve Conflicts" from the action menu)
3. The Merge Resolve View opens, showing all conflict segments
4. For each segment:
   - View the content from both versions in the detail panel
   - Press `Cmd+1` to select the current version (HEAD)
   - Press `Cmd+2` to select the incoming version (merge source)
5. Once all conflicts are resolved (green checkmarks appear):
   - Press `Cmd+Enter` to apply all resolutions
6. The file is updated with the resolved content and you can proceed with staging/committing

## Features

- ✅ Visual conflict segment list with resolution status
- ✅ Detailed markdown view showing both versions side-by-side
- ✅ Keyboard shortcuts for quick resolution
- ✅ Clear indication of resolved/unresolved state
- ✅ Safe application with confirmation dialog
- ✅ Automatic status refresh after resolution
- ✅ Works with both staged and unstaged conflicted files

## Architecture

The implementation follows the project's established patterns:

- **Views** in `src/components/views/` - Reusable UI components
- **Actions** in `src/components/actions/` - Reusable action components
- **Utils** in `src/utils/` - Pure utility functions
- **Types** in `src/types/` - TypeScript interfaces

## Git Conflict Format

The parser handles standard git conflict markers:

```
<<<<<<< HEAD (or branch name)
current content from HEAD
=======
incoming content from merge source
>>>>>>> branch-name (or commit hash)
```

Multiple conflict segments in a single file are supported.

## Testing

- ✅ TypeScript compilation passes
- ✅ ESLint validation passes for all new files
- ✅ Follows project code style and conventions
- ✅ Integrates seamlessly with existing Status View workflow
