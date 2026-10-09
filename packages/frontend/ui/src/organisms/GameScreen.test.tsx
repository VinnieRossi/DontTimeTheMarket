import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GameScreen, type GameScreenProps } from './GameScreen'

function renderScreen(overrides: Partial<GameScreenProps> = {}) {
  const handlers = {
    onSelectSpeed: vi.fn(),
    onStep: vi.fn(),
    onOpenTrade: vi.fn(),
    onOpenData: vi.fn(),
    onOpenSettings: vi.fn(),
    onCashOut: vi.fn(),
  }
  const rendered = render(
    <GameScreen
      chart={<div data-testid="chart-slot" />}
      dayLabel="Day 120 / 756"
      speeds={[
        { value: 'paused', label: 'Pause' },
        { value: '1x', label: '1x' },
      ]}
      currentSpeed="1x"
      legend={[{ role: 'price', label: 'Market price' }]}
      readouts={[]}
      playerFigure={{ label: 'You', value: '$10,604' }}
      benchmarkFigure={{ label: 'Bogle NPC', value: '$10,355' }}
      tiles={[
        { label: 'Cash', value: '$3,480' },
        { label: 'Vs Bogle NPC', value: '+2.4%', direction: 'up' },
      ]}
      cashOut={{ label: 'Cash out now', enabled: true }}
      {...handlers}
      {...overrides}
    />
  )
  return { ...handlers, container: rendered.container }
}

describe('GameScreen', () => {
  it('renders the chart it was handed rather than building one', () => {
    renderScreen()
    expect(screen.getByTestId('chart-slot')).toBeVisible()
  })

  it('shows the clock, both values, and the tiles', () => {
    renderScreen()
    expect(screen.getByText('Day 120 / 756')).toBeVisible()
    expect(screen.getByText('$10,604')).toBeVisible()
    expect(screen.getByText('$10,355')).toBeVisible()
    expect(screen.getByText('+2.4%')).toBeVisible()
  })

  it('says nothing where there is no commentary, rather than holding an empty line open', () => {
    const { container } = renderScreen()
    expect(container.querySelector('.app-note')).toBeNull()
  })

  it('shows the commentary when there is some', () => {
    renderScreen({ commentary: 'Have you considered doing nothing?' })
    expect(screen.getByText('Have you considered doing nothing?')).toBeVisible()
  })

  it('reports every action it offers, and performs none of them', async () => {
    const handlers = renderScreen()

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
    await userEvent.click(screen.getByRole('button', { name: 'Step' }))
    await userEvent.click(screen.getByRole('button', { name: 'Trade' }))
    await userEvent.click(screen.getByRole('button', { name: '+ Data' }))
    await userEvent.click(screen.getByRole('button', { name: 'Realism settings' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cash out now' }))

    expect(handlers.onSelectSpeed).toHaveBeenCalledWith('paused')
    expect(handlers.onStep).toHaveBeenCalledTimes(1)
    expect(handlers.onOpenTrade).toHaveBeenCalledTimes(1)
    expect(handlers.onOpenData).toHaveBeenCalledTimes(1)
    expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1)
    expect(handlers.onCashOut).toHaveBeenCalledTimes(1)
  })

  it('refuses a cash out that has not unlocked yet', async () => {
    const handlers = renderScreen({
      cashOut: { label: 'Cash out (unlocks day 42)', enabled: false },
    })

    const button = screen.getByRole('button', { name: 'Cash out (unlocks day 42)' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(handlers.onCashOut).not.toHaveBeenCalled()
  })

  it('shows the readouts a player switched on', () => {
    renderScreen({ readouts: [{ key: 'rsi', label: 'RSI (14)', value: '61.4' }] })
    expect(screen.getByText('61.4')).toBeVisible()
  })
})
