import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';
import { read, utils as xlsxUtils } from 'xlsx';

import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const DEFAULT_BATCH_SIZE = 1_000;
const INVOICES_COLLECTION = 'filemaker_invoices';
const INVOICE_ORGANIZATION_LINKS_COLLECTION = 'filemaker_organization_invoice_links';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const DEFAULT_INPUT_PATH = 'csv/b/x/invoiceBook.xlsx';
const DEFAULT_JOIN_INPUT_PATH = 'csv/b/x/nameOrganisationInvoiceJOIN.xlsx';
const IMPORT_SOURCE_KIND = 'filemaker.invoice';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string;
  joinInputPath: string | null;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type ParsedInvoice = {
  rowIndex: number;
  cIssueYear?: string;
  cPaymentDue?: string;
  dayForPayment?: string;
  eventDate?: string;
  hidePersonBuyer?: string;
  invoiceNo?: string;
  isPaid?: string;
  issueDate?: string;
  orgFilter?: string;
  paidSoFar?: string;
  paymentType?: string;
  signature?: string;
  stationaryUuid?: string;
  filesPathListComment?: string;
  filesPathListDateEntered?: string;
  filesPathListName?: string;
  filesPathListUuid?: string;
  organizationBUuid?: string;
  organizationSUuid?: string;
  organizationBName?: string;
  organizationSName?: string;
  servicesAmount?: string;
  servicesSum?: string;
  servicesCurrency?: string;
  servicesServiceNameUuid?: string;
  servicesServiceType?: string;
  servicesTaxComment?: string;
  servicesVatUuid?: string;
  issueDateAt?: string;
};

type ParsedInvoiceJoin = {
  creationAccountName?: string;
  creationHostTimestamp?: string;
  creationTimestamp?: string;
  invoiceBookUuidFk?: string;
  modificationAccountName?: string;
  modificationHostTimestamp?: string;
  modificationTimestamp?: string;
  legacyJoinUuid?: string;
  legacyOrganizationUuid?: string;
  legacyRelationUuid?: string;
  invoiceBookIssueYear?: string;
  invoiceBookLeftForPayment?: string;
  invoiceBookPaymentDue?: string;
  invoiceBookCreationTimestamp?: string;
  invoiceBookDayForPayment?: string;
  invoiceBookEventDate?: string;
  invoiceBookInvoiceNo?: string;
  invoiceBookIsPaid?: string;
  invoiceBookIssueDate?: string;
  invoiceBookOrgFilter?: string;
  invoiceBookPaidSoFar?: string;
  invoiceBookPaymentType?: string;
  invoiceBookSignature?: string;
  invoiceBookStationaryUuid?: string;
  invoiceBookUuid?: string;
};

type ParsedInvoiceRowCollection = {
  duplicateLegacyIdentityCount: number;
  invoices: ParsedInvoice[];
  skippedRowCount: number;
};

type ParsedInvoiceJoinCollection = {
  duplicateLegacyJoinUuidCount: number;
  joins: ParsedInvoiceJoin[];
  skippedRowCount: number;
};

type OrganizationLookupRecord = {
  id: string;
  name?: string;
};

type FilemakerInvoiceDocument = Document & {
  _id: string;
  cIssueYear?: string;
  cPaymentDue?: string;
  dayForPayment?: string;
  eventDate?: string;
  filesPathListComment?: string;
  filesPathListDateEntered?: string;
  filesPathListName?: string;
  filesPathListUuid?: string;
  hidePersonBuyer?: string;
  id: string;
  idSeed: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  invoiceNo?: string;
  issueDate?: string;
  isPaid?: string;
  legacyIdentityKey: string;
  organizationBUuid?: string;
  organizationBName?: string;
  organizationSUuid?: string;
  organizationSName?: string;
  orgFilter?: string;
  paidSoFar?: string;
  paymentType?: string;
  schemaVersion: 1;
  servicesAmount?: string;
  servicesCurrency?: string;
  servicesServiceNameUuid?: string;
  servicesServiceType?: string;
  servicesSum?: string;
  servicesTaxComment?: string;
  servicesVatUuid?: string;
  signature?: string;
  stationaryUuid?: string;
};

type FilemakerInvoiceOrganizationLinkDocument = Document & {
  _id: string;
  creationAccountName?: string;
  creationTimestamp?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  invoiceId?: string;
  invoiceLegacyIdentityKey?: string;
  legacyJoinUuid?: string;
  legacyInvoiceBookUuidFk?: string;
  legacyOrganizationUuid?: string;
  legacyRelationUuid?: string;
  organizationId?: string;
  organizationName?: string;
  resolvedBy?: 'files-uuid' | 'org-year-no' | 'signature-matched' | 'fallback';
  resolutionCandidateCount?: number;
  resolutionScore?: number;
  schemaVersion: 1;
};

