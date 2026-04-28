import { describe, expect, it } from 'vitest';

import { reducePracujHtml } from './pracuj-pl-sync';

describe('pracuj-pl-sync reducePracujHtml', () => {
  it('prioritizes embedded Pracuj snapshot details for job offer and company extraction', () => {
    const snapshot = {
      url: 'https://www.pracuj.pl/praca/senior-node-developer-warszawa,oferta,1001',
      title: 'Senior Node Developer',
      canonical: 'https://www.pracuj.pl/praca/senior-node-developer-warszawa,oferta,1001',
      metaDescription: 'Praca Senior Node Developer w Acme Tech.',
      headings: ['Senior Node Developer', 'O firmie', 'Zakres obowiązków'],
      facts: [
        { label: 'Wynagrodzenie', value: '20 000 - 26 000 PLN netto + VAT / mies.' },
        { label: 'Tryb pracy', value: 'Praca hybrydowa' },
        { label: 'Lokalizacja', value: 'Warszawa, Mazowieckie' },
      ],
      sections: [
        { heading: 'O firmie', text: 'Acme Tech buduje produkty fintech dla klientów B2B.' },
        { heading: 'Zakres obowiązków', text: 'Budowa API Node.js i prowadzenie integracji.' },
      ],
      applyUrls: ['https://system.erecruiter.pl/FormTemplates/RecruitmentForm.aspx?WebID=abc'],
      companyLinks: ['https://acme.example/about'],
      jsonLd: ['{"@type":"JobPosting","hiringOrganization":{"name":"Acme Tech"}}'],
      dataScripts: ['{"offer":{"title":"Senior Node Developer","company":{"name":"Acme Tech"}}}'],
      plainText: 'Senior Node Developer Acme Tech Warszawa praca hybrydowa',
      cookieDismissed: 1,
    };

    const html = `
      <html>
        <body>
          <main>
            <h1>Senior Node Developer</h1>
            <p>Oferta pracy</p>
          </main>
          <script type="application/job-board+json" id="__CODEX_JOB_BOARD_SNAPSHOT__">${JSON.stringify(snapshot)}</script>
        </body>
      </html>
    `;

    const reduced = reducePracujHtml(html);

    expect(reduced).toContain('[job_board_snapshot');
    expect(reduced).toContain('title: Senior Node Developer');
    expect(reduced).toContain('facts:');
    expect(reduced).toContain('- Wynagrodzenie: 20 000 - 26 000 PLN netto + VAT / mies.');
    expect(reduced).toContain('company_links:');
    expect(reduced).toContain('- https://acme.example/about');
    expect(reduced).toContain('sections:');
    expect(reduced).toContain('section_1_heading: O firmie');
    expect(reduced).toContain('Acme Tech buduje produkty fintech');
    expect(reduced).toContain('[page_text]');
  });

  it('falls back to dense readable page text when no snapshot is embedded', () => {
    const html = `
      <html>
        <head>
          <style>.hidden { display:none; }</style>
          <script>console.log('ignore');</script>
        </head>
        <body>
          <main>
            <h1>Backend Engineer</h1>
            <section>
              <h2>O firmie</h2>
              <p>Acme Labs rozwija platformę danych.</p>
            </section>
          </main>
        </body>
      </html>
    `;

    const reduced = reducePracujHtml(html);

    expect(reduced).not.toContain('console.log');
    expect(reduced).toContain('[page_text]');
    expect(reduced).toContain('Backend Engineer');
    expect(reduced).toContain('Acme Labs rozwija platformę danych.');
  });
});
