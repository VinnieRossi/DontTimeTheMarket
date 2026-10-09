import '@testing-library/jest-dom/vitest'

/**
 * The test renderer implements no layout, so it has no ResizeObserver either. The chart watches
 * its container with one in order to stay as wide as the column it sits in, which is behavior a
 * real browser exercises and this environment cannot: it is stubbed rather than worked around in
 * the component, so the component keeps the one correct implementation.
 */
class NoLayoutResizeObserver implements ResizeObserver {
  observe(): void {
    // Nothing is ever laid out here, so nothing ever resizes.
  }

  unobserve(): void {
    // See observe.
  }

  disconnect(): void {
    // See observe.
  }
}

globalThis.ResizeObserver = NoLayoutResizeObserver
