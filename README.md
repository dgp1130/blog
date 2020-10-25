# dgp1130 Blog

My personal blog, hosted at [https://blog.dwac.dev/](https://blog.dwac.dev/).

<!-- status badges for CI and Netlify. -->
![CI](https://github.com/dgp1130/blog/workflows/CI/badge.svg?branch=main)
[![Netlify Status](https://api.netlify.com/api/v1/badges/2911a197-8a53-460c-ad53-016372148b01/deploy-status)](https://app.netlify.com/sites/dwac/deploys)

## Local Builds

Run a hot-reloading server with `npm start`. Open
[`http://localhost:8080/`](http://localhost:8080/) to view the local site.

You can make a one-off build with `npm run build`. This is not all that useful
for local development, but CI takes advantage of it.

You can debug the build in VSCode with the `11ty Build` launch configuration.
This will run a build and attach the VSCode debugger to each process as it
executes. This should trigger breakpoints in [`.eleventy.js`](.eleventy.js) and
any related files.

You can run/build for production by using `npm run start:prod` and
`npm run build:prod`. These enable various optimizations for production use.
Note that `npm run start:prod` will encounter a CSP error and live reload will
not work, as browser sync is not included in prod.

## Tests

Run all tests once with `npm test`.

There are two sets of tests that are executed:
1. Tests of the NodeJS code used in the 11ty build.
    * Run directly with `npm run test:11ty`.
    * Debug with the `11ty Test` launch configuration in VSCode.
1. Tests of the client browser code.
    * Run directly with `npm run test:browser`.
    * Watch with `npm run test:browser:dev`.
    * Debug with `npm run test:browser:dev` and open
      [`http://localhost:9876/debug.html`](http://localhost:9876/debug.html).
      This should include include an HTML reporter, live reloads, and
      functioning source maps.

## Deployments

This repo deploys with [Netlify](https://netlify.com/). The
[CI GitHub action](.github/workflows/ci.yaml) contains part of the
configuration, while the rest is done on
[Netlify directly](https://app.netlify.com/sites/dwac/).

* The `deploy` branch is pushed to production immediately after a push to
  GitHub.
    * Only deployed if CI passes.
    * Hosted at https://blog.dwac.dev/ and https://dwac-blog.netlify.app/.
* The `main` branch is auto-deployed on GitHub push.
    * Only deployed if CI passes.
    * Hosted at [https://main-preview--dwac-blog.netlify.app/](https://main-preview--dwac-blog.netlify.app).
* Any `posts/*` branches are auto-deployed on GitHub push.
    * These are previews of in-progress posts, so tests are not executed here.
    * Hosted at https://post-${branch-name}--dwac-blog.netlify.app.

You can also perform one-off test deployments to verify the Netlify
configuration and the real production environment. Build the application first,
then use `npm run deploy-test ${alias}` to deploy it to Netlify. This should
generate a URL for you to visit and test the site with. It is also an easy way
to test on mobile phones without having to run the site locally.

## Docs

Looking for more documentation about the project? Take a look at our
[docs](doc/)!

## Unversioned Resources

Resources not stored in source control (like original, uncompressed images) are
stored in a
[DWAC Google Drive folder](https://drive.google.com/drive/folders/1D8nKCF3skWZ65clGnUDk1yrdxJ0zhgIT).

## Analytics

Analytics are hosted on [Plausible](https://plausible.io/).

## Domain Management

The [domain is registered](https://domains.google.com/registrar/dwac.dev) with
[Google Domains](https://domains.google.com/) and uses their default DNS.

Domains in Google Domains are configured with Netlify via DNS CNAME redirects.
[blog.dwac.dev](https://blog.dwac.dev/) redirects to
[dwac-blog.netlify.app](https://dwac-blog.netlify.app/) which is updated from
the [`deploy`](https://github.com/dgp1130/blog/tree/deploy) branch.

## SSL

`*.dev` domains must use
[HSTS](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security), so
[SSL/TLS](https://en.wikipedia.org/wiki/Transport_Layer_Security) is
**required**. The certificate is provisioned from
[Let's Encrypt](https://letsencrypt.org/) via
[Netlify's native integration](https://app.netlify.com/sites/dwac/settings/domain#https).
