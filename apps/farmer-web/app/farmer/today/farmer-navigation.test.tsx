import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FarmerNavigation } from './farmer-navigation';

afterEach(() => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
});

describe('Farmer contextual Speak shell', () => {
  it('keeps the exact five-item navigation and honestly disables unowned destinations', () => {
    render(
      <FarmerNavigation
        currentRoute="/farmer/today"
        locale="mr"
        submitText={vi.fn()}
        transportConfigured={false}
      />,
    );

    const navigation = screen.getByRole('navigation', { name: 'शेतकरी नेव्हिगेशन' });
    expect(within(navigation).getAllByRole('listitem')).toHaveLength(5);
    expect(within(navigation).getByRole('link', { name: 'आज' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(navigation).getByRole('button', { name: 'कामे' })).toBeDisabled();
    expect(within(navigation).getByRole('button', { name: 'सूचना' })).toBeDisabled();
    expect(within(navigation).getByRole('button', { name: 'माझे शेत' })).toBeDisabled();
    expect(within(navigation).getByRole('button', { name: 'बोला' })).toBeEnabled();
  });

  it('opens over Today, reports an unavailable provider, and restores opener focus', async () => {
    const submitText = vi.fn();
    render(
      <FarmerNavigation
        currentRoute="/farmer/today"
        locale="en"
        submitText={submitText}
        transportConfigured={false}
      />,
    );

    const opener = screen.getByRole('button', { name: 'Speak' });
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Kisan Saathi' });
    expect(dialog).toHaveAttribute('data-origin-route', '/farmer/today');
    expect(dialog).toHaveTextContent('Current screen: Today');
    expect(screen.getByText(/Voice unavailable for this action/iu)).toBeInTheDocument();
    expect(screen.getByText(/voice provider is not configured/iu)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close Speak' })).toHaveFocus();

    fireEvent.change(screen.getByLabelText('Type your question'), {
      target: { value: 'Which crop should I choose?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send text' }));
    expect(submitText).not.toHaveBeenCalled();
    expect(screen.queryByText(/recommended crop|yield|answer:/iu)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Speak' }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the configured text transport only for bounded help and closes with Escape', async () => {
    const submitText = vi.fn().mockResolvedValue({ kind: 'help' });
    render(
      <FarmerNavigation
        currentRoute="/farmer/today"
        locale="hi"
        submitText={submitText}
        transportConfigured
      />,
    );

    const opener = screen.getByRole('button', { name: 'बोलें' });
    fireEvent.click(opener);
    fireEvent.change(screen.getByLabelText('अपना प्रश्न लिखें'), {
      target: { value: '  मदद  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'टेक्स्ट भेजें' }));

    await waitFor(() => expect(submitText).toHaveBeenCalledWith('मदद', expect.any(AbortSignal)));
    expect(await screen.findByText(/मदद नीचे दिखाई गई है/iu)).toBeInTheDocument();
    expect(screen.getByText(/खेत के उत्तर और कार्रवाइयाँ/iu)).toBeInTheDocument();
    expect(screen.queryByText(/सिफ़ारिश|फसल परिणाम/iu)).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('does not send or queue text while offline', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    const submitText = vi.fn();
    render(
      <FarmerNavigation
        currentRoute="/farmer/today"
        locale="mr"
        submitText={submitText}
        transportConfigured
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'बोला' }));
    expect(screen.getByText(/पाठवला किंवा रांगेत ठेवला जाणार नाही/iu)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('तुमचा प्रश्न लिहा'), {
      target: { value: 'आज काय करू?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'मजकूर पाठवा' }));
    expect(submitText).not.toHaveBeenCalled();
  });

  it('recovers to an honest unavailable state when the transport rejects', async () => {
    const submitText = vi.fn().mockRejectedValue(new Error('provider down'));
    render(
      <FarmerNavigation
        currentRoute="/farmer/today"
        locale="en"
        submitText={submitText}
        transportConfigured
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    fireEvent.change(screen.getByLabelText('Type your question'), {
      target: { value: 'Help me' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send text' }));

    expect(await screen.findByText(/provider is not configured or could not be reached/iu)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send text' })).toBeEnabled();
  });
});
