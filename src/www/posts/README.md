# Posts

This directory contains all the blog posts displayed. They work like typical
markdown with a YAML front matter section.

## Front matter

The front matter **must** contain the following values:

* `tags: posts` - This makes it show up in the home page list.
* `layout: pages/post` - This makes it use the standard post template.
* `title` - The title to generate for the page.
* `date` - The ISO 8601 date when the post is first published to prod.
* `excerpt` - A short description for SEO purposes.

## Special tags

Adding `::: timestamp :::` will insert a formatted value from the `date` front
matter. This should typically go immediately under the top header.