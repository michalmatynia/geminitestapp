import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationWebsitesSection } from './OrganizationWebsitesSection';

const mocks = vi.hoisted(() => ({
  handleWebsiteSocialScrape: vi.fn(),
  isWebsiteSocialScrapeRunning: false,
  linkedWebsites: [] as unknown[],
}));

vi.mock('../../context/AdminFilemakerOrganizationEditPageContext', () => ({
  useAdminFilemakerOrganizationEditPageActionsContext: () => ({
    handleWebsiteSocialScrape: mocks.handleWebsiteSocialScrape,
  }),
  useAdminFilemakerOrganizationEditPageStateContext: () => ({
    isWebsiteSocialScrapeRunning: mocks.isWebsiteSocialScrapeRunning,
    linkedWebsites: mocks.linkedWebsites,
  }),
}));

describe('OrganizationWebsitesSection', () => {
  beforeEach(() => {
    mocks.handleWebsiteSocialScrape.mockReset();
    mocks.isWebsiteSocialScrapeRunning = false;
    mocks.linkedWebsites = [];
  });

  it('launches website and social discovery from the section action', () => {
    render(<OrganizationWebsitesSection />);

    fireEvent.click(screen.getByRole('button', { name: /discover/i }));

    expect(mocks.handleWebsiteSocialScrape).toHaveBeenCalledTimes(1);
  });

  it('disables discovery while a scrape is running', () => {
    mocks.isWebsiteSocialScrapeRunning = true;

    render(<OrganizationWebsitesSection />);

    expect(screen.getByRole('button', { name: /discover/i })).toBeDisabled();
  });
});
