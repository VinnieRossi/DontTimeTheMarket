import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_COMPANIES, SAMPLE_SECTOR_GROUPS } from '../story-support'
import { CompanyList } from './CompanyList'

const meta = {
  title: 'Molecules/CompanyList',
  component: CompanyList,
  args: {
    companies: SAMPLE_COMPANIES,
    groups: SAMPLE_SECTOR_GROUPS,
    currentGroup: 'all',
    emptyNote: 'No companies in that sector.',
    onSelectGroup: () => undefined,
    onToggleCompany: () => undefined,
    onOpenCompany: () => undefined,
  },
} satisfies Meta<typeof CompanyList>

export default meta

type Story = StoryObj<typeof meta>

export const EverySector: Story = {}

export const NarrowedToOneSector: Story = {
  args: {
    currentGroup: 'Health Care',
    companies: SAMPLE_COMPANIES.filter((company) => company.sector === 'Health Care'),
  },
}

export const NothingInThatGroup: Story = {
  args: { currentGroup: 'Utilities', companies: [] },
}
