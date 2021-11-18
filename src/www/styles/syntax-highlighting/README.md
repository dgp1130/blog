# Syntax Highlighting Themes

These files contain styling data for languages inside `<code />` blocks. Each
one should be scoped to a particular language and provide all the colors/styles
for that language.

The markup is generated via [PrismJs](https://prismjs.com/). See
[their FAQ](https://prismjs.com/faq.html#how-do-i-know-which-tokens-i-can-style-for)
to understand what classes are generated for a particular language in order to
know what needs to be styled.

These styles are enabled for a post by adding `languages: [ ${lang} ]` to the
front matter. See the posts [README](/src/www/posts/README.md).
