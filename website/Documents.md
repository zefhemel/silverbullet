#level/beginner

While SilverBullet for sure is aimed at primarily text-based content, life can not fully be represented in text always. Therefore, SilverBullet supports documents. Documents, like [[Pages]] ultimately are — once again — just files on disk. Using plugs, documents of specific file types can also be viewed and edited.

# Uploading
To create a document, you have a few options:

* Use the {[Upload: File]} command (especially useful on mobile devices)
* Drag & drop files or images onto a page
* Copy & paste files or images onto a page

All options will prompt you for a file name to use to store the document, and then include the document as an embedded image (if it was an image) or link to the file.

# Managment
Using `Ctrl-o` you can open the document navigator, which will display all documents in your Silverbullet space. You can either:
  - Delete or rename documents for which no [[Document Editor]] is available (indicated by the grey hint)
  - Open and view documents for which a [[Document Editor]] is available (indicated by the blue hint)

# Linking
Documents can be linked to in two ways:
* Via the regular link syntax: `[link text](document.pdf)`. URLs here are relative to the page, so on a page named `MyFolder/Hello`, `[link text](document.pdf)` would refer to a document stored in `MyFolder/document.pdf`.
* Via the wiki link syntax: `[[document.pdf]]`. These paths are absolute and relative to your space’s root, just like regular page links. That is: on a page `MyFolder/Hello` a document link `[[document.pdf]]` would link to the file `document.pdf` in the space’s root folder.

# Embedding
Media can also be embedded using the [[#Linking]] syntax, but prefixed with an `!`:
Images, videos, audio and PDFs are currently supported.

* `![alternate text](image.png)`
* `![[image.png]]`

These follow the same relative/absolute path rules as links described before.

## Media resizing
In addition, media can be _sized_ using the following syntax:
* Specifying only a width: `![Alt text|300](image.png)` or `![[image.png|300]]`
* Specifying only a height: `![Alt text|x300](image.png)` or `![[image.png|x300]]`
* Specifying both width and height: `![Hello|300x300](image.png)` or `![[image.png|300x300]]`