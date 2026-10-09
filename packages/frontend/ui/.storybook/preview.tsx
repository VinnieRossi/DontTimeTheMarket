import type { Decorator, Preview } from '@storybook/react-vite'
import '../src/styles/index.css'

/** Every story renders on the application surface, so a story looks like the app it belongs to. */
const onSurface: Decorator = (Story) => (
  <div className="app-surface">
    <Story />
  </div>
)

const preview: Preview = {
  decorators: [onSurface],
  parameters: {
    layout: 'padded',
    a11y: { test: 'error' },
  },
}

export default preview