type WriteResultSummary = {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

type InvoiceResolution = {
  candidateCount: number;
  invoice?: FilemakerInvoiceDocument;
  resolution: FilemakerInvoiceOrganizationLinkDocument['resolvedBy'] | undefined;
  score: number;
  unresolved: boolean;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-invoices-to-mongo.ts --input=csv/b/x/invoiceBook.xlsx --join-input=csv/b/x/nameOrganisationInvoiceJOIN.xlsx --write',
      '',
      'Imports FileMaker invoiceBook and invoice-organisation join XLSX/CSV/TSV exports into local Mongo.',
      'Invoices are stored in filemaker_invoices, joins in filemaker_organization_invoice_links.',
      'Resolves invoices using InvoiceBook_UUID_FK when possible, then organization+year+invoiceNo, then fallback field matching.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild the invoice collections.',
      'Pass --source=local or --source=cloud to override the active Mongo source.',
    ].join('\n')
  );
};

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    batchSize: DEFAULT_BATCH_SIZE,
    dryRun: true,
    inputPath: DEFAULT_INPUT_PATH,
    joinInputPath: null,
    replaceCollections: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollections = true;
    if (arg.startsWith('--input=')) {
      options.inputPath = arg.slice('--input='.length).trim() || DEFAULT_INPUT_PATH;
    }
    if (arg.startsWith('--join-input=')) {
      options.joinInputPath = arg.slice('--join-input='.length).trim() || null;
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
    if (!arg.startsWith('--') && arg.includes('.')) {
      options.inputPath = arg.trim() || options.inputPath;
    }
  });

  if (options.joinInputPath === null) options.joinInputPath = DEFAULT_JOIN_INPUT_PATH;

  return options;
};

