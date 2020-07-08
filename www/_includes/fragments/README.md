# Fragments

Fragment templates for rendering pieces of a page. These are limited to specific
UI fragments and do not include `<html></html>` tags and don't represent a full
HTML page. These fragments are designed to be included within other pages as
needed.

Each fragment should provide at least one macro which generates its HTML
content. Another `styles` macro may be provided which will emit the CSS styles
needed to effectively render the fragment. These styles should be included on
any page which uses the fragment.
