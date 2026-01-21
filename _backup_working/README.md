# Backup of working code

This folder contains a copy of the key files **before** further edits.

**Date:** Created when you asked for a working backup.

## Files included

- `src/components/SimpleProfessionalMathEditor.jsx`
- `src/components/mathBlot.js`
- `src/components/MathRenderer.jsx`
- `src/pages/admin/Questions.jsx`
- `src/pages/Chapters.jsx`
- `src/services/storageService.js`
- `vite.config.js`

## How to restore

### Option 1: Git tag (restore entire project)

To go back to this state for the **whole project**:

```bash
git reset --hard working-backup
```

⚠️ This will **discard all uncommitted changes**.

### Option 2: Restore a single file

Copy from this folder back to the project:

```bash
# Example: restore SimpleProfessionalMathEditor.jsx
copy _backup_working\src\components\SimpleProfessionalMathEditor.jsx src\components\
```

Or copy manually in File Explorer.

### Option 3: Compare before restoring

Use a diff tool to compare:

- `_backup_working\src\components\SimpleProfessionalMathEditor.jsx`
- `src\components\SimpleProfessionalMathEditor.jsx`

Then copy only the parts you need.
