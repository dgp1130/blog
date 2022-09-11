# Noto Color Emoji Font

This font is used to render emojis on the site. Because there are a lot of
emojis the font is quite large (~10 MB). To avoid users downloading a bunch of
unnecessary font data, the font is "subset" to only include code points which
are actually used by the page.

[`noto-color-emoji-all.ttf`](./noto-color-emoji-all.ttf) is the full font, which
is stored in source but not deployed to the site.
[`noto-color-emoji.woff2`](./noto-color-emoji.woff2) is the subset font, limited
to only used characters. The subset process is not executed as part of a build,
so it needs to be updated manually whenever a new emoji is used on the site. The
process works like this:

## Adding a new emoji

First, look up the emoji you want from the
[full list](https://unicode.org/emoji/charts/full-emoji-list.html) and copy down
its code points (U+ABC12).

Open the [`unicodes.txt`](./unicodes.txt) file and add it as a new line. If the
emoji uses multiple code points, they should be space separated. Text after a
`#` character is considered a comment. Just follow the existing conventions of
the file.

Now it's time to subset the font while including the new emoji. Install
`pyftsubset` if it is not already available:

```shell
pip install fonttools brotli
```

Then run:

```shell
npm run font:update
```

This reads all the code points in `unicodes.txt` and subsets the font to only
include those glyphs. It then updates
[`noto-color-emoji.woff2`](./noto-color-emoji.woff2) to only include that
subset.

Finally, open [`noto-color-emoji.css`](./noto-color-emoji.css) and add the code
points to the `unicode-range` property. This tells the browser that the emoji
font should be loaded if it is needed for any of those code points. This is an
optimization so the browser can skip downloading the font if no emojis are
actually on the page.
