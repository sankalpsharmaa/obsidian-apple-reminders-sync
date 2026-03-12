# Apple Reminders Sync

An [Obsidian](https://obsidian.md) plugin for macOS that pulls today's Apple Reminders into your daily note's TODO section.

![macOS only](https://img.shields.io/badge/platform-macOS-blue)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

## Features

- Fetches incomplete reminders due today from Apple Reminders via [reminders-cli](https://github.com/keith/reminders-cli) (native EventKit, no AppleScript)
- Appends them as checklist items (`- [ ]`) under the `## TODO` heading in today's daily note
- Preserves reminder notes as indented text beneath each item
- Shows priority levels: `!!!` (high), `!!` (medium), `!` (low)
- Deduplicates automatically so re-syncing never creates repeated entries
- Syncs on a configurable interval and on vault open
- Configurable list exclusions (skip personal lists like Groceries)

## Requirements

- macOS (Apple Reminders access requires EventKit)
- [reminders-cli](https://github.com/keith/reminders-cli):
  ```bash
  brew install keith/formulae/reminders-cli
  ```

## Installation

### Community plugins (once approved)

Settings > Community Plugins > Browse > search "Apple Reminders Sync"

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/sankalpsharmaa/obsidian-apple-reminders-sync/releases/latest)
2. Create `.obsidian/plugins/apple-reminders-sync/` in your vault
3. Place both files inside
4. Enable in Settings > Community Plugins

## Configuration

| Setting | Default | Description |
|-|-|-|
| Sync interval | 5 min | How often to pull from Apple Reminders |
| Daily notes folder | `daily-notes` | Folder containing your daily notes |
| Excluded lists | Groceries, Watch list, Wish List | Comma-separated lists to ignore |

## How it works

1. On sync (automatic or manual), the plugin calls `reminders show-all --due-date today --format json`
2. Filters out completed items and excluded lists
3. Finds the `## TODO` section in today's daily note (`<daily-notes-folder>/YYYY-MM-DD.md`)
4. Appends any new reminders at the end of that section, skipping items already present

### Daily note format

Your daily note needs a `## TODO` section. The plugin appends reminders at the end of it:

```markdown
## TODO
- [ ] Existing task from yesterday
- [ ] Schedule dentist appointment !!!
- [ ] Submit grant application
	- PEDL deadline March 31
```

Trigger a manual sync with the ribbon icon (checkmark) or via the command palette.

## Limitations

- macOS only (EventKit is not available on Windows/Linux/iOS)
- One-way sync: changes in Obsidian are not pushed back to Apple Reminders
- Requires `reminders-cli` installed via Homebrew
- Daily note must have a `## TODO` heading

## License

[MIT](LICENSE)
