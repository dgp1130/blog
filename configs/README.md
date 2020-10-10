# Configs

Config files to be shared across the project. These are exported as simple
JSON/JavaScript to remove the need for a TypeScript compilation. JavaScript
files should use `@ts-check` with comment annotations for type safety whenever
reasonably possible.

If the config is used by 11ty, it should be written in the CommonJS module
system to be compatible with Node. Otherwise, ES modules are preferred.
