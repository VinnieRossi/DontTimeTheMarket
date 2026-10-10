import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_ALLOCATIONS } from '../story-support'
import { AllocationList } from './AllocationList'

const meta = {
  title: 'Molecules/AllocationList',
  component: AllocationList,
  args: {
    rows: SAMPLE_ALLOCATIONS,
    total: 'Total: 100%',
    complete: true,
    onIncrease: () => undefined,
    onDecrease: () => undefined,
  },
} satisfies Meta<typeof AllocationList>

export default meta

type Story = StoryObj<typeof meta>

export const AddsUp: Story = {}

export const DoesNotAddUp: Story = {
  args: {
    complete: false,
    total: 'Total: 90% - 10% left to place',
    rows: [
      {
        ...(SAMPLE_ALLOCATIONS[0] ?? {
          assetId: 'c1',
          ticker: 'NTHX',
          name: 'Northfield Analytics',
          canIncrease: true,
          canDecrease: true,
        }),
        percent: '90%',
      },
    ],
  },
}
