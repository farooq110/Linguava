# Pull request template — prompts contributors for the info reviewers need.
## Summary
<!-- One sentence: what does this PR add/fix? -->

## Type of change
<!-- Check one or more -->
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] ♻️ Refactor (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test addition / improvement

## Checklist
- [ ] My code follows the project style (TypeScript, shadcn/ui, repository pattern for DB access)
- [ ] I've added/updated Zod schemas for any new API inputs
- [ ] I've used the adapter pattern for any new third-party integration (see `docs/architecture.md`)
- [ ] I've tested my changes locally with `bun run dev`
- [ ] `bun run lint` passes
- [ ] `bunx tsc --noEmit` passes
- [ ] I've updated `docs/` if I changed user-facing behavior

## Screenshots (if UI changes)
<!-- Drag-and-drop screenshots here -->

## Related issues
<!-- Closes #123, Refs #456 -->

## Notes for reviewers
<!-- Anything they should pay extra attention to? -->