const createModernId = (kind: 'invoice' | 'invoice-organization-link', key: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.${kind}:${key}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-${kind}-${digest}`;
};

const normalizeCell = (value: unknown): string => {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'undefined' || value === null) return '';
  return String(value).replace(/\r/g, '').trim();
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeCell(value);
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeLegacyUuid = (value: unknown): string => optionalString(value)?.toUpperCase() ?? '';

const isWorkbookInputPath = (inputPath: string): boolean =>
  ['.xlsx', '.xls'].includes(extname(inputPath).toLowerCase());

const parseRows = (buffer: Buffer, inputPath: string): string[][] => {
  if (isWorkbookInputPath(inputPath)) {
    const workbook = read(buffer);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
      header: 1,
      raw: false,
    }).map((row: unknown[]): string[] =>
      row.map((cell: unknown) => normalizeCell(cell))
    );
  }

  const text = buffer.toString('utf8');
  return text
    .split('\n')
    .map((line: string): string[] => normalizeCell(line.replace(/\u0000/g, '')).split('\t'));
};

const buildHeaderMap = (headerRow: string[]): Map<string, number> =>
  new Map(headerRow.map((header, index) => [header.trim(), index]));

const parseInvoiceRows = async (inputPath: string): Promise<ParsedInvoice[]> => {
  const rows = parseRows(await readFile(inputPath), inputPath);
  if (rows.length === 0) return [];

  const header = buildHeaderMap(rows[0] ?? []);
  const idx = {
    cIssueYear: header.get('c_IssueYear'),
    cPaymentDue: header.get('c_paymentDue'),
    dayForPayment: header.get('DayForPayment'),
    eventDate: header.get('EventDate'),
    hidePersonBuyer: header.get('HidePersonBuyer'),
    invoiceNo: header.get('InvoiceNo'),
    isPaid: header.get('IsPaid'),
    issueDate: header.get('IssueDate'),
    orgFilter: header.get('org_FILTER'),
    paidSoFar: header.get('PaidSoFar'),
    paymentType: header.get('PaymentType'),
    signature: header.get('Signature'),
    stationaryUuid: header.get('Stationary_Lg_UUID_FK'),
    filesComment: header.get('FILES_PathList_Inv::Comment'),
    filesDateEntered: header.get('FILES_PathList_Inv::Date Entered'),
    filesName: header.get('FILES_PathList_Inv::Name'),
    filesUuid: header.get('FILES_PathList_Inv::UUID'),
    organizationBUuid: header.get('NameOrganisation_Display_Ice_B::UUID'),
    organizationBName: header.get('NameOrganisation_Display_Ice_B::Name'),
    organizationSUuid: header.get('NameOrganisation_Display_Ice_S::UUID'),
    organizationSName: header.get('NameOrganisation_Display_Ice_S::Name'),
    servicesAmount: header.get('ServicesDisplay Ice::Amount'),
    servicesSum: header.get('ServicesDisplay Ice::c_Sum'),
    servicesCurrency: header.get('ServicesDisplay Ice::Currency'),
    servicesServiceNameUuid: header.get('ServicesDisplay Ice::ServiceName_UUID_FK'),
    servicesServiceType: header.get('ServicesDisplay Ice::ServiceType'),
    servicesTaxComment: header.get('ServicesDisplay Ice::Tax_Comment'),
    servicesVatUuid: header.get('ServicesDisplay Ice::VAT_UUID_FK'),
  };

  const parseInvoiceField = (row: string[], index: number | undefined): string | undefined =>
    index === undefined ? undefined : optionalString(row[index]);

  return rows
    .slice(1)
    .map((row: string[], rowIndex: number): ParsedInvoice | null => {
      const invoice: ParsedInvoice = {
        rowIndex,
        cIssueYear: parseInvoiceField(row, idx.cIssueYear),
        cPaymentDue: parseInvoiceField(row, idx.cPaymentDue),
        dayForPayment: parseInvoiceField(row, idx.dayForPayment),
        eventDate: parseInvoiceField(row, idx.eventDate),
        hidePersonBuyer: parseInvoiceField(row, idx.hidePersonBuyer),
        invoiceNo: parseInvoiceField(row, idx.invoiceNo),
        isPaid: parseInvoiceField(row, idx.isPaid),
        issueDate: parseInvoiceField(row, idx.issueDate),
        orgFilter: parseInvoiceField(row, idx.orgFilter),
        paidSoFar: parseInvoiceField(row, idx.paidSoFar),
        paymentType: parseInvoiceField(row, idx.paymentType),
        signature: parseInvoiceField(row, idx.signature),
        stationaryUuid: parseInvoiceField(row, idx.stationaryUuid),
        filesPathListComment: parseInvoiceField(row, idx.filesComment),
        filesPathListDateEntered: parseInvoiceField(row, idx.filesDateEntered),
        filesPathListName: parseInvoiceField(row, idx.filesName),
        filesPathListUuid: parseInvoiceField(row, idx.filesUuid),
        organizationBUuid: normalizeLegacyUuid(parseInvoiceField(row, idx.organizationBUuid)),
        organizationBName: parseInvoiceField(row, idx.organizationBName),
        organizationSUuid: normalizeLegacyUuid(parseInvoiceField(row, idx.organizationSUuid)),
        organizationSName: parseInvoiceField(row, idx.organizationSName),
        servicesAmount: parseInvoiceField(row, idx.servicesAmount),
        servicesSum: parseInvoiceField(row, idx.servicesSum),
        servicesCurrency: parseInvoiceField(row, idx.servicesCurrency),
        servicesServiceNameUuid: parseInvoiceField(row, idx.servicesServiceNameUuid),
        servicesServiceType: parseInvoiceField(row, idx.servicesServiceType),
        servicesTaxComment: parseInvoiceField(row, idx.servicesTaxComment),
        servicesVatUuid: parseInvoiceField(row, idx.servicesVatUuid),
      };

      const hasData = Object.values(invoice).some((value: unknown): value is string => {
        if (typeof value !== 'string') return false;
        return value.trim().length > 0;
      });
      if (!hasData) return null;

      return invoice;
    })
    .filter((invoice: ParsedInvoice | null): invoice is ParsedInvoice => invoice !== null);
};

const parseJoinRows = async (inputPath: string): Promise<ParsedInvoiceJoin[]> => {
  const rows = parseRows(await readFile(inputPath), inputPath);
  if (rows.length === 0) return [];

  const header = buildHeaderMap(rows[0] ?? []);
  const idx = {
    creationAccountName: header.get('creationAccountName'),
    creationHostTimestamp: header.get('creationHostTimestamp'),
    creationTimestamp: header.get('creationTimestamp'),
    invoiceBookUuidFk: header.get('InvoiceBook_UUID_FK'),
    modificationAccountName: header.get('modificationAccountName'),
    modificationHostTimestamp: header.get('modificationHostTimestamp'),
    modificationTimestamp: header.get('modificationTimestamp'),
    legacyJoinUuid: header.get('UUID'),
    legacyOrganizationUuid: header.get('NameOrganisation_UUID_FK'),
    legacyRelationUuid: header.get('Relation_UUID_FK'),
    invoiceBookIssueYear: header.get('InvoiceBook::c_IssueYear'),
    invoiceBookLeftForPayment: header.get('InvoiceBook::c_LeftForPayment'),
    invoiceBookPaymentDue: header.get('InvoiceBook::c_paymentDue'),
    invoiceBookDayForPayment: header.get('InvoiceBook::DayForPayment'),
    invoiceBookEventDate: header.get('InvoiceBook::EventDate'),
    invoiceBookInvoiceNo: header.get('InvoiceBook::InvoiceNo'),
    invoiceBookIsPaid: header.get('InvoiceBook::IsPaid'),
    invoiceBookIssueDate: header.get('InvoiceBook::IssueDate'),
    invoiceBookOrgFilter: header.get('InvoiceBook::org_FILTER'),
    invoiceBookPaidSoFar: header.get('InvoiceBook::PaidSoFar'),
    invoiceBookPaymentType: header.get('InvoiceBook::PaymentType'),
    invoiceBookSignature: header.get('InvoiceBook::Signature'),
    invoiceBookStationaryUuid: header.get('InvoiceBook::Stationary_Lg_UUID_FK'),
    invoiceBookUuid: header.get('InvoiceBook::UUID'),
  };

  const parseJoinField = (row: string[], index: number | undefined): string | undefined =>
    index === undefined ? undefined : optionalString(row[index]);

  return rows
    .slice(1)
    .map((row: string[]): ParsedInvoiceJoin | null => {
      const join: ParsedInvoiceJoin = {
        creationAccountName: parseJoinField(row, idx.creationAccountName),
        creationHostTimestamp: parseJoinField(row, idx.creationHostTimestamp),
        creationTimestamp: parseJoinField(row, idx.creationTimestamp),
        invoiceBookUuidFk: normalizeLegacyUuid(parseJoinField(row, idx.invoiceBookUuidFk)),
        modificationAccountName: parseJoinField(row, idx.modificationAccountName),
        modificationHostTimestamp: parseJoinField(row, idx.modificationHostTimestamp),
        modificationTimestamp: parseJoinField(row, idx.modificationTimestamp),
        legacyJoinUuid: normalizeLegacyUuid(parseJoinField(row, idx.legacyJoinUuid)),
        legacyOrganizationUuid: normalizeLegacyUuid(parseJoinField(row, idx.legacyOrganizationUuid)),
        legacyRelationUuid: normalizeLegacyUuid(parseJoinField(row, idx.legacyRelationUuid)),
        invoiceBookIssueYear: parseJoinField(row, idx.invoiceBookIssueYear),
        invoiceBookLeftForPayment: parseJoinField(row, idx.invoiceBookLeftForPayment),
        invoiceBookPaymentDue: parseJoinField(row, idx.invoiceBookPaymentDue),
        invoiceBookDayForPayment: parseJoinField(row, idx.invoiceBookDayForPayment),
        invoiceBookEventDate: parseJoinField(row, idx.invoiceBookEventDate),
        invoiceBookInvoiceNo: parseJoinField(row, idx.invoiceBookInvoiceNo),
        invoiceBookIsPaid: parseJoinField(row, idx.invoiceBookIsPaid),
        invoiceBookIssueDate: parseJoinField(row, idx.invoiceBookIssueDate),
        invoiceBookOrgFilter: parseJoinField(row, idx.invoiceBookOrgFilter),
        invoiceBookPaidSoFar: parseJoinField(row, idx.invoiceBookPaidSoFar),
        invoiceBookPaymentType: parseJoinField(row, idx.invoiceBookPaymentType),
        invoiceBookSignature: parseJoinField(row, idx.invoiceBookSignature),
        invoiceBookStationaryUuid: parseJoinField(row, idx.invoiceBookStationaryUuid),
        invoiceBookUuid: parseJoinField(row, idx.invoiceBookUuid),
      };

      const hasData = Object.values(join).some((value: unknown): value is string => {
        if (typeof value !== 'string') return false;
        return value.trim().length > 0;
      });

      if (!hasData) return null;
      return join;
    })
    .filter((join: ParsedInvoiceJoin | null): join is ParsedInvoiceJoin => join !== null);
};

const collectInvoices = (rows: ParsedInvoice[]): ParsedInvoiceRowCollection => {
  const seenIdentity = new Map<string, number>();
  let duplicateLegacyIdentityCount = 0;
  let skippedRowCount = 0;

  const invoices: ParsedInvoice[] = [];
  rows.forEach((row: ParsedInvoice): void => {
    if (typeof row === 'undefined') {
      skippedRowCount += 1;
      return;
    }
    const key = [
      row.organizationBUuid ?? '',
      row.organizationSUuid ?? '',
      row.cIssueYear ?? '',
      row.invoiceNo ?? '',
      row.filesPathListUuid ?? '',
      row.orgFilter ?? '',
      row.signature ?? '',
    ].join('|');

    if (seenIdentity.has(key)) duplicateLegacyIdentityCount += 1;
    seenIdentity.set(key, (seenIdentity.get(key) ?? 0) + 1);
    invoices.push(row);
  });

  return { duplicateLegacyIdentityCount, invoices, skippedRowCount };
};

const collectJoins = (rows: ParsedInvoiceJoin[]): ParsedInvoiceJoinCollection => {
  const joins: ParsedInvoiceJoin[] = [];
  const seen = new Set<string>();
  let duplicateLegacyJoinUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((join: ParsedInvoiceJoin): void => {
    if (!join.legacyJoinUuid || !join.legacyOrganizationUuid || !join.invoiceBookUuidFk) {
      skippedRowCount += 1;
      return;
    }
    if (seen.has(join.legacyJoinUuid)) duplicateLegacyJoinUuidCount += 1;
    seen.add(join.legacyJoinUuid);
    joins.push(join);
  });

  return { duplicateLegacyJoinUuidCount, joins, skippedRowCount };
};

const buildOrganizationLookup = async (db: Db): Promise<Map<string, OrganizationLookupRecord>> => {
  const documents = await db
    .collection<Document>(ORGANIZATIONS_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { _id: 0, id: 1, legacyUuid: 1, name: 1 } }
    )
    .toArray();

  return new Map(
    documents
      .map((document: Document): [string, OrganizationLookupRecord] | null => {
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        const legacyUuid = typeof document['legacyUuid'] === 'string' ? document['legacyUuid'].toUpperCase() : '';
        if (!id || !legacyUuid) return null;
        const name = typeof document['name'] === 'string' ? document['name'] : undefined;
        return [legacyUuid, { id, ...(name ? { name } : {}) }];
      })
      .filter((entry): entry is [string, OrganizationLookupRecord] => entry !== null)
  );
};

const buildInvoiceDocuments = (input: {
  invoices: ParsedInvoice[];
  importedAt: Date;
  importBatchId: string;
}): FilemakerInvoiceDocument[] =>
  input.invoices.map((invoice: ParsedInvoice): FilemakerInvoiceDocument => {
    const legacyIdentityKeyParts = [
      invoice.organizationBUuid ?? '',
      invoice.organizationSUuid ?? '',
      invoice.cIssueYear ?? '',
      invoice.invoiceNo ?? '',
      invoice.filesPathListUuid ?? '',
      invoice.orgFilter ?? '',
      invoice.signature ?? '',
      invoice.rowIndex.toString(),
    ];
    const legacyIdentityKey = legacyIdentityKeyParts.join('|').replace(/^(\||)+/, '');
    const id = createModernId('invoice', legacyIdentityKey);

    return {
      _id: id,
      ...(invoice.cIssueYear ? { cIssueYear: invoice.cIssueYear } : {}),
      ...(invoice.cPaymentDue ? { cPaymentDue: invoice.cPaymentDue } : {}),
      ...(invoice.dayForPayment ? { dayForPayment: invoice.dayForPayment } : {}),
      ...(invoice.eventDate ? { eventDate: invoice.eventDate } : {}),
      ...(invoice.filesPathListComment
        ? { filesPathListComment: invoice.filesPathListComment }
        : {}),
      ...(invoice.filesPathListDateEntered
        ? { filesPathListDateEntered: invoice.filesPathListDateEntered }
        : {}),
      ...(invoice.filesPathListName ? { filesPathListName: invoice.filesPathListName } : {}),
      ...(invoice.filesPathListUuid ? { filesPathListUuid: invoice.filesPathListUuid } : {}),
      ...(invoice.hidePersonBuyer ? { hidePersonBuyer: invoice.hidePersonBuyer } : {}),
      id,
      idSeed: invoice.rowIndex.toString(),
      importBatchId: input.importBatchId,
      importedAt: input.importedAt,
      importSourceKind: IMPORT_SOURCE_KIND,
      ...(invoice.invoiceNo ? { invoiceNo: invoice.invoiceNo } : {}),
      ...(invoice.issueDate ? { issueDate: invoice.issueDate } : {}),
      ...(invoice.isPaid ? { isPaid: invoice.isPaid } : {}),
      legacyIdentityKey,
      ...(invoice.organizationBUuid ? { organizationBUuid: invoice.organizationBUuid } : {}),
      ...(invoice.organizationBName ? { organizationBName: invoice.organizationBName } : {}),
      ...(invoice.organizationSUuid ? { organizationSUuid: invoice.organizationSUuid } : {}),
      ...(invoice.organizationSName ? { organizationSName: invoice.organizationSName } : {}),
      ...(invoice.orgFilter ? { orgFilter: invoice.orgFilter } : {}),
      ...(invoice.paidSoFar ? { paidSoFar: invoice.paidSoFar } : {}),
      ...(invoice.paymentType ? { paymentType: invoice.paymentType } : {}),
      schemaVersion: 1,
      ...(invoice.servicesAmount ? { servicesAmount: invoice.servicesAmount } : {}),
      ...(invoice.servicesCurrency ? { servicesCurrency: invoice.servicesCurrency } : {}),
      ...(invoice.servicesServiceNameUuid ? { servicesServiceNameUuid: invoice.servicesServiceNameUuid } : {}),
      ...(invoice.servicesServiceType ? { servicesServiceType: invoice.servicesServiceType } : {}),
      ...(invoice.servicesSum ? { servicesSum: invoice.servicesSum } : {}),
      ...(invoice.servicesTaxComment ? { servicesTaxComment: invoice.servicesTaxComment } : {}),
      ...(invoice.servicesVatUuid ? { servicesVatUuid: invoice.servicesVatUuid } : {}),
      ...(invoice.signature ? { signature: invoice.signature } : {}),
      ...(invoice.stationaryUuid ? { stationaryUuid: invoice.stationaryUuid } : {}),
    };
  });

const buildInvoiceLookupByFilesUuid = (invoices: FilemakerInvoiceDocument[]): Map<string, FilemakerInvoiceDocument[]> => {
  const byFilesUuid = new Map<string, FilemakerInvoiceDocument[]>();
  for (const invoice of invoices) {
    if (invoice.filesPathListUuid && invoice.filesPathListUuid.length > 0) {
      const existing = byFilesUuid.get(invoice.filesPathListUuid) ?? [];
      existing.push(invoice);
      byFilesUuid.set(invoice.filesPathListUuid, existing);
    }
  }
  return byFilesUuid;
};

const buildInvoiceLookupByOrgYearNo = (invoices: FilemakerInvoiceDocument[]): Map<string, FilemakerInvoiceDocument[]> => {
  const byOrgYearNo = new Map<string, FilemakerInvoiceDocument[]>();
  for (const invoice of invoices) {
    const orgUuids = [
      invoice.organizationBUuid,
      invoice.organizationSUuid,
    ].filter((uuid: string | undefined): uuid is string => !!uuid && uuid.length > 0);

    if (!invoice.cIssueYear || !invoice.invoiceNo) continue;
    for (const orgUuid of orgUuids) {
      const key = `${orgUuid}|${invoice.cIssueYear}|${invoice.invoiceNo}`;
      const existing = byOrgYearNo.get(key) ?? [];
      existing.push(invoice);
      byOrgYearNo.set(key, existing);
    }
  }
  return byOrgYearNo;
};

const matchInvoiceForJoin = (
  join: ParsedInvoiceJoin,
  input: {
    invoiceByFilesUuid: Map<string, FilemakerInvoiceDocument[]>;
    invoiceByOrgYearNo: Map<string, FilemakerInvoiceDocument[]>;
    invoices: FilemakerInvoiceDocument[];
  }
): InvoiceResolution => {
  if (join.invoiceBookUuidFk) {
    const exact = input.invoiceByFilesUuid.get(join.invoiceBookUuidFk);
    if (exact && exact.length === 1) {
      return {
        candidateCount: 1,
        invoice: exact[0],
        resolution: 'files-uuid',
        score: 9999,
        unresolved: false,
      };
    }
  }

  if (join.legacyOrganizationUuid && join.invoiceBookIssueYear && join.invoiceBookInvoiceNo) {
    const candidatesByOrgYearNo = input.invoiceByOrgYearNo.get(
      `${join.legacyOrganizationUuid}|${join.invoiceBookIssueYear}|${join.invoiceBookInvoiceNo}`
    );
    if (candidatesByOrgYearNo?.length === 1) {
      return {
        candidateCount: 1,
        invoice: candidatesByOrgYearNo[0],
        resolution: 'org-year-no',
        score: 5000,
        unresolved: false,
      };
    }
    if ((candidatesByOrgYearNo?.length ?? 0) > 1) {
      return {
        candidateCount: candidatesByOrgYearNo.length,
        unresolved: true,
        score: 5000,
        resolution: undefined,
      };
    }
  }

  const scored = input.invoices
    .map((invoice: FilemakerInvoiceDocument): {
      invoice: FilemakerInvoiceDocument;
      score: number;
    } => {
      let score = 0;
      if (join.invoiceBookIssueYear && invoice.cIssueYear && invoice.cIssueYear === join.invoiceBookIssueYear) score += 1;
      if (join.invoiceBookPaymentDue && invoice.cPaymentDue && invoice.cPaymentDue === join.invoiceBookPaymentDue)
        score += 1;
      if (join.invoiceBookDayForPayment && invoice.dayForPayment && invoice.dayForPayment === join.invoiceBookDayForPayment)
        score += 1;
      if (join.invoiceBookEventDate && invoice.eventDate && invoice.eventDate === join.invoiceBookEventDate) score += 1;
      if (join.invoiceBookInvoiceNo && invoice.invoiceNo && invoice.invoiceNo === join.invoiceBookInvoiceNo) score += 1;
      if (join.invoiceBookIsPaid && invoice.isPaid && invoice.isPaid === join.invoiceBookIsPaid) score += 1;
      if (join.invoiceBookIssueDate && invoice.issueDate && invoice.issueDate === join.invoiceBookIssueDate)
        score += 1;
      if (join.invoiceBookPaidSoFar && invoice.paidSoFar && invoice.paidSoFar === join.invoiceBookPaidSoFar)
        score += 1;
      if (join.invoiceBookPaymentType && invoice.paymentType && invoice.paymentType === join.invoiceBookPaymentType)
        score += 1;
      if (join.invoiceBookOrgFilter && invoice.orgFilter && invoice.orgFilter === join.invoiceBookOrgFilter) score += 1;
      if (join.invoiceBookSignature && invoice.signature && invoice.signature === join.invoiceBookSignature) score += 1;
      if (join.invoiceBookStationaryUuid && invoice.stationaryUuid && invoice.stationaryUuid === join.invoiceBookStationaryUuid)
        score += 1;
      if (
        join.legacyOrganizationUuid &&
        (invoice.organizationBUuid === join.legacyOrganizationUuid || invoice.organizationSUuid === join.legacyOrganizationUuid)
      ) {
        score += 2;
      }
      return { invoice, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.invoice.id.localeCompare(right.invoice.id));

  if (scored.length === 0) {
    return {
      candidateCount: 0,
      score: 0,
      unresolved: true,
      resolution: undefined,
    };
  }

  const top = scored[0];
  const candidateCount = scored.filter((item) => item.score === top.score).length;
  if (candidateCount === 1) {
    return {
      candidateCount: 1,
      invoice: top.invoice,
      resolution: 'signature-matched',
      score: top.score,
      unresolved: false,
    };
  }

  return {
    candidateCount,
    score: top.score,
    unresolved: true,
    resolution: undefined,
  };
};

const isNamespaceNotFoundError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as { code?: unknown; codeName?: unknown };
  return maybeError.code === 26 || maybeError.codeName === 'NamespaceNotFound';
};

const dropCollectionIfExists = async (collection: Collection<Document>): Promise<boolean> => {
  try {
    await collection.drop();
    return true;
  } catch (error: unknown) {
    if (isNamespaceNotFoundError(error)) return false;
    throw error;
  }
};

const ensureIndexes = async (db: Db): Promise<void> => {
  await Promise.all([
    db.collection(INVOICES_COLLECTION).createIndex(
      { legacyIdentityKey: 1 },
      { name: 'filemaker_invoices_legacy_identity_key', unique: true }
    ),
    db.collection(INVOICE_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { legacyJoinUuid: 1 },
      { name: 'filemaker_organization_invoice_links_legacy_join_uuid_unique', unique: true }
    ),
    db.collection(INVOICE_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { invoiceId: 1 },
      { name: 'filemaker_organization_invoice_links_invoice_id' }
    ),
    db.collection(INVOICE_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { organizationId: 1 },
      { name: 'filemaker_organization_invoice_links_organization_id' }
    ),
  ]);
};

const toUpsertOperation = <TDocument extends Document>(document: TDocument & { _id: string; id: string }): AnyBulkWriteOperation<TDocument> => {
  const { _id, ...set } = document;
  return {
    updateOne: {
      filter: { id: document.id } as Document,
      update: { $set: set, $setOnInsert: { _id } },
      upsert: true,
    },
  };
};

const runBulkWrites = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: Array<TDocument & { _id: string; id: string }>,
  batchSize: number
): Promise<WriteResultSummary> => {
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    const result = await collection.bulkWrite(batch.map(toUpsertOperation), { ordered: false });
    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;
    upsertedCount += result.upsertedCount;
  }
  return { matchedCount, modifiedCount, upsertedCount };
};

const main = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const options = parseArgs(argv);
  if (!options.inputPath || !options.joinInputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedInvoiceRows = await parseInvoiceRows(options.inputPath);
  const parsedJoinRows = await parseJoinRows(options.joinInputPath);

  const collectedInvoices = collectInvoices(parsedInvoiceRows);
  const collectedJoins = collectJoins(parsedJoinRows);

  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const invoicesCollection = db.collection<FilemakerInvoiceDocument>(INVOICES_COLLECTION);
    const linksCollection = db.collection<FilemakerInvoiceOrganizationLinkDocument>(
      INVOICE_ORGANIZATION_LINKS_COLLECTION
    );

    if (!options.dryRun && options.replaceCollections) {
      await Promise.all([
        dropCollectionIfExists(invoicesCollection),
        dropCollectionIfExists(linksCollection),
      ]);
    }

    const invoiceDocuments = buildInvoiceDocuments({
      invoices: collectedInvoices.invoices,
      importedAt: new Date(),
      importBatchId: randomUUID(),
    });
    const organizationLookup = await buildOrganizationLookup(db);

    const invoiceByFilesUuid = buildInvoiceLookupByFilesUuid(invoiceDocuments);
    const invoiceByOrgYearNo = buildInvoiceLookupByOrgYearNo(invoiceDocuments);

    const importBatchId = invoiceDocuments[0]?.importBatchId ?? randomUUID();
    const importedAt = new Date();

    const resolvedLinkSummaries = collectedJoins.joins.map((join: ParsedInvoiceJoin) =>
      matchInvoiceForJoin(join, {
        invoiceByFilesUuid,
        invoiceByOrgYearNo,
        invoices: invoiceDocuments,
      })
    );

    const linkDocuments = collectedJoins.joins.map(
      (join: ParsedInvoiceJoin, index: number): FilemakerInvoiceOrganizationLinkDocument => {
        const resolution = resolvedLinkSummaries[index];
        const id = createModernId('invoice-organization-link', join.legacyJoinUuid ?? `${index}`);
        const organizationRecord = organizationLookup.get(join.legacyOrganizationUuid ?? '');

        return {
          _id: id,
          ...(join.creationAccountName ? { creationAccountName: join.creationAccountName } : {}),
          ...(join.creationTimestamp ? { creationTimestamp: join.creationTimestamp } : {}),
          id,
          importBatchId,
          importedAt,
          importSourceKind: IMPORT_SOURCE_KIND,
          ...(join.invoiceBookUuidFk ? { legacyInvoiceBookUuidFk: join.invoiceBookUuidFk } : {}),
          ...(join.legacyJoinUuid ? { legacyJoinUuid: join.legacyJoinUuid } : {}),
          ...(join.legacyOrganizationUuid ? { legacyOrganizationUuid: join.legacyOrganizationUuid } : {}),
          ...(join.legacyRelationUuid ? { legacyRelationUuid: join.legacyRelationUuid } : {}),
          ...(resolution.invoice ? { invoiceId: resolution.invoice.id } : {}),
          ...(resolution.invoice ? { invoiceLegacyIdentityKey: resolution.invoice.legacyIdentityKey } : {}),
          ...(join.legacyOrganizationUuid && organizationRecord ? { organizationId: organizationRecord.id } : {}),
          ...(organizationRecord?.name ? { organizationName: organizationRecord.name } : {}),
          ...(resolution.resolution ? { resolvedBy: resolution.resolution } : {}),
          ...(resolution.candidateCount > 0
            ? { resolutionCandidateCount: resolution.candidateCount }
            : {}),
          ...(resolution.score > 0 ? { resolutionScore: resolution.score } : {}),
          schemaVersion: 1,
        };
      }
    );

    const invoiceWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runBulkWrites(invoicesCollection, invoiceDocuments, options.batchSize);
    const linkWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runBulkWrites(linksCollection, linkDocuments, options.batchSize);

    if (!options.dryRun) await ensureIndexes(db);

    const totalResolved = resolvedLinkSummaries.filter((result: InvoiceResolution): boolean => !result.unresolved).length;
    const resolvedByFilesUuid = resolvedLinkSummaries.filter(
      (result: InvoiceResolution): boolean => result.resolution === 'files-uuid'
    ).length;
    const resolvedByOrgYearNo = resolvedLinkSummaries.filter(
      (result: InvoiceResolution): boolean => result.resolution === 'org-year-no'
    ).length;
    const resolvedBySignature = resolvedLinkSummaries.filter(
      (result: InvoiceResolution): boolean => result.resolution === 'signature-matched'
    ).length;
    const unresolvedJoinCount = resolvedLinkSummaries.filter(
      (result: InvoiceResolution): boolean => result.unresolved
    ).length;
    const ambiguousJoinCount = resolvedLinkSummaries.filter(
      (result: InvoiceResolution): boolean => result.candidateCount > 1
    ).length;
    const unresolvedOrganizations = linkDocuments.filter(
      (document: FilemakerInvoiceOrganizationLinkDocument): boolean =>
        typeof document.organizationId !== 'string' && typeof document.legacyOrganizationUuid === 'string'
    ).length;

    console.log(
      JSON.stringify(
        {
          batchSize: options.batchSize,
          duplicateInvoiceIdentityCount: collectedInvoices.duplicateLegacyIdentityCount,
          duplicateJoinLegacyUuidCount: collectedJoins.duplicateLegacyJoinUuidCount,
          invoiceCount: collectedInvoices.invoices.length,
          invoiceWrite,
          joinCount: collectedJoins.joins.length,
          linkWrite,
          linkCount: linkDocuments.length,
          mode: options.dryRun ? 'dry-run' : 'write',
          inputPath: options.inputPath,
          joinInputPath: options.joinInputPath,
          ambiguousJoinCount,
          resolvedJoinCount: totalResolved,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'] ?? null,
          unresolvedJoinCount,
          unresolvedOrganizations,
          resolutionBySource: {
            byFilesUuid: resolvedByFilesUuid,
            byOrgYearNo: resolvedByOrgYearNo,
            bySignature: resolvedBySignature,
          },
          skippedInvoiceRowCount: collectedInvoices.skippedRowCount,
          skippedJoinRowCount: collectedJoins.skippedRowCount,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
