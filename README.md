# dgp1130 Blog

My personal blog.

<!-- status badges for CI and Netlify. -->
![CI](https://github.com/dgp1130/blog/workflows/CI/badge.svg?branch=main)
[![Netlify Status](https://api.netlify.com/api/v1/badges/2911a197-8a53-460c-ad53-016372148b01/deploy-status)](https://app.netlify.com/sites/dwac/deploys)

## Development

Run a hot-reloading server with `npm start`.

Run tests with `npm test`.

Make a one-off build with `npm run build`. This is not all that useful for local
development, but CI takes advantage of it.

## Deployments

This repo deploys with [Netlify](https://netlify.com/). The
[CI GitHub action](.github/workflows/ci.yaml) contains part of the
configuration, while the rest is done on
[Netlify directly](https://app.netlify.com/sites/dwac/).

* The `deploy` branch is pushed to production immediately after a push to
  GitHub.
    * Only deployed if CI passes.
* The `main` branch is auto-deployed on GitHub push.
    * Deployed regardless of CI, because Netlify doesn't seem to support this
      feature in GitHub actions, so I can't make it dependent on CI).
* Pull requests auto-deploy a preview, so they can verified before merging.

## Docs

Looking for more documentation about the project? Take a look at our
[docs](doc/)!
