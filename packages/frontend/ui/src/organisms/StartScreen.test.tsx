import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StartScreen } from './StartScreen'

const RUN_LENGTHS = [
  { value: 'short', label: 'Short - 1 year' },
  { value: 'standard', label: 'Standard - 3 years' },
]

function renderScreen(overrides: Partial<Parameters<typeof StartScreen>[0]> = {}) {
  const onSelectRunLength = vi.fn()
  const onStart = vi.fn()
  render(
    <StartScreen
      heading="Think you can beat the market?"
      lede="Trade a real, randomized slice of market history."
      runLengths={RUN_LENGTHS}
      selectedRunLength="standard"
      footnote="Scores are not saved anywhere yet."
      onSelectRunLength={onSelectRunLength}
      onStart={onStart}
      {...overrides}
    />
  )
  return { onSelectRunLength, onStart }
}

describe('StartScreen', () => {
  it('leads with the question and the copy it was given', () => {
    renderScreen()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Think you can beat the market?' })
    ).toBeVisible()
    expect(screen.getByText('Scores are not saved anywhere yet.')).toBeVisible()
  })

  it('marks the run length that is currently chosen', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: 'Standard - 3 years' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('reports a different run length without starting anything', async () => {
    const { onSelectRunLength, onStart } = renderScreen()

    await userEvent.click(screen.getByRole('button', { name: 'Short - 1 year' }))
    expect(onSelectRunLength).toHaveBeenCalledWith('short')
    expect(onStart).not.toHaveBeenCalled()
  })

  it('reports the start', async () => {
    const { onStart } = renderScreen()

    await userEvent.click(screen.getByRole('button', { name: 'Start run' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
