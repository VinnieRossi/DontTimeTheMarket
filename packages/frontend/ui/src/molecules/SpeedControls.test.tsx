import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SpeedControls } from './SpeedControls'

const OPTIONS = [
  { value: 'paused', label: 'Pause' },
  { value: '1x', label: '1x' },
]

describe('SpeedControls', () => {
  it('marks the speed the market is running at', () => {
    render(
      <SpeedControls
        options={OPTIONS}
        current="1x"
        onSelect={() => undefined}
        onStep={() => undefined}
      />
    )
    expect(screen.getByRole('button', { name: '1x' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the speed that was chosen', async () => {
    const onSelect = vi.fn()
    render(
      <SpeedControls options={OPTIONS} current="1x" onSelect={onSelect} onStep={() => undefined} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(onSelect).toHaveBeenCalledWith('paused')
  })

  it('offers a single day as its own control, which is the only way to watch one move', async () => {
    const onStep = vi.fn()
    render(
      <SpeedControls
        options={OPTIONS}
        current="paused"
        onSelect={() => undefined}
        onStep={onStep}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Step' }))
    expect(onStep).toHaveBeenCalledTimes(1)
  })
})
