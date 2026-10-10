import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EndScreen, type EndScreenProps } from './EndScreen'

function renderScreen(overrides: Partial<EndScreenProps> = {}) {
  const onContinue = vi.fn()
  const onPlayAgain = vi.fn()
  render(
    <EndScreen
      heading="You beat the Bogle NPC"
      edge="+184 bps"
      won
      verdict="A small win over a short horizon happens more than you would think."
      scores={[
        { label: 'Total return', value: '18.4%' },
        { label: 'Trades placed', value: '14' },
      ]}
      continueAction={{ label: 'Continue this run', enabled: true }}
      onContinue={onContinue}
      onPlayAgain={onPlayAgain}
      {...overrides}
    />
  )
  return { onContinue, onPlayAgain }
}

describe('EndScreen', () => {
  it('leads with the verdict and the score', () => {
    renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: 'You beat the Bogle NPC' })).toBeVisible()
    expect(screen.getByText('+184 bps')).toBeVisible()
  })

  it('colors the score by whether the run was won', () => {
    const { container } = render(
      <EndScreen
        heading="The Bogle NPC wins this one"
        edge="-203 bps"
        won={false}
        verdict="Most players lose to a patient buy-and-hold benchmark."
        scores={[]}
        continueAction={{ label: 'Continue (only available when winning)', enabled: false }}
        onContinue={() => undefined}
        onPlayAgain={() => undefined}
      />
    )
    expect(container.querySelector('.app-end__edge')?.className).toContain('app-text-down')
  })

  it('lists every figure from the run', () => {
    renderScreen()
    expect(screen.getByText('18.4%')).toBeVisible()
    expect(screen.getByText('14')).toBeVisible()
  })

  it('reports a continue and a restart', async () => {
    const { onContinue, onPlayAgain } = renderScreen()

    await userEvent.click(screen.getByRole('button', { name: 'Continue this run' }))
    await userEvent.click(screen.getByRole('button', { name: 'Play a new run' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(onPlayAgain).toHaveBeenCalledTimes(1)
  })

  it('refuses a continue the run has not earned', async () => {
    const { onContinue } = renderScreen({
      continueAction: { label: 'Continue (only available when winning)', enabled: false },
    })

    const button = screen.getByRole('button', {
      name: 'Continue (only available when winning)',
    })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('reveals nothing for a run that disguised nothing', () => {
    renderScreen()
    expect(screen.queryByRole('heading', { name: /actually holding/ })).toBeNull()
  })

  it('names the real company behind each disguise once the run is over', () => {
    renderScreen({
      reveal: [
        {
          assetId: 'c1',
          ticker: 'NTHX',
          fakeName: 'Northfield Analytics',
          realName: 'Advanced Micro Devices',
          detail: 'Information Technology - Semiconductors',
        },
      ],
      revealNote: 'Generated names, real companies.',
    })
    expect(screen.getByRole('heading', { name: 'Who you were actually holding' })).toBeVisible()
    expect(screen.getByText('Advanced Micro Devices')).toBeVisible()
    expect(screen.getByText(/NTHX/)).toBeVisible()
    expect(screen.getByText('Generated names, real companies.')).toBeVisible()
  })
})
