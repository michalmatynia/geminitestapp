import type { FilemakerOrganization } from '../../types';

export type OrganizationInputFieldConfig = {
  field: keyof FilemakerOrganization;
  label: string;
  placeholder: string;
  ariaLabel: string;
  title: string;
  className?: string;
};

export const JOB_BOARD_COMPANY_INPUT_FIELDS: OrganizationInputFieldConfig[] = [
  {
    field: 'jobBoardCompanyWebsiteUrl',
    label: 'Job-board website',
    placeholder: 'https://example.com',
    ariaLabel: 'Job-board company website',
    title: 'Website extracted from job-board company data',
  },
  {
    field: 'jobBoardCompanyEmail',
    label: 'Job-board email',
    placeholder: 'contact@example.com',
    ariaLabel: 'Job-board company email',
    title: 'Email extracted from job-board company data',
  },
  {
    field: 'jobBoardCompanyPhone',
    label: 'Job-board phone',
    placeholder: '+48 ...',
    ariaLabel: 'Job-board company phone',
    title: 'Phone extracted from job-board company data',
  },
  {
    field: 'jobBoardCompanyIndustry',
    label: 'Job-board industry',
    placeholder: 'Industry / sector',
    ariaLabel: 'Job-board company industry',
    title: 'Industry extracted from job-board company data',
  },
  {
    field: 'jobBoardCompanySize',
    label: 'Job-board company size',
    placeholder: 'e.g. 201-500',
    ariaLabel: 'Job-board company size',
    title: 'Company size extracted from job-board company data',
  },
  {
    field: 'jobBoardCompanyLogoUrl',
    label: 'Job-board logo URL',
    placeholder: 'https://...',
    ariaLabel: 'Job-board company logo URL',
    title: 'Logo URL extracted from job-board company data',
  },
  {
    field: 'jobBoardCompanyAddress',
    label: 'Job-board raw address',
    placeholder: 'Raw company address from job board',
    ariaLabel: 'Job-board raw company address',
    title: 'Raw company address extracted from job-board data',
  },
  {
    field: 'jobBoardCompanyRegion',
    label: 'Job-board region',
    placeholder: 'Region / voivodeship',
    ariaLabel: 'Job-board company region',
    title: 'Region extracted from job-board company data',
  },
  {
    field: 'jobBoardCompanyProfileUrl',
    label: 'Job-board profile URL',
    placeholder: 'https://www.pracuj.pl/pracodawcy/...',
    ariaLabel: 'Job-board company profile URL',
    title: 'Job-board company profile URL',
    className: 'md:col-span-2',
  },
  {
    field: 'jobBoardCompanyProfileScrapedAt',
    label: 'Job-board profile scraped at',
    placeholder: '2026-04-29T12:00:00.000Z',
    ariaLabel: 'Job-board company profile scraped at',
    title: 'When the job-board company profile was last scraped',
  },
  {
    field: 'jobBoardSourceSite',
    label: 'Scrape source portal',
    placeholder: 'pracuj.pl',
    ariaLabel: 'Job-board scrape source portal',
    title: 'Portal where this organisation was scraped from',
  },
  {
    field: 'jobBoardSourceLabel',
    label: 'Scrape source label',
    placeholder: 'Pracuj.pl',
    ariaLabel: 'Job-board scrape source label',
    title: 'Human-readable scrape source label',
  },
  {
    field: 'jobBoardSourceUrl',
    label: 'Scrape source URL',
    placeholder: 'https://...',
    ariaLabel: 'Job-board scrape source URL',
    title: 'Original job-board URL used to create or update this organisation',
    className: 'md:col-span-2',
  },
  {
    field: 'jobBoardScrapedAt',
    label: 'Organisation scraped at',
    placeholder: '2026-04-29T12:00:00.000Z',
    ariaLabel: 'Organisation scraped at',
    title: 'When this organisation was last updated by job-board scraping',
  },
];
