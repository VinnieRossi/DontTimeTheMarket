# 6. Portfolio mode is a second run shape behind one step

## Status

Accepted.

## Context

Index mode plays one instrument: the whole market as a single line, with one position, one
benchmark, and one price series that exists whether or not the player owns any of it.
Portfolio mode plays several real companies at once, under generated names, with a weight per
holding, a benchmark that holds the same basket, and no single market price at all.

The two have to share every rule about what a trade costs.
A spread, a FIFO lot, a long-term tax rate, and the score are the same thing in both, and a game
where selling a company cost something different from selling the index would be lying about one
of them.
They also have to share the day: orders fill at the next day's price in both, because that one
property is what closes off the lookahead exploit and makes a replay exact.

Three shapes were considered.

**One state for both**, with the index modeled as a portfolio of one holding.
It is the tidiest model on paper and it was rejected on what it costs everywhere else: every
index-mode read would go through a collection of one, every portfolio read would go past a market
price that does not exist, and the change would have rewritten the whole engine, the hook, the
view mapping, and every test, to add a feature.
The risk of changing index-mode behavior by accident, in a simulation whose entire value is that
it behaves identically on the same seed, is not worth the symmetry.

**Two engines**, each with its own reducer and its own copy of the rules.
Rejected outright: two copies of a tax rule are two tax rules, and they would disagree the first
time one of them was changed.

**Two state shapes behind one reducer and one set of rules**, which is what was built.

## Decision

A run is `RunState`, a union of `GameState` and `PortfolioRunState`, discriminated by `mode`.
`step(state, action)` takes either and routes on that field.

Every rule both kinds of run obey lives in a module both of them call, and none of those modules
knows which kind of run is calling:

- `trade-math.ts`: the spread, FIFO lot consumption, the capital gains tax, the drawdown.
- `scoring.ts`: the annualized edge over the benchmark, the total return, the minimum scorable
  length, whether there is history left to continue into.
- `interest.ts`, `comments.ts`, `momentum.ts`, `technicals.ts`: written against the few fields
  they need rather than against a kind of run.

What is not shared is the orchestration of a day and the opening of a run, which are about the
shape of the state rather than about the rules, and which read more clearly written out twice
than generalized into one function with a branch on every line.

A portfolio run carries its own universe: the whole roster, disguised under the run's seed, with
each company's prices, lives in the state.
That is what keeps `step` free of the baked roster, which matters for a second reason below.

## Consequences

The committed company roster is the largest thing this repository ships, around 850KB gzipped
against the index series' 300KB.
Because only the opener reads it, it reaches the browser through a second package entry point,
`@dttm/engine/stocks`, imported by one component that the app loads on demand.
An index run therefore never downloads it, which is checkable: the roster lands in its own chunk,
named only by the lazy-loading manifest.
Anything added to the engine that needs the roster has to go behind that entry point too, or the
split quietly stops working.

Portfolio runs draw from a shallower window of history than index runs, starting in 2005 rather
than 1971, because requiring every company to have been listed since 1971 would cut the roster to
a handful of survivors in three sectors.
They also reserve only one run length of trailing data rather than two, so a portfolio run that
ends against the end of the data is told it has no history left to continue into, where an index
run always has room.

The disguise is honest rather than secure.
The roster ships with the real names in it, because the reveal at the end of a run needs them and
a static game has nowhere else to keep them.
A player who opens the bundle can read them; the disguise is there so that somebody playing the
game is judging a company on its sector, its filings, and the shape of its price line, not so
that the mapping is impossible to recover.

The roster is a survivors-only sample, because every free source of daily per-company history
serves only companies that are still listed.
The product says so on the builder screen rather than hiding it, and the famous collapses appear
there as history with no price line and nothing to trade.
