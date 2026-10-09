---
description: Conventions for the presentation package
globs:
  - "packages/frontend/ui/**"
---

# Presentation components

- A component receives every piece of data through its props and reports every action through a
  callback prop. It MUST render from props alone, with no provider around it, because that is
  what makes it renderable in a story, in a test, and in the app without three different setups.
- Local presentation state is fine: an open dropdown, a focused field, an animation. Application
  state and data fetching are not.
- Visual values come from theme tokens. A literal color, spacing, or font value in a component
  cannot be changed in one place, so the gate treats the token file as the only place they live.
- Every exported component ships a story and a test in the same commit. The story is the proof
  that the component has no hidden dependency.
- Organize by composition level: single elements, small combinations, feature-level assemblies,
  then layouts. A component only composes from levels below its own.
- Name data props for what they are and action props with an `on` prefix, so the interface
  documents itself at the call site.
