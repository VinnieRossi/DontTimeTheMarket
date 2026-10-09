# 5. Design tokens rather than utility classes

## Status

Accepted.

## Context

The release this port is based on styled the app with Tailwind, writing values inline at each call
site: `text-[11px]`, `shadow-[0_2px_0_var(--color-line)]`, `bg-[#f3f8fb]`. The template this
project is now built from takes the opposite position: every visual value lives in one token file,
components resolve tokens through class names, and the architecture note calls the token file the
only place a raw color, length, or font value is written.

The two cannot both hold. Keeping the utility classes would have meant either dropping the token
rule or declaring a token for every arbitrary value and still writing it at the call site.

## Decision

Tailwind is dropped. The palette, the spacing scale, the type scale, the radii, the shadows, and
the chart's own colors are declared in `@dttm/theme`, and the components carry class names that
resolve them. The visual design itself is unchanged: the same colors, the same two typefaces, the
same rounded cards with a hard bottom edge.

The typefaces move into the theme package with the tokens that name them, so Storybook and the app
load the same faces rather than each wiring its own loader.

The chart is the one exception and it is a deliberate one. A canvas takes a color string and
cannot read a class, so `MarketChart` reads the tokens it needs at runtime through a single helper
and names tokens rather than colors everywhere else.

## Consequences

Changing what the game looks like is an edit to one file, and the token story in Storybook shows
the whole palette and scale on one page.

A component's markup says what a thing is rather than what it looks like, which is what lets a
story, a test, and the app render the same component with no setup between them.

The cost is that there is no shortcut for a one-off value: a new spacing or color means adding a
token, and that is the intended friction. The writing of a screen is also more verbose than a
utility class soup, which is the trade the template already made and this project now shares.
