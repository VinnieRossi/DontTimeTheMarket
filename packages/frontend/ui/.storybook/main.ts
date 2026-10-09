import type { StorybookConfig } from '@storybook/react-vite'

/**
 * Storybook is the isolation test. A component that cannot render here from props alone has a
 * hidden dependency, and finding that out in a story is cheaper than finding it out in the app.
 * The accessibility addon runs against every story, so a contrast or labeling problem surfaces
 * while the component is still being written.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  // A clone of this template should not report anything anywhere until its owner decides to.
  core: { disableTelemetry: true },
}

export default config
