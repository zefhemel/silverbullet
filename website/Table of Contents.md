You can add a table of contents to a page using `toc` [[Blocks]].

In its most basic form it looks like this (click the edit button to see the code):

```toc
```

You can use it in two ways:

1. _Manually_, by adding a `toc` widget to the pages where you’d like to render a ToC
2. _Automatically_, using a [[Live Template Widgets|Live Template Widget]]

To have a ToC added to all pages with a larger (e.g. 3) number of headings, it is recommended to use [[Library/Core/Widget/Table of Contents|this template widget]].

## Configuration
In the body of the `toc` code widget you can configure a few options:

* `header`: by default a “Table of Contents” header is added to the ToC, set this to `false` to disable rendering this header
* `headerText`: by default "# Table of Contents\n". Change it to change the rendering of this header
* `minHeaders`: only renders a ToC if the number of headers in the current page exceeds this number, otherwise renders an empty widget
* `maxHeaders`: only renders a ToC if the number of headers in the current page is below this number, otherwise renders an empty widget

Example:
```toc
header: false
minHeaders: 1
```

Want to add a table of contents to all your pages automatically? You can — that’s functionality available via the [[Library/Core]] library.