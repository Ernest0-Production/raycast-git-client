# Changelog

## [Unreleased]

### Added
- **Performance Preferences**: Added configurable limits for better memory and performance optimization
  - `Max Files to Show` (default: 500) - Maximum number of files displayed in status view
  - `Max Branches to Show` (default: 200) - Maximum number of branches displayed
  - `Max Commits to Load` (default: 100) - Maximum number of commits loaded in history view

### Changed
- Replaced hardcoded performance limits with user-configurable preferences
- Updated GitManager to use preference values instead of constants
- Modified useGitCommits hook to respect user-defined limits

## [Initial Version] - {PR_MERGE_DATE}
