import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { FarmerSetupScreen } from './farmer-setup-screen';

describe('Farmer setup screen', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('supports the GPS-denied, hardware-skipped two-plot acceptance path', () => {
    render(<FarmerSetupScreen kind="review" />);

    expect(screen.getByText(/GPS नाकारले/)).toBeInTheDocument();
    expect(screen.getByText(/SKIPPED/)).toBeInTheDocument();
    expect(screen.getByText('प्लॉट १')).toBeInTheDocument();
    expect(screen.getByText('प्लॉट २')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'या फोनवर सेव्ह' }));
    expect(screen.getByText(/या फोनवर एन्क्रिप्टेड/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ऑफलाइन व्यत्यय' }));
    expect(screen.getByText('इंटरनेटची वाट पाहत आहे')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'इंटरनेट आल्यानंतर Sync' }));
    expect(screen.getByText('समक्रमित')).toBeInTheDocument();
  });

  it('requires confirmation before applying a voice proposal and supports cancellation', () => {
    render(<FarmerSetupScreen kind="review" />);

    fireEvent.click(screen.getByRole('button', { name: 'आवाज प्रस्ताव' }));
    expect(screen.getByText(/नागली प्लॉट/)).toBeInTheDocument();
    expect(screen.getByText('प्लॉट २')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'रद्द करा' }));
    expect(screen.queryByText(/आवाज प्रस्ताव:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'आवाज प्रस्ताव' }));
    fireEvent.click(screen.getByRole('button', { name: 'स्पष्ट पुष्टी' }));
    expect(screen.getAllByText('नागली प्लॉट').length).toBeGreaterThan(0);
  });

  it('locks local recovery on account switch when setup has unsynced private work', () => {
    render(<FarmerSetupScreen kind="sync" />);
    fireEvent.click(screen.getByRole('button', { name: 'खाते बदल चाचणी' }));
    expect(screen.getByText('लॉक केलेली पुनर्प्राप्ती')).toBeInTheDocument();
  });
});
