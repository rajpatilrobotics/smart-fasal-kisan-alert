import { render, screen } from '@testing-library/react';

import FarmerFoundationPage from './page';

describe('Farmer foundation shell', () => {
  it('explains the honest Milestone 0 state in Marathi', () => {
    render(<FarmerFoundationPage />);

    expect(
      screen.getByRole('heading', { name: 'शेतकरी अ‍ॅपची मजबूत पायाभरणी तयार आहे' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/बनावट सल्ला/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'अ‍ॅपची तयारी तपासा' })).toHaveAttribute(
      'href',
      '/api/health/ready',
    );
  });
});
