import { render, screen } from '@testing-library/react';

import MpFoundationPage from './page';

describe('MP Office foundation shell', () => {
  it('shows only the privacy-release foundation', () => {
    render(<MpFoundationPage />);

    expect(screen.getByRole('heading', { name: 'MP Office foundation' })).toBeInTheDocument();
    expect(screen.getByText('Released aggregates only')).toBeInTheDocument();
    expect(screen.getByText(/no invented maps/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View readiness response' })).toHaveAttribute(
      'href',
      '/api/health/ready',
    );
  });
});
