import { render, screen } from '@testing-library/react';

import RskFoundationPage from './page';

describe('RSK foundation shell', () => {
  it('states the RSK boundary without fake operational data', () => {
    render(<RskFoundationPage />);

    expect(screen.getByRole('heading', { name: 'RSK operations foundation' })).toBeInTheDocument();
    expect(screen.getByText('No farmer records loaded')).toBeInTheDocument();
    expect(screen.getByText(/no invented work items/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open readiness response' })).toHaveAttribute(
      'href',
      '/api/health/ready',
    );
  });
});
