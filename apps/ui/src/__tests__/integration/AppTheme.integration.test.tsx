import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { App } from '../../App';
import { ThemeProvider } from '../../themes/ThemeContext.js';

vi.mock('../../QuantumVisualizer', () => ({
  QuantumVisualizer: () => <div data-testid="mock-visualizer" />,
}));

describe('App theme integration', () => {
  it('toggles between dark and light themes via the theme switcher', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    const root = screen.getByTestId('app-root');
    expect(root).toHaveAttribute('data-theme-mode', 'dark');

    const toggleButton = screen.getByRole('button', { name: /light mode/i });
    await user.click(toggleButton);

    expect(root).toHaveAttribute('data-theme-mode', 'light');
  });

  it('renders dropdown options with fully opaque, accessible styling', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    const elementSelect = screen.getByLabelText(/element \(z\)/i);
    const options = within(elementSelect).getAllByRole('option');

    expect(options.length).toBeGreaterThan(0);
    const { backgroundColor, color } = options[0].style;

    expect(backgroundColor).toBe('rgb(255, 255, 255)');
    expect(color).toBe('rgb(0, 0, 0)');
  });
});
