# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Before considering a command/flag change finished

See `CONTRIBUTING.md`'s "Pull Requests" checklist in full — it's not optional. The two steps most
likely to get skipped, because nothing forces them locally the way `pnpm test` forces test failures:

1. **Update `messages/*.md`** for the command (summaries, descriptions, examples) to describe the new/changed flags.
2. **Regenerate the package's README command reference**: run `pnpm run readme` in that package's
   directory and commit the result. `simply-data` is the only package that does this automatically
   (via its `version` lifecycle script) — every other package needs the manual run.
3. **Run `pnpm run build`** for the affected package(s) so `command-snapshot.json` regenerates, and
   commit whatever changes. If the changed package is bundled into the `@simplysf/simply` orchestrator
   (see its `oclif.plugins` list), a root or `packages/simply` build also regenerates _its_
   `command-snapshot.json` automatically — no separate step needed.

CI's `git diff --exit-code` after `pnpm run build` catches a stale `command-snapshot.json`, but there
is no equivalent check for a stale README — it fails silently (published, just wrong) unless you
regenerate it yourself. The docs site (`site/`) auto-syncs from each package's README on the next
`docs.yml` run, so once the README is committed there's nothing further to do for the site.
