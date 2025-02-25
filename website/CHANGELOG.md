An attempt at documenting the changes/new features introduced in each release.

---

## Edge
_These features are not yet properly released, you need to use [the edge builds](https://community.silverbullet.md/t/living-on-the-edge-builds/27) to try them._
* Native [[Share]] functionality, allowing you to use your OS'es native share functionality to share data with SilverBullet.
  Target page can be configured as `shareTargetPage` in [[^SETTINGS]].

* Nothing new yet since 0.10.2

## 0.10.4
* **Lua**: _Tons_ of fixes, changes and enhancements, see [[Space Lua]] and related for up-to-date docs. Some notable things:
  * [[Space Lua/Lua Integrated Query]] is now here
  * Code completion of APIs in `space-lua` and Lua directive syntax, implemented in Lua itself: [[^Library/Std/Lua]].
  * [[API]] docs (not fully complete, but getting there)
  * WIP Lua [[^Library/Std]] [[Libraries]], distributed with SilverBullet core.
    * [[^Library/Std/Config]] (future Lua replacement for [[^SETTINGS]])
    * [[^Library/Std/Template]] (Lua replacement of [[Templates]]) with a few samples here [[^Library/Std/Query Templates]].
  * Breaking change: API convention changed moving from `snake_case` to `camelCase` everywhere.
* `indentMultiplier` setting added (by [Mufeed Ali](https://github.com/silverbulletmd/silverbullet/pull/1212))
* Open external links in new tab (by [Ohad Lutzky](https://github.com/silverbulletmd/silverbullet/pull/1229))
* URL parse fixes (by [Ohad Lutzky](https://github.com/silverbulletmd/silverbullet/pull/1175))
* [[Plugs]] are now ideally configured via [[Space Config]] (by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/1122))
* Fixed styling for completed tasks with page links (by [Max Richter](https://github.com/silverbulletmd/silverbullet/pull/1225))
* New design for [[Authentication]] page (by [majjejjam](https://github.com/silverbulletmd/silverbullet/pull/1124))
* Tags are now easier to style (by [TR Staake](https://github.com/silverbulletmd/silverbullet/pull/1179))
* Swift syntax highlighting now actually highlights Swift code (instead of Rust) (by [David Chiles](https://github.com/silverbulletmd/silverbullet/pull/1183))
* (Security) Implemented a lockout mechanism after a number of failed login attempts for [[Authentication]] (configured via [[Install/Configuration#Authentication]]) (by [Peter Weston](https://github.com/silverbulletmd/silverbullet/pull/1152))
* Move lines up/down with {[Outline: Move Up]} and {[Outline: Move Down]} commands (by [Simon Cambier](https://github.com/silverbulletmd/silverbullet/pull/1232))
* Added more options for [[Table of Contents]] rendering (by [Nico S.](https://github.com/silverbulletmd/silverbullet/pull/1258)).
* Disable spellcheck for more code-like blocks (by [MrMugame](https://github.com/silverbulletmd/silverbullet/pull/1244))

## 0.10.1
This is a “major” release primarily because of the underlying migration to rely on Deno 2 and a bunch of foundational work that’s not really leveraged yet. Stay tuned for more.

* Migrated underlying system to Deno 2.0, please upgrade to a recent Deno 2 build!
* Another attempt at supporting authentication proxies better
* {[Editor: New Window]} command (bound to Ctrl-n/Cmd-n) which should make creating new windows work better on non-mac OSes
* Fixes for automatic page reload
* Automatically convert item into task when using {[Task: Cycle State]} (by [Abin Simon](https://github.com/silverbulletmd/silverbullet/pull/1099))
* Reduce ranking of non-existing pages in completion and picker (by [Abin Simon](https://github.com/silverbulletmd/silverbullet/issues/1100))
* Better configurability of automatic bracket closing in [[^SETTINGS]] (`autoCloseBrackets` setting) (by [Fernando Serboncini](https://github.com/silverbulletmd/silverbullet/pull/1110))
* Smart quote configuration (by [Marek](https://github.com/silverbulletmd/silverbullet/pull/1121))
* Index page links in [[Frontmatter]] (by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/1066))
* Template parser fixes (by [MrMugame](https://github.com/silverbulletmd/silverbullet/pull/1102))
* You can now hit `Tab` to accept the current auto complete option (by [Vighnesh Shenoy](https://github.com/silverbulletmd/silverbullet/pull/1150))
* Some dark mode fixes and top bar improvements (by [Mufeed Ali](https://github.com/silverbulletmd/silverbullet/pull/1137))
* A few Vim mode fixes (by [Ohad](https://github.com/silverbulletmd/silverbullet/pull/1146) [Lutzky](https://github.com/silverbulletmd/silverbullet/pull/1145))
* Support for [tel: links](tel:12345) (by [Peter Weston](https://github.com/silverbulletmd/silverbullet/pull/1139))
* “Remember me” functionality for [[Authentication]] (by [aekaisato](https://github.com/silverbulletmd/silverbullet/pull/1132))
* (Highly experimental) work started on [[Space Lua]] (you can observe, but don’t use just yet)

## 0.9.4
* Slashes in page names are no no longer URL encoded (in the URL)
* `task` and `item` [[Objects]] now have a `parent` attribute when nested, and inherit their ancestors’ tags in `itags` — see [[Objects#item]] for an example.
* When a page changed on disk, it now does a diff-based reload, largely retaining local changes, edit history and cursor position  (by [jcgurango](https://github.com/silverbulletmd/silverbullet/pull/1056))
* The default generated SETTINGS uses `yaml` again until more plugs are updated to support [[Space Config]]
* Markdown preview now has a print button that appears on hover (by [Ruibin Xing](https://github.com/silverbulletmd/silverbullet/pull/1065))
* Some more iterations on the [[Schema]] feature (still experimental)

## 0.9.2
* Widget buttons for [[Transclusions]] (by [onespaceman](https://github.com/silverbulletmd/silverbullet/pull/1013)) as well as some other transclusion-related fixes
* At long last, date and time functions and attributes now return local time instead of UTC
  * _Local_ means the time of the place where code runs, so this may be your server or client depending on the [[Client Modes]]. Ideally you set the timezones the same on both.
* In [[Space Script]], all syscalls are now exposed via “globals”, so they can be called directly using e.g. `editor.flashNotification("hello")` instead of `syscall("editor.flashNotification", "hello")`. The old way still works, but the new way is way cleaner.
* [MVP](https://en.wikipedia.org/wiki/Minimum_viable_product) of [[Schema]] support. This is still very nascent, future iterations are to come.
* SETTINGS is now indexed first, when a full space reindex needs to happen.
* New {[Page: Rename Linked Page]} command
* [[Live Queries]] are now also server-side rendered, just like [[Live Templates]]
* `Ctrl-n` and `Ctrl-p` shortcuts now work in the filter box (by [Ruibin Xing](https://github.com/silverbulletmd/silverbullet/pull/1036))
* Internal refactor, and more leverage of [JSR](https://jsr.io/). The SilverBullet [plug API](https://jsr.io/@silverbulletmd/silverbullet) is now published on JSR as well, and soon this will be the preferred way of importing the plug APIs.
* And these syscalls are now [fully documented](https://jsr.io/@silverbulletmd/silverbullet/doc/syscalls/~)

## 0.9.0
This is a more major version bump due to [[Space Config]], which is a bigger architectural change. It shouldn’t break anything for existing users — but you know — famous last words.

* [[Space Config]] is here! We hear you like Space stuff ([[Space Script]] and [[Space Style]]) so we keep adding more! This allows you to distribute your [[^SETTINGS]] across pages. A few things of note:
  * This is quite a _deep architectural change_ so I may have accidentally broken things I didn’t intend to, please report issues.
  * There is now a `@config` global variable that you can reference from anywhere containing the space’s currently active full configuration
  * There is now linting (checking) of `space-config` blocks, checking that you use built-in configuration keys correctly and reporting errors if not. Later this will be extended to allow plugs and space scripts to define custom validators as well (based on JSON schema).
  * Possible side-effect: if you configured a custom `indexPage` and are upgrading, it may be that your initial load brings you back to `index`. Just let the space reindex finish and reload and you should be good.
  * **Plug developers**: If you were using the `readSetting` library call, please switch to using the new `system.getSpaceConfig()` syscall instead once this is released. `readSetting` read the `SETTINGS` page only, this may now no longer give the full picture.
* [[Transclusions]] now support audio, video and PDFs in addition to images (by [onespaceman](https://github.com/silverbulletmd/silverbullet/pull/1008))
* New [[^Library/Core/Page/Space Overview]] library page part of the [[Library/Core]] Library that lists all of your [[Space Config]], [[Space Style]] and [[Space Script]] as well as some other fun stats.
* Support for adding CSS classes in [[Page Decorations]] (by [onespaceman](https://github.com/silverbulletmd/silverbullet/pull/945)). Check out [[Page Decorations#Use case: pimp my page]] 🤣
* Added caching to file listings (useful for large spaces or slow disks) (by [Justyn Shull](https://github.com/silverbulletmd/silverbullet/pull/1012))

## 0.8.5
* New power-user feature: [[Object Decorators]]. Its primary use case is to apply [[Page Decorations]], but you may find other uses as well. Speaking of which...
* **Breaking change:** The way [[Page Decorations]] are specified has changed. It has now been replaced with [[Object Decorators]](as just mentioned), which are a more generic mechanism. Your existing `pageDecorations` will stop working. You’ll have to rewrite based on the new format. See [[Page Decorations]] for examples.
* New [[CHANGELOG@L20]] syntax (by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/988))
* [[Library/Core]] library updates (run {[Libraries: Update]} to get it):
  * [[^Library/Core/Widget/Table of Contents]] widget can now be disabled using a [[Page Decorations|Page Decoration]]
  * [[Library/Core/Quick Notes]] now orders quick notes in reverse-chronological order
* **Fix:** Spellchecker correction was broken in Chrome
* **Fix:** Markdown preview was broken

## 0.8.4
* [[Page Picker#Keyboard shortcuts]]: allow folder completion using Shift-Space (by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/961))
* New [[Page Decorations]]: ability to hide pages from the page picker and auto complete (by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/962))
* The [[Expression Language]] now supports decimal numbers 🤯 (e.g. `3.14`)
* Non-existing pages that have been previously linked to (so effectively: broken links) now appear in the [[Page Picker]] (with a “Create page” hint) as well as in [[Links]] auto complete (marked as “Linked but not created”). This should make it easier to “fill in the gaps”: you can liberally create page links, and create those pages later easily via the page picker.
* New [[Space Script]] feature: [[Space Script#Custom HTTP endpoints]]: create custom endpoints on your SilverBullet server (under the `/_/` prefix).
* Updated the [[^Library/Core/New Page/Quick Note]] template to now use a (Windows and Android) naming pattern using the new `safeTime` function, also tweaked the naming pattern slightly (put a `/` in between the date and time so that these are organized by date), updated [[Library/Core/Quick Notes]] to show full path.
* Added Ruby [[Markdown/Syntax Highlighting]] (by [Bo Jeanes](https://github.com/silverbulletmd/silverbullet/pull/966))
* **Fix**: Due to some race conditions some situations pages would disappear from the index (e.g. from the [[Page Picker]]), this should now be fixed
* New [[SETTINGS]]: `pwaOpenLastPage` and `useSmartQuotes` (latter by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/960))
* **Fix**: CORS issues in Firefox (admonition related) (by [onespaceman](https://github.com/silverbulletmd/silverbullet/pull/964))
* **Technical:** Did another round of dependency upgrades and cleaned up some dead code.

---

## 0.8.2
* [[Page Decorations]] are here (initial implementation by [Deepak Narayan](https://github.com/silverbulletmd/silverbullet/pull/940), later refined by Zef)
* New type of [[Shortcuts|shortcut]]: `slashCommand`
* Naming is hard. Renamed the `source` attribute of [[Libraries]] to `import`. egacy references to `source` will keep working.
* Added support for [[Links#Caret page links]] making it slightly more convenient to link to [[Meta Pages]]
* **Fix:** Remove redundant vertical space for some tables (by [Eric Yang](https://github.com/silverbulletmd/silverbullet/pull/952))
* **Fix:** very large spaces would let the server blow up when saving snapshots. This is now fixed.
* **Fix:** Conflict copies could no longer be edited, whoops (initial fix by [Semyon Novikov](https://github.com/silverbulletmd/silverbullet/pull/939), later refined by Zef)
* **Fix**: `silverbullet upgrade` should now work again (or at least on the next upgrade)

---

## 0.8.1
* The old **Template Picker** has now been rebranded to [[Meta Picker]] and surfaces pages in your space tagged as `#template` or `#meta`. Read more about this in [[Meta Pages]].
* [[Transclusions]] has now been implemented, allowing inline embedding of other pages as well as images (by onespaceman) using the convenient `![[link]]` syntax.
* [[Libraries]] management has been rethought. You can now decoratively specify them in [[SETTINGS]] and keep them up to date with the {[Libraries: Update]} command.
* For new spaces, the default [[SETTINGS]] page is now tagged with `#meta`, which means it will only appear in the [[Meta Picker]]. There is also a new {[Navigate: Open SETTINGS]} command (bound to `Ctrl-,` and `Cmd-,`).
* Attachments are now indexed, and smartly moved when pages are renamed (by onespaceman)
* Images can now be resized: [[Attachments#Embedding]] (initial work done by [Florent](https://github.com/silverbulletmd/silverbullet/pull/833), later adapted by onespaceman)
* To make pure reading and browsing on touch devices a nicer experience, there is now a new **edit toggle** (top right). When _disabled_, you switch to _reader mode_ which makes sure your software keyboard doesn’t block the screen when navigating your space. This button is only visible on mobile devices (no physical keyboard attached) only. Can be disabled via the `hideEditButton` [[SETTINGS]] (and is disabled on this website, that’s why you don’t see it).
* Super^script^ and Sub~script~ are now supported (by [MrMugame](https://github.com/silverbulletmd/silverbullet/pull/879))
* Added a {[Delete Line]} command (by [pihentagy](https://github.com/silverbulletmd/silverbullet/pull/866))
* Improved selection behavior (by [MrMugame](https://github.com/silverbulletmd/silverbullet/pull/904))
* Hide `\` escapes in [[Live Preview]] (by [MrMugame](https://github.com/silverbulletmd/silverbullet/pull/901))
* Added Erlang [[Markdown/Syntax Highlighting]]
* Dates (formatted as e.g. `2023-07-01` or `2023-07-01 23:33`) in [[Frontmatter]] are now converted into strings (rather than empty objects)
* **Breaking change:** The legacy handlebars template syntax that supported `{{escapeRegex "something"}}` function calls (rather than `{{escapeRegex("something")}}`) has now been removed.
* `task` and `item` objects now have an additional `text` attribute that contains the full text of the item and/or task, with any [[Attributes]] and [[Tags]] intact (whereas they are removed from `name`)
* The `#boot` PWA loading the last opened page feature is back (put `#boot` at the end of your SilverBullet URL to auto load the last opened page)
* Numerous other bug fixes (thanks MrMugame and onespaceman)
---

## 0.7.7
* Added ability to configure PWA app name and description (web app manifest) via [[Install/Configuration]] variables (by [s1gnate-sync](https://github.com/silverbulletmd/silverbullet/pull/854))
* Improved styling for modals (by [Daniel](https://github.com/silverbulletmd/silverbullet/pull/840))
* Allow middle click to open links (by [Daniel](https://github.com/silverbulletmd/silverbullet/pull/841))
* Various theme fixes (by [onespaceman](https://github.com/silverbulletmd/silverbullet/pull/831))
* Fix Int polyfill (by [Daniel](https://github.com/silverbulletmd/silverbullet/pull/836))
* Make maximum attachment size configurable (by [Thomas](https://github.com/silverbulletmd/silverbullet/pull/832))
* Fix frontmatter tag indexing when tags are numbers (by [Justyn](https://github.com/silverbulletmd/silverbullet/pull/830))
* Fix for supporting page names with spaces at the tail or front end (by [Florent](https://github.com/silverbulletmd/silverbullet/pull/817))
* On the technical side:
  * Radically improved dependency management in the code base (by [Maks](https://github.com/silverbulletmd/silverbullet/pull/770))
* Dependency bumps for a lot of codemirror-related packages as well as Deno itself

---

## 0.7.6
* We now have [[Space Style]] in addition to [[Space Script]], enabling CSS tweaks to SilverBullet itself from any page (by [onespaceman](https://github.com/silverbulletmd/silverbullet/pull/796))
* Added [[Functions#contains(str, substr)]] function
* Properly report errors when calling non-existing [[Functions]] in queries
* It’s now possible to call [[Space Script#Custom functions]] in `indexPage` in [[SETTINGS]]
* Support custom [[Markdown/Admonitions]] (by [onespaceman](https://github.com/silverbulletmd/silverbullet/pull/786))
* Improved snippets for [[Links]] indexing (visible in [[Linked Mentions]]) (a {[Space: Reindex]} is required to see this), attempts to include the entire surrounding sentence, and if that’s too long cuts it down, but not mid-word.
* [[Objects#header]] containing [[Tags]] or [[Attributes]] are now properly indexed
* (Hopefully) fixed [weird rendering bugs](https://github.com/silverbulletmd/silverbullet/issues/745) for markdown in templates
* New {[Editor: Undo]} and {[Editor: Redo]} commands (so you can customize their keybindings or add them as actionButtons in [[SETTINGS]]).
* Various bugfixes around frontmatter in [[Snippets]].
* More attempts at fixing unnecessary “Page has changed elsewhere, reloading” reloads.
* Various other bug fixes

---

## 0.7.5
* [[Plugs/Share]] using the {[Share: Page Or Selection]} command (bound to Ctrl-s/Cmd-s by default): allowing you to quickly share the current page (or selection) to the clipboard as:
  * Clean markdown (to paste into other markdown supporting tools)
  * Rich text (to paste into unenlightened rich text tools like Google Docs, Confluence, Word etc.)
* Various improvements in tests and input checks (by Maks [here](https://github.com/silverbulletmd/silverbullet/pull/754) and [here](https://github.com/silverbulletmd/silverbullet/pull/751))
* Better sizing of the top bar (was buggy before and poorly implemented) (by [onespaceman](https://github.com/silverbulletmd/silverbullet/pull/753))
* Hashtag can now contain more different characters, including emoji (by [Matthew Pietz](https://github.com/silverbulletmd/silverbullet/pull/752))
* New [[Space Script]] APIs: `registerAttributeExtractor` and `registerEventListener`

---

## 0.7.3

* We had a big influx of people and contributions from the community, which is amazing. Here are the highlights:
  * Ability to “bake” templates and query results (with the new “bake” button or {[Page: Bake live blocks]}), that is: replace these blocks with their rendered results, and therefore freeze them in time, by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/719)
  * Pre-fill a new page with heading title in {[Page: Extract]} by [Patrik Stenmark](https://github.com/silverbulletmd/silverbullet/pull/744)
  * Added custom data field to template plug by [Michael Kolb](https://github.com/silverbulletmd/silverbullet/pull/716)
  * Markdown tables are now indexed [[Objects#table]], and queryable by [Michael Kolb](https://github.com/silverbulletmd/silverbullet/pull/729)
  * Added “copy to clipboard” button to code blocks, by [Joe Krill](https://github.com/silverbulletmd/silverbullet/pull/735)
  * Fenced code can now also use `~~~` in addition to triple backticks, by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/694)
  * Markdown preview pane now uses custom styles and dark mode, by [Joe Krill](https://github.com/silverbulletmd/silverbullet/pull/741)
  * Correctly skip adding default shortcuts for overridden commands, by [Joe Krill](https://github.com/silverbulletmd/silverbullet/pull/739)
  * Fix {[Link: Unfurl]} command, by [Joe Krill](https://github.com/silverbulletmd/silverbullet/pull/738)
  * [[Expression Language]] now supports unary minus (e.g. `-3`), by [Marek S. Łukasiewicz](https://github.com/silverbulletmd/silverbullet/pull/732)
  * Added [[Markdown/Syntax Highlighting]] for Diff, Powershell, Perl, TCL, Verilos, VHDL, Docker and CMake), by [Giovanni Pollo](https://github.com/silverbulletmd/silverbullet/pull/718) and Go by [Viktoras](https://github.com/silverbulletmd/silverbullet/pull/709)
  * Fixed dark mode for templates, by [Ashish Dhama](https://github.com/silverbulletmd/silverbullet/pull/698)
* There are also two very notable new plugs you may be interested in trying:
  * [[Plugs/TreeView]]: a sidebar showing (and allowing you to manipulate) your space’s folder tree (at long last)
  * [[Plugs/AI]]: various clever AI integrations (supporting many different LLMs, including locally hosted ones)
* [[Snippets]] using `matchRegex` can now use the `|^|` caret to wrap text around the replacement, see the [[Snippets#Examples]]
* Changed the signature of `silverbullet.registerFunction` to make the first argument an object, see [[Space Script#Custom functions]]. Old string-based scripts still work, for backwards compatibility.
* The [[Functions#replace(str, match, replacement)]] function now supports multiple replacements
* You can now use backticks (`) around identifiers in [[Expression Language]], to e.g. use names with spaces or other weird characters as attribute names.
* [[Link Unfurl]] now supports unfurling youtube videos
* Fixed edit button on code widgets after they have shifted
* Fixed page completion in template blocks
* Giant code reorganization (hopefully resulting in 0 regressions)

---

## 0.7.1
* Numerous bug fixes and significant performance improvements in template rendering (which now happen server-side), including code completion fixes.
* New `{{#each @varname in <expression>}}` syntax in [[Template Language#each directive]].
* **Experimental feature**: [[Space Script]], the ability to extend SilverBullet from within your SilverBullet space with JavaScript.
* New [[Functions#readPage(name)]] function.
* New query sources: [[Objects#command]] and [[Objects#syscall]]. The [[Keyboard Shortcuts]] and [[Commands]] pages now use these to list all key bindings and available commands automatically.
* You can now create emoji aliases (implemented by [Maarrk](https://github.com/silverbulletmd/silverbullet/pull/679)), see [[SETTINGS]] for an example 😅
* You can now conditionally show action buttons (see [[SETTINGS]]) _only_ on mobile devices (implemented by [Maarrk](https://github.com/silverbulletmd/silverbullet/pull/686))

---

## 0.7.0
I know what you’re thinking: another “major” minor release, so quickly?

Yeah... we’re swapping out some of the guts of SilverBullet here, so this warrants the version bump. Honestly, this should have been 100.0, but you know...

This is the one where the template engine SilverBullet is swapped out and no longer using [Handlebars.js](https://handlebarsjs.com/) under the hood. We’d like to thank handlebars for its effort, but everything has to end some day. It’s time to take our destiny into our own hands.

SilverBullet now uses its own custom [[Template Language]] that is _way, way, way_ dare I say _way_ more powerful than Handlebars. I put in a lot of effort to ensure backwards compatibility, so unless you did some obscure things in your templates, everything should keep working as is. If not, please reach out on our [community](https://community.silverbullet.md) and I’ll do my best to support you in this journey that for sure will be worth it.

Trust me, I’m an engineer.

> **note** **Upgrade note**
> While the [[Library/Core]] library that you (probably) imported previously will keep working (I hope), I would recommend you do another import overwriting the old files. Mainly because many templates have been rebuilt to leverage the new features of our new [[Template Language]] and therefore much cleaner. So please follow the [[Library/Core#Installation]] instructions, and hit “Ok” about 30 times.

So, what’s the fuss all about?

* **Soft breaking change**: `include` is the new name of the old `template` [[Blocks]]. Previously, a template block’s primary function was to include an external template or page — that role has now been replaced with [[Live Templates#Include]]. If you used `template` blocks in the past, you will see a warning squiggly warning appear suggesting you turn it into an `include` block, which is functionally equivalent to the old `template.` To fix this across your space, simply replace triple-backtick `template` with triple-backtick `include` across all your files and you should be done. That said, SilverBullet will detect if you’re using a legacy syntax `template` blocks and automatically interpret them as `include` blocks instead so _nothing should break_. Famous last words.
* So, funny story, we’re also **instantly deprecating** these new `include` blocks and suggest you `template` all the things, see [[Live Templates#Recommended alternative]] for the rationale behind this insanity. You will ask: “So what is he going to deprecate next? [[Live Queries]]? _Hahaha!_” Honestly, probably yes, because everything those can do, templates do better — basically. But let’s take it slow for now. One step at a time, as my mom says.
* **`template`s are the new hotness**. The body of a `template` block is now interpreted as the new and shiny [[Template Language]]! This means you get syntax highlighting and (best effort) code completion for all your markdown and template directives endeavors.
* The [[Template Language]] and [[Query Language]] have been unified. It may not have been visible to everybody, but the handlebars syntax and SB’s own query language were different before. No longer.
* The [[Expression Language]] used as part of the new [[Template Language]] has been significantly expanded. Some notable new features:
  * It now supports some basics like a `not` operator, and ternary operator (`bla ? true : false`). I know, the level of innovation here is crazy.
  * It now supports (sub) queries as values, simply wrap any query in `{` and `}` and you’re good to go: [[Expression Language#Queries]]
  * It now supports _page references_ as values: [[Expression Language#Page references]]
  * It now (officially) supports function calls, and while I’ve kept the set of built-in [[Functions]] deliberately small for now — this is where the big wins are going to be gained in future releases: [[Expression Language#Function calls]]. Let me know in the [community](https://community.silverbullet.md) what functions you’d like to see. _Even the ability to expand the set of functions using JavaScript from within your space_ is now on the table for future iterations.
* A [[CHANGELOG]] entry is never not going to do this justice. I recommend you simply (re)read the following pages and check out the examples to have your 🤯 and start to think what you can do with this:
  * [[Templates]]
  * [[Template Language]]
  * [[Query Language]]
  * [[Expression Language]]
* Ah yes, you can also still take notes with SilverBullet. That still works. I think.

## 0.6.1
* Tag pages: when you click on a `#tag` you will now be directed to a page that shows all pages, tasks, items and paragraphs tagged with that tag.
* Action buttons (top right buttons) can now be configured; see [[SETTINGS]] for how to do this.
* Headers are now indexed, meaning you can query them [[Objects#header]] and also reference them by name via page links using `#` that I just demonstrated 👈. See [[Links]] for more information on all the types of link formats that SilverBullet now supports.
* New {[Task: Remove Completed]} command to remove all completed tasks from a page
* **Read-only mode** (experimental) is here; see [[Install/Configuration#Run mode]] on how to enable it. This allows you to expose your space to the outside world in all its glory but without allowing anybody to edit anything.
  * [silverbullet.md](https://silverbullet.md) has now been redeployed to run in this mode
  * Pages in this mode are _server-side rendered_ so their content can actually be indexed by search engines. In addition, some [OpenGraph](https://ogp.me/) attributes are put in the HTML to enable nice embedding links, e.g. in our [community](https://community.silverbullet.md).
* New {[Clear Local Storage & Logout]} command to wipe out any locally synced data (and log you out if you use [[Authentication]]).
* Bug fixes:
  * Improved Ctrl/Cmd-click (to open links in a new window) behavior: now actually follow `@pos` and `$anchor` links.
  * Right-clicking links now opens the browser's native context menu again
  * `tags` in [[Frontmatter]] are now properly indexed again when listed as an array
* Internal changes:
  * Big refactor: of navigation and browser history, fixed some {[Page: Rename]} bugs along the way
  * Plugs now can no longer define their own markdown syntax, migrated all plug-specific syntax into the main parser. This should remove a bunch of editor “flashing”, especially during sync.

---

## 0.6.0

* **Templates 2.0**: templates are now turbocharged (that’s a technical term) and have replaced a lot of previously built-in (slash) commands. There’s more to this than will fit this CHANGELOG, have a look at [[Templates]]: and more specifically [[Page Templates]], [[Snippets]], [[Live Template Widgets]] and [[Libraries]], and read the items below.
* **Upgrade instructions**: to get the best experience after upgrading to 0.6.0 as an existing user, do the following:
  * Upgrade your docker image/deno version to 0.6.0 (or `latest`).
  * Reload your page 2-3x to be sure you have the latest front-end code running.
  * Run the {[Library: Import]} command in your space, and enter the following federation URL: `!silverbullet.md/Library/` This will import both the [[Library/Core]] and [[Library/Journal]] libraries into your space, bringing you roughly on par with 0.5.x versions in terms of functionality (this will include the daily note, weekly note, various slash commands etc.)
* A **quick FAQ** on the new template system:
  * **Where did my templates go!?** They have now moved to the [[Meta Picker]], run {[Navigate: Page Picker]} (or press `Cmd-Shift-t` on Mac or `Ctrl-Shift-t` on Windows/Linux) to get to them.
  * **Where did all my slash commands go?!** They are now distributed via [[Libraries]]. Yep, Libraries are here, enabling an easier way to distribute templates and pages. Read [[Libraries]] for more info.
  * **But, what about slash templates etc.?!** Yeah, we did some rebranding and changed how these are defined. Slash templates are now [[Snippets]] and cannot _just_ be instantiated via [[Slash Commands]], but through [[Commands]] and custom keybindings as well. Awesomeness.
  * **And my page templates broke!?** Yeah, same story as with [[Snippets]]: the format for defining these changed a bit, but it should be easy to update to the new format: check [[Page Templates]].
* The [[Getting Started]] page (that is embedded in the `index` page that is auto-generated when creating a new space) has been updated to include instructions on how to import the [[Library/Core]] library.
* **Directives have now been removed** from the code base. Please use [[Live Queries]] and [[Live Templates]] instead. If you haven’t migrated yet and want to auto-migrate, downgrade your SilverBullet version to 0.5.11 (e.g. using the `zefhemel/silverbullet:0.5.11` docker image) and run the {[Directive: Convert Entire Space to Live/Templates]} command with that version.
* (Hopefully subtle) **breaking change** in how tags work (see [[Objects]]):
  * Every object now has a `tag` attribute, signifying the “main” tag for that object (e.g. `page`, `item`)
  * The `tags` attribute will now _only_ contain explicitly assigned tags (so not the built-in tag, which moved to `tag`)
  * The new `itags` attribute (available in many objects) includes both the `tag` and `tags` as well as any tags inherited from the page the object appears in.
  * Page tags now no longer need to appear at the top of the page, but can appear anywhere as long as they are the only thing appearing in a paragraph with no additional text; see [[Objects#page]].
* New [[Markdown/Code Widgets|Code Widget]]: `toc` to manually include a [[Table of Contents]]
* Filter list (used by [[Page Picker]], [[Meta Picker]] and [[Command Palette]]) improvements:
  * Better ranking
  * Better positioning of modal (especially on mobile)
  * Better mouse behavior
* Templates:
  * Somewhat nicer rendering of {{templateVars}} (notice the gray background)
  * Rendering of [[Markdown/Code Widgets]] (such as live queries and templates) **is now disabled** on template pages, which should make them less confusing to read and interpret.
* The `indexPage` [[SETTINGS]] can now contain template variables, such as `{{today}}`
* Backend work in preparation for supporting more “serverless” deployments (e.g. Cloudflare workers and Deno Deploy) in the future
  * Move from [Oak](https://oakserver.github.io/oak/) to [Hono](https://hono.dev/)
  * Support for in-process plug loading (without workers)

---

## 0.5.11
* Keyboard shortcuts as well as priority (order in which they appear in the [[Command Palette]]) can now be configured for [[Commands]] in [[SETTINGS]]. The `priority` enables you to put frequently used commands at the top.
* The rendering of [[Live Templates]], [[Live Queries]], [[Table of Contents]] and [[Linked Mentions]] has been re-implemented. Rendering should now be near-instant, and the “flappy” behavior should be largely gone, especially after an initial load (results are cached). There may still be some visual regressions. Please report them if you find them.

---

## 0.5.10
* **Breaking change**: Local attachment URLs (`[page](url)` syntax and `![alt](url)` image syntax) are now interpreted relative to the page's folder unless their URL starts with a `/`, then they're relative to the space root (as per [this issue](https://github.com/silverbulletmd/silverbullet/issues/363))
* **Breaking change:** Revamped [[Templates]], specifically changed the format of [[Page Templates]]. The “Template: Instantiate Page” has been renamed to {[Page: From Template]}.
* It is now even more recommended to tag your [[Templates]] with the “template” tag because completion in [[Live Queries]] and [[Live Templates]] will now only suggest `#template` tagged pages.
* New [[Frontmatter]] attributes with special meaning: `displayName` and `aliases` (allowing to specify alternative names for pages)
* The [[Page Picker]] now also shows (and matches against) tags, aliases and display names for pages.
* It is now possible to filter pages based on tags in the [[Page Picker]] by typing a hashtag in the filter phrase, e.g. `#template` to filter pages that have a `template` tag.
* Added new commands to manage [[Outlines]]. Note this resulted in changing names and keyboard shortcuts for managing folds as well, to be more consistent with the other outline commands.
* Removed built-in multi-user [[Authentication]], `SB_AUTH` is no longer supported; use `--user` or `SB_USER` instead or an authentication layer such as [[Authelia]].
* Background and more experimental work:
  * Work on supporting multiple database and storage backends, reviving [[Install/Deno Deploy]] support.
  * This is now documented on the brand-new [[Install/Configuration]] page.
  * A new `silverbullet sync` command to [[Sync]] spaces (early days, use with caution)
  * Technical refactoring in preparation for multi-tenant deployment support (allowing you to run a single SB instance and serve multiple spaces and users at the same time)
    * Lazy everything: plugs are now lazily loaded (after a first load,  manifests are cached). On the server side, a whole lot of infrastructure is now only booted once the first HTTP request comes in

---

## 0.5.8
* Various bugfixes, primarily related to the new way of running docker containers, which broke things for some people. Be sure to have a look at the new [[Install/Configuration]] configuration options

---

## 0.5.7
* New {[Upload: File]} command to upload files and pictures (particularly valuable for mobile use cases). Implemented by [prcrst](https://github.com/silverbulletmd/silverbullet/pull/571).
* General support for highlighting errors (underlined) in the editor. Currently implemented for:
  * All YAML fenced code blocks (and [[Frontmatter]]): will now highlight YAML parse errors
  * [[Live Queries]]: will highlight non-existing query sources and non-existing template references in `render` clauses
* Basic [[Table of Contents]] support: any page _with 3 headers or more_ now has a “Table of Contents” widget appear (see this very page). You can toggle this feature using the {[Table of Contents: Toggle]} command.
* Tapping/clicking the top bar (outside of the page name and action buttons) now scrolls your page to the very top.
* Slightly more gracious error reporting on load when using the Online [[Client Modes]] and the server is offline.
* Any page tagged with `#template` is no longer indexed (besides as a `template`)
* Upgraded set of emoji (completed via the :thinking_face: syntax) to 15.1 (so more emoji)
* Various bug fixes

---
## 0.5.6
* Various optimization and bug fixes
* Experimental idea: [[Libraries]]
* The `Alt-Shift-n` key was previously bound to both {[Page: New]} and {[Quick Note]}. That won’t work, so now it’s just bound to {[Quick Note]}
* The `Alt-q` command is now bound to the new {[Live Queries and Templates: Refresh All]} command, refreshing all [[Live Queries]] and [[Live Templates]] on the page. This is to get y’all prepared to move away from directives.
* It’s likely that version 0.6.0 **will remove directives**, so please switch over to live queries and templates, e.g. using...
  * The new {[Directive: Convert Entire Space to Live/Templates]} command, which will (attempt) to convert all uses of directives in your space automatically (backup your space before, though, just in case)


---
## 0.5.5
* Bugfix: on some filesystems that don't report file creation time (like some NASes), SilverBullet crash. This should now be fixed.
* Performance improvements the loading of code widgets (e.g. Live Queries, Live Templates)

---
## 0.5.4
* We’re on a journey to rethink [[Templates]]:
  * It is now _recommended_ you tag all your templates with a `#template` tag, this will exclude them from [[Objects]] indexing and may in the future be used to do better template name completion (but not yet).
  * New feature: Introducing [[Snippets]], allowing you to create custom [[Slash Commands]]. This deprecates snippets and page templates, because [[Snippets]] are awesomer. 
* Many styling fixes and improvements to [[Live Queries]] and [[Live Templates]]
* Added a “source” button to [[Live Queries]] and [[Live Templates]] for better debugging (showing you the markdown code rendered by the template so you can more easily detect issues)
* [[Live Queries]]:
  * Support for `render all` where the entire result set is passed to a single template allowing you to e.g. dynamically build up tables, see [[Live Queries$render]] for an example.
* The default generated [[SETTINGS]] page now contains a link to [[SETTINGS]] on silverbullet.md for documentation purposes.
* The syntax to reference [[Markdown/Anchors]] has now changed to use `$`, instead of `@` (e.g. [[Live Queries$render]]), the old syntax still works but is deprecated. The reason for this change is consistency: you define an anchor using the `$myanchor` syntax, referencing it the same way makes more sense.
* [[Page Name Rules]] are now documented

---
## 0.5.3
* Changes to [[Objects]]:
  * Paragraphs are now indexed, see [[Objects#paragraph]] (thanks to [Ian Shehadeh](https://github.com/silverbulletmd/silverbullet/pull/528))
  * For consistency, list items are now always indexed as well (whether they contain a [[Tags|tag]] or not) see [[Objects#item]].
* The {[Directive: Convert to Live Query/Template]} now also converts `#use` and `#include` directives
* Styling improvements for Linked Mentions
* SilverBullet now fully works when added as PWA on Safari 17 (via the “Add to Dock” option).
* Fix support for handlebars variables in [[Live Queries]] and [[Live Templates]]
* Plug robustness improvements (SB shouldn’t fully break when loading plugs that rely on disabled syscalls)
* Various other bug fixes

---

## 0.5.1
* Fixes to auto-sizing of [[Live Queries]] and [[Live Templates]] widgets
* Fixed the combination of `limit` and `order by` not working well
* Auto complete for queries now works for queries split across multiple lines
* Auto complete for fenced code block languages (use the `/code` slash command)
* Slightly tweaked semantics for the `=` operator on arrays, see [[Live Queries]] for details

---

## 0.5.0
Oh boy, this is a big one. This release brings you the following:

* [[Objects]]: a more generic system for indexing and querying content in your space, including the ability to define your own custom object “types” (dubbed [[Tags]]). See the referenced pages for examples.
* [[Live Queries]] and [[Live Templates]]: ultimately will replace directives in future versions and **directives are now deprecated.** They differ from directives in that they don’t materialize their output into the page itself, but rather render them on the fly so only the query/template instantiation is kept on disk. All previous directive examples on this website how now been replaced with [[Live Templates]] and [[Live Queries]]. To ease the conversion there is {[Directive: Convert Query to Live Query]} command: just put your cursor inside of an existing (query) directive and run it to auto-convert.
* The query syntax used in [[Live Queries]] (but also used in directives) has been significantly expanded, although there may still be bugs. There’s still more value to be unlocked here in future releases.
* The previous “backlinks” plug is now built into SilverBullet as [[Linked Mentions]] and appears at the bottom of every page (if there are incoming links). You can toggle linked mentions via {[Mentions: Toggle]}.
* A whole bunch of [[PlugOS]] syscalls have been updated. I’ll do my best update known existing plugs, but if you built existing ones some things may have broken. Please report anything broken in [Github issues](https://github.com/silverbulletmd/silverbullet/issues).

**Important**:
* If you have plugs such as “backlinks” or “graphview” installed, please remove them (or to be safe: all plugs) from the `_plug` folder in your space after the upgrade. Then, also remove them from your `PLUGS` page. The backlinks plug is now included by default (named [[Linked Mentions]]), and GraphView still needs to be updated (although it’s been kind of abandoned by the author).

Due to significant changes in how data is stored, likely your space will be resynced to all your clients once you upgrade. Just in case you may also want to {[Space: Reindex]} your space. If things are really broken, try the {[Debug: Reset Client]} command.

---

## 0.4.0
The big change in this release is that SilverBullet now supports two [[Client Modes|client modes]]: _online_ mode and _sync_ mode. Read more about them here: [[Client Modes]].

Other notable changes:
* Massive reshuffling of built-in [[Plugs]], splitting the old “core” plug into [[Plugs/Editor]], [[Plugs/Template]] and [[Plugs/Index]].
* Directives in [[Live Preview]] now always take up a single line height.
* [[Plugs/Tasks]] now support custom states (not just `[x]` and `[ ]`), for example:
  * [IN PROGRESS] An in progress task
  * [BLOCKED] A task that’s blocked
  [[Plugs/Tasks|Read more]]
* Removed [[Cloud Links]] support in favor of [[Federation]]. If you still have legacy cloud links, simply replace the 🌩️ with a `!` and things should work as before.
