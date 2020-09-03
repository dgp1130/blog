# src/

Contains source files segmented roughly by compile target.

* `11ty/` - NodeJS code executed as part of the 11ty build.
* `www/` - The input directory for 11ty. `*.njk` and `*.md` files are compiled
  into HTML documents. It's file structure roughly correlates to the URL
  structure of the final built application.
