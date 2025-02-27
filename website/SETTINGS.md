#meta

This page contains configuration of SilverBullet and its plugs. Some of these changes will go into effect immediately, some require a page reload.

```space-config
# Initial page to load when launching SB, can contain template variables
indexPage: "[[SilverBullet]]"
libraries:
# The "Core" library is recommended for all users
- import: "[[!silverbullet.md/Library/Core/*]]"
  # You can exclude items from the import using exclude (also supports wildcards):
  #exclude:
  # - "[[!silverbullet.md/Table of Contents]]"
  # - "[[!silverbullet.md/Library/Core/Widget/*]]""

## UI TWEAKS
# Hide the sync button
hideSyncButton: false
# Hide the edit button (available on mobile only)
hideEditButton: true # defaults to 'false'

# In PWA mode, SilverBullet automatically reopens the last opened page on boot, this can be disabled
pwaOpenLastPage: true

# Configure the shown action buttons (top right bar)
actionButtons:
- icon: home # Use any icon from https://feathericons.com
  command: "{[Navigate: Home]}"
  description: "Go to the index page"
- icon: activity
  description: "What's new"
  command: '{[Navigate: To Page]("CHANGELOG")}'
- icon: message-circle
  description: "Community"
  command: '{[Navigate: To URL]("https://community.silverbullet.md")}'
- icon: book
  command: "{[Navigate: Page Picker]}"
  description: Open page
- icon: terminal
  command: "{[Open Command Palette]}"
  description: Run command
#- icon: arrow-left
#  command: "{[Navigate: Back in History]}"
#  description: "Go to the previous page"
#  mobile: true # Only show on mobile devices, set to false to show only on desktop

# Create keyboard or slash command shortcuts for commands
shortcuts:
# Map a key to a command
- command: "{[Navigate: Center Cursor]}"
  key: "Alt-x"
# Map a slash command (e.g. `/indent`) to a command
- command: "{[Outline: Move Right]}"
  slashCommand: "indent"
# Bump a command's priority in the command palette
- command: "{[Upload: File]}"
  priority: 1

# Choose which characters to auto-close
autoCloseBrackets: "([{`"
# Options for “smart” ‘quotes’ (left and right) used outside of code fragments, these are the defaults:
smartQuotes:
  enabled: true # Set to false for "simple" 'quotes' (good ol' ASCII)
  double:
    left: '“'
    right: '”'
  single:
    left: "‘"
    right: "’"

# Defines files to ignore in a format compatible with .gitignore
spaceIgnore: |
   dist
   largefolder
   *.mp4

# Defines the maximum size of a file you can upload to the space (in MiB)
maximumAttachmentSize: 10

# Add alternative names to emoji picker
emoji:
  aliases:
    smile: 😀
    sweat_smile: 😅

# Defines the indentation multiplier.
# SilverBullet's base indentation is 2 spaces. Actual indentation = 2 * indentMultiplier.
# So, using an indentMultiplier of 2 would make your indentation size 4, 3 would make it 6, etc.
indentMultiplier: 1
```
