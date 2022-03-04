# Emojis

This blog uses the
[Noto Color Emoji font](https://github.com/googlefonts/noto-emoji/) and has a
few optimizations to make this viable for users. There are a lot of emojis in
the font, so it is quite large (~10 MB). To avoid users downloading a bunch of
unnecessary font data, the font is "subset" to
[only include emojis which are actually used on the page](/src/www/res/fonts/noto/README.md).

The subset font is then referenced by a `@font-face` style which includes a
[`unicode-range`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range)
property that limits the font to only its supported emoji glyphs. This allows
the browser to skip downloading the font if none of those glyphs (no emojis) are
actually used on the page.

Using a new emoji requires some manual effort, see
[adding a new emoji](/src/www/res/fonts/noto/README.md#adding-a-new-emoji).

References:

* [This blog](https://markoskon.com/creating-font-subsets/) gives a lot of great
  information about font subsetting, how it works, and the available tools.
* [wakamaifondue](https://wakamaifondue.com/) (what can my font do) is useful
  tool for inspecting a font file to see what glyphs and features are actually
  included in it.
* [The full Unicode list](https://unicode.org/emoji/charts/full-emoji-list.html)
  contains a comprehensive list of all emojis and their code points.
