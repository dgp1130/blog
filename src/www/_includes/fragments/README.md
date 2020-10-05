# Fragments

Fragment templates for rendering pieces of a page. These are limited to specific
UI fragments and do not include `<html></html>` tags and don't represent a full
HTML page. These fragments are designed to be included within other pages as
needed.

Each fragment may provide a `*.css` file with its styling. It should `@import`
any of its own dependencies to keep a strong abstraction layer. Using a fragment
requires calling the macro defined in the `*.njk` file *and* `@import`-ing the
`*.css` files.

Fragment styles should be namespaced with a class named `frag-${name}`, to
isolate them from each other. Since these do not include any kind of shadow DOM,
a class namespace is the best isolation we can implement.

Even if a fragment has no styles, it can still be a good idea to
make an empty file for consumers to import. If styles are added later, then the
import graph will already be correct, making the migration easier.
