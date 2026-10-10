import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SAMPLE_ALLOCATIONS } from '../story-support'
import { AllocationList } from './AllocationList'

describe('AllocationList', () => {
  it('shows every holding with the share it was given', () => {
    render(
      <AllocationList
        rows={SAMPLE_ALLOCATIONS}
        total="Total: 100%"
        complete
        onIncrease={vi.fn()}
        onDecrease={vi.fn()}
      />
    )
    expect(screen.getByText('NTHX')).toBeVisible()
    expect(screen.getByText('60%')).toBeVisible()
    expect(screen.getByText('40%')).toBeVisible()
  })

  it('reports which holding was nudged and in which direction', async () => {
    const onIncrease = vi.fn()
    const onDecrease = vi.fn()
    render(
      <AllocationList
        rows={SAMPLE_ALLOCATIONS}
        total="Total: 100%"
        complete
        onIncrease={onIncrease}
        onDecrease={onDecrease}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Increase NTHX allocation' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decrease CRWD allocation' }))
    expect(onIncrease).toHaveBeenCalledWith('c1')
    expect(onDecrease).toHaveBeenCalledWith('c2')
  })

  it('marks a total that adds up differently from one that does not', () => {
    const { container: ok } = render(
      <AllocationList
        rows={SAMPLE_ALLOCATIONS}
        total="Total: 100%"
        complete
        onIncrease={vi.fn()}
        onDecrease={vi.fn()}
      />
    )
    expect(ok.querySelector('.app-alloc__total--ok')).not.toBeNull()

    const { container: off } = render(
      <AllocationList
        rows={SAMPLE_ALLOCATIONS}
        total="Total: 90%"
        complete={false}
        onIncrease={vi.fn()}
        onDecrease={vi.fn()}
      />
    )
    expect(off.querySelector('.app-alloc__total--off')).not.toBeNull()
  })
})
