'use client'

import { isPortfolioRun, type RunLength } from '@dttm/engine'
import { drawSeed, useGame } from '@dttm/hooks'
import { PageShell, StartScreen } from '@dttm/ui'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { BRAND, RUN_LENGTH_CHOICES, START_SCREEN_COPY } from '@/lib/game-view'
import { IndexRun } from './index-run'

/**
 * Portfolio mode, loaded only once somebody asks for it.
 *
 * It is the one part of the app that reads the company roster, which is by far the largest thing
 * this repository ships. Importing it on demand is what keeps an index run's first load to the
 * index series alone, and it is why the roster lives behind the engine's own second entry point
 * rather than beside everything else.
 */
const PortfolioApp = dynamic(async () => (await import('./portfolio-app')).PortfolioApp, {
  ssr: false,
  loading: () => <p className="app-text-muted">Reading the company roster...</p>,
})

/**
 * The composition. It holds a run, decides which of the two modes is on, and hands the run to the
 * screens that render it. It holds no rule of the game and no markup of its own.
 */
export function GameApp() {
  const { state, dispatch, startRun, openRun, reset } = useGame()
  const [runLength, setRunLength] = useState<RunLength>('standard')
  /** Non-null while the player is in portfolio mode, and the seed its run will be opened with. */
  const [builderSeed, setBuilderSeed] = useState<number | null>(null)

  const leavePortfolio = (): void => {
    setBuilderSeed(null)
    reset()
  }

  if (state !== null && isPortfolioRun(state)) {
    return (
      <PortfolioApp
        seed={state.seed}
        run={state}
        dispatch={dispatch}
        openRun={openRun}
        onExit={leavePortfolio}
      />
    )
  }

  if (state === null && builderSeed !== null) {
    return (
      <PortfolioApp
        seed={builderSeed}
        run={null}
        dispatch={dispatch}
        openRun={openRun}
        onExit={leavePortfolio}
      />
    )
  }

  if (state !== null) {
    return <IndexRun state={state} dispatch={dispatch} onPlayAgain={reset} />
  }

  return (
    <PageShell brand={BRAND} narrow>
      <StartScreen
        heading={START_SCREEN_COPY.heading}
        lede={START_SCREEN_COPY.lede}
        footnote={START_SCREEN_COPY.footnote}
        runLengths={RUN_LENGTH_CHOICES}
        selectedRunLength={runLength}
        startLabel={START_SCREEN_COPY.startLabel}
        secondaryLabel={START_SCREEN_COPY.secondaryLabel}
        onSelectRunLength={(value) => {
          const choice = RUN_LENGTH_CHOICES.find((option) => option.value === value)
          if (choice !== undefined) setRunLength(choice.value)
        }}
        onStart={() => startRun(runLength)}
        /*
         * The seed is drawn here rather than when the run opens, because the builder has to show
         * the roster under the same disguise the run will use.
         */
        onSecondary={() => setBuilderSeed(drawSeed())}
      />
    </PageShell>
  )
}
