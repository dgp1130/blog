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

Open the [`emojis.txt`](./emojis.txt) file and copy-paste the emoji into the
file. New lines can be added as needed and are ignored by tooling, but comments
are _not_ supported.

Next, subset the font to only include the emoji listed in that file. Install
`pyftsubset` if it is not already available:

```shell
pip install fonttools brotli lxml
```

Then run:

```shell
npm run font:update
```

This reads all the code points in `emojis.txt` and subsets the font to only
include those glyphs. It then updates
[`noto-color-emoji.woff2`](./noto-color-emoji.woff2) to only include that
subset.

Finally, open [`noto-color-emoji.css`](./noto-color-emoji.css) and add emoji's
code points to the `unicode-range` property. This tells the browser that the
emoji font should be loaded if it is needed for any of those code points. This
is an optimization so the browser can skip downloading the font if no emojis are
actually on the page.
