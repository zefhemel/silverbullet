Document editors allow users to not only view but also edit documents. This means that Silverbullet can (theoretically) be used for much more than just markdown, e.g. PDF, asciidoc, org and a lot more. Currently the feature is still very young and the only editors available are proof of concepts, but this should hopefully change soon. If you want to contribute and make your own editor look at [[#Internals]]

# Usage
Document editors are provided by [[Plugs]]. To install a document editor just install the plug. The editor will then be available for documents with certain file extensions which are specified by the plug, e.g. an image viewer would be available for `jpg`, `jpeg` and `png`.
To edit or view a document, use `Ctrl-o` to open the document navigator. Files for which a document editor is available will have their extension highlighted in blue.

# Available editors
Currently only small demos are available
- [TXT editor](https://github.com/MrMugame/silverbullet-txt/)
- [PDF viewer](https://github.com/MrMugame/silverbullet-pdf/)

# Internals
Internally document editors work similarly to [[Markdown/Code Widgets]]. First the editor is defined inside the plug manifest. The `editor` field is used to specify the file extensions this editor can handle.

```yaml
name: txteditor
functions:
  TXTEditor:
    path: ./editor.ts:editor
    editor: ["txt"]
```

The function provided should look like this, again similar to code widgets. The provided html and script will be injected into an iframe. To communicate with silverbullet events are used which are best described in the example TXT editor under [[#Available editors]]

```typescript
export async function editor(): Promise<{ html: string, script: string }> {
  return {
    html: "<h1>Document Editor example</h1>"
    script: "console.log('Initalised')"
  }
}
```