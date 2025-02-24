Transclusions are an extension of the [[Markdown]] syntax enabling inline embedding of content.

The general syntax is `![[path]]`. Two types of transclusions are currently supported:

# Media
Syntax: `![[path/to/image.jpg]]` see [[Documents#Embedding]] for more details.

Media resizing is also supported:
![[Documents#Media resizing]]
# Pages
Syntax:
* `![[page name]]` embed an entire page
* `![[page name#header]]` embed only a section (guarded by the given header)
* `![[page$anchor]]` embed a page _from_ the given anchor until the end of the page
* `![[page@pos]]` embed a page _from_ the given character position until the end of the page

For example, to embed a full page:
![[internal/test page]]
And just a header:
![[internal/test page#This is a header]]