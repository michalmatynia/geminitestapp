import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';
import { read, utils as xlsxUtils } from 'xlsx';

import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const DEFAULT_BATCH_SIZE = 1_000;
const DEFAULT_INPUT_PATH = 'csv/b/x/serviceDisplay.xlsx';
const DEFAULT_JOIN_INPUT_PATH = 'csv/b/nameOrganisationInvoiceJOIN.xlsx';
const IMPORT_SOURCE_KIND = 'filemaker.invoice-service';
const INVOICES_COLLECTION = 'filemaker_invoices';
const INVOICE_LINKS_COLLECTION = 'filemaker_organization_invoice_links';
const INVOICE_SERVICES_COLLECTION = 'filemaker_invoice_services';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string;
  joinInputPath: string | null;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type ParsedServiceDisplayRow = {
  amount?: string;
  brutto?: string;
  creationAccountName?: string;
  creationHostTimestamp?: string;
  creationTimestamp?: string;
  currency?: string;
  legacyParentUuid?: string;
  legacyUuid?: string;
  modificationAccountName?: string;
  modificationHostTimestamp?: string;
  modificationTimestamp?: string;
  price?: string;
  rowIndex: number;
  serviceNameRaw?: string;
  serviceType?: string;
  sum?: string;
  taxComment?: string;
  total?: string;
  vatNumber?: string;
  vatUuid?: string;
};

type FilemakerInvoiceServiceDocument = Document & {
  _id: string;
  amount?: string;
  brutto?: string;
  creationAccountName?: string;
  creationHostTimestamp?: string;
  creationTimestamp?: string;
  currency?: string;
  currencyUuid?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  invoiceId?: string;
  legacyParentUuid?: string;
  legacyUuid?: string;
  modificationAccountName?: string;
  modificationHostTimestamp?: string;
  modificationTimestamp?: string;
  price?: string;
  resolvedBy?: 'invoice-organization-link' | 'join-workbook';
  resolutionCandidateCount: number;
  rowIndex: number;
  schemaVersion: 1;
  serviceName?: string;
  serviceNameRaw?: string;
  serviceNameUuid?: string;
  serviceType?: string;
  sum?: string;
  taxComment?: string;
  total?: string;
  vatNumber?: string;
  vatUuid?: string;
};

type InvoiceLinkResolution = {
  candidateCount: number;
  invoiceId?: string;
  resolvedBy?: 'invoice-organization-link' | 'join-workbook';
};

type ParsedInvoiceJoinReference = {
  invoiceBookDayForPayment?: string;
  invoiceBookEventDate?: string;
  invoiceBookInvoiceNo?: string;
  invoiceBookIsPaid?: string;
  invoiceBookIssueDate?: string;
  invoiceBookIssueYear?: string;
  invoiceBookOrgFilter?: string;
  invoiceBookPaidSoFar?: string;
  invoiceBookPaymentDue?: string;
  invoiceBookPaymentType?: string;
  invoiceBookSignature?: string;
  invoiceBookStationaryUuid?: string;
  invoiceBookUuid?: string;
  invoiceBookUuidFk?: string;
  legacyOrganizationUuid?: string;
};

type FilemakerInvoiceLookupDocument = Document & {
  _id: string;
  cIssueYear?: string;
  cPaymentDue?: string;
  dayForPayment?: string;
  eventDate?: string;
  id: string;
  invoiceNo?: string;
  issueDate?: string;
  isPaid?: string;
  organizationBUuid?: string;
  organizationSUuid?: string;
  orgFilter?: string;
  paidSoFar?: string;
  paymentType?: string;
  signature?: string;
  stationaryUuid?: string;
};

type ParsedServiceDisplayCollection = {
  duplicateLegacyUuidCount: number;
  services: ParsedServiceDisplayRow[];
  skippedRowCount: number;
};

type WriteResultSummary = {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-service-display-to-mongo.ts --input=csv/b/x/serviceDisplay.xlsx --source=local --write',
      '',
      'Imports FileMaker serviceDisplay XLSX/CSV/TSV exports into local Mongo.',
      `Services are stored in ${INVOICE_SERVICES_COLLECTION}.`,
      `Service rows resolve to invoices through ${INVOICE_LINKS_COLLECTION}.legacyInvoiceBookUuidFk.`,
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the service collection.',
      'Pass --join-input=csv/b/nameOrganisationInvoiceJOIN.xlsx to change the workbook fallback resolver.',
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
    joinInputPath: DEFAULT_JOIN_INPUT_PATH,
    replaceCollection: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollection = true;
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

  return options;
};

const createModernId = (kind: 'invoice-service', key: string): string => {
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

const normalizeLegacyUuid = (value: unknown): string | undefined => {
  const normalized = optionalString(value)?.toUpperCase();
  return normalized && UUID_RE.test(normalized) ? normalized : normalized;
};

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

const parseServiceDisplayRows = async (
  inputPath: string
): Promise<ParsedServiceDisplayRow[]> => {
  const rows = parseRows(await readFile(inputPath), inputPath);
  if (rows.length === 0) return [];

  const header = buildHeaderMap(rows[0] ?? []);
  const idx = {
    amount: header.get('Amount'),
    brutto: header.get('c_Brutto'),
    creationAccountName: header.get('creationAccountName'),
    creationHostTimestamp: header.get('creationHostTimestamp'),
    creationTimestamp: header.get('creationTimestamp'),
    currency: header.get('Currency'),
    legacyParentUuid: header.get('ParentUUID'),
    legacyUuid: header.get('UUID'),
    modificationAccountName: header.get('modificationAccountName'),
    modificationHostTimestamp: header.get('modificationHostTimestamp'),
    modificationTimestamp: header.get('modificationTimestamp'),
    price: header.get('Price'),
    serviceNameRaw: header.get('ServiceName_UUID_FK'),
    serviceType: header.get('ServiceType'),
    sum: header.get('c_Sum'),
    taxComment: header.get('Tax_Comment'),
    total: header.get('s_Total'),
    vatNumber: header.get('c_VATnumber'),
    vatUuid: header.get('VAT_UUID_FK'),
  };

  const parseServiceField = (row: string[], index: number | undefined): string | undefined =>
    index === undefined ? undefined : optionalString(row[index]);

  return rows
    .slice(1)
    .map((row: string[], rowIndex: number): ParsedServiceDisplayRow | null => {
      const service: ParsedServiceDisplayRow = {
        amount: parseServiceField(row, idx.amount),
        brutto: parseServiceField(row, idx.brutto),
        creationAccountName: parseServiceField(row, idx.creationAccountName),
        creationHostTimestamp: parseServiceField(row, idx.creationHostTimestamp),
        creationTimestamp: parseServiceField(row, idx.creationTimestamp),
        currency: normalizeLegacyUuid(parseServiceField(row, idx.currency)),
        legacyParentUuid: normalizeLegacyUuid(parseServiceField(row, idx.legacyParentUuid)),
        legacyUuid: normalizeLegacyUuid(parseServiceField(row, idx.legacyUuid)),
        modificationAccountName: parseServiceField(row, idx.modificationAccountName),
        modificationHostTimestamp: parseServiceField(row, idx.modificationHostTimestamp),
        modificationTimestamp: parseServiceField(row, idx.modificationTimestamp),
        price: parseServiceField(row, idx.price),
        rowIndex,
        serviceNameRaw: parseServiceField(row, idx.serviceNameRaw),
        serviceType: normalizeLegacyUuid(parseServiceField(row, idx.serviceType)),
        sum: parseServiceField(row, idx.sum),
        taxComment: parseServiceField(row, idx.taxComment),
        total: parseServiceField(row, idx.total),
        vatNumber: parseServiceField(row, idx.vatNumber),
        vatUuid: normalizeLegacyUuid(parseServiceField(row, idx.vatUuid)),
      };

      const hasData = Object.values(service).some((value: unknown): value is string => {
        if (typeof value !== 'string') return false;
        return value.trim().length > 0;
      });
      if (!hasData) return null;

      return service;
    })
    .filter(
      (service: ParsedServiceDisplayRow | null): service is ParsedServiceDisplayRow =>
        service !== null
    );
};

const collectServices = (
  rows: ParsedServiceDisplayRow[]
): ParsedServiceDisplayCollection => {
  const services: ParsedServiceDisplayRow[] = [];
  const seen = new Set<string>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((service: ParsedServiceDisplayRow): void => {
    if (!service.legacyUuid && !service.legacyParentUuid) {
      skippedRowCount += 1;
      return;
    }
    if (service.legacyUuid) {
      if (seen.has(service.legacyUuid)) duplicateLegacyUuidCount += 1;
      seen.add(service.legacyUuid);
    }
    services.push(service);
  });

  return { duplicateLegacyUuidCount, services, skippedRowCount };
};

const parseInvoiceJoinReferenceRows = async (
  inputPath: string
): Promise<ParsedInvoiceJoinReference[]> => {
  const rows = parseRows(await readFile(inputPath), inputPath);
  if (rows.length === 0) return [];

  const header = buildHeaderMap(rows[0] ?? []);
  const idx = {
    invoiceBookDayForPayment: header.get('InvoiceBook::DayForPayment'),
    invoiceBookEventDate: header.get('InvoiceBook::EventDate'),
    invoiceBookInvoiceNo: header.get('InvoiceBook::InvoiceNo'),
    invoiceBookIsPaid: header.get('InvoiceBook::IsPaid'),
    invoiceBookIssueDate: header.get('InvoiceBook::IssueDate'),
    invoiceBookIssueYear: header.get('InvoiceBook::c_IssueYear'),
    invoiceBookOrgFilter: header.get('InvoiceBook::org_FILTER'),
    invoiceBookPaidSoFar: header.get('InvoiceBook::PaidSoFar'),
    invoiceBookPaymentDue: header.get('InvoiceBook::c_paymentDue'),
    invoiceBookPaymentType: header.get('InvoiceBook::PaymentType'),
    invoiceBookSignature: header.get('InvoiceBook::Signature'),
    invoiceBookStationaryUuid: header.get('InvoiceBook::Stationary_Lg_UUID_FK'),
    invoiceBookUuid: header.get('InvoiceBook::UUID'),
    invoiceBookUuidFk: header.get('InvoiceBook_UUID_FK'),
    legacyOrganizationUuid: header.get('NameOrganisation_UUID_FK'),
  };

  const parseJoinField = (row: string[], index: number | undefined): string | undefined =>
    index === undefined ? undefined : optionalString(row[index]);

  return rows
    .slice(1)
    .map((row: string[]): ParsedInvoiceJoinReference | null => {
      const join: ParsedInvoiceJoinReference = {
        invoiceBookDayForPayment: parseJoinField(row, idx.invoiceBookDayForPayment),
        invoiceBookEventDate: parseJoinField(row, idx.invoiceBookEventDate),
        invoiceBookInvoiceNo: parseJoinField(row, idx.invoiceBookInvoiceNo),
        invoiceBookIsPaid: parseJoinField(row, idx.invoiceBookIsPaid),
        invoiceBookIssueDate: parseJoinField(row, idx.invoiceBookIssueDate),
        invoiceBookIssueYear: parseJoinField(row, idx.invoiceBookIssueYear),
        invoiceBookOrgFilter: parseJoinField(row, idx.invoiceBookOrgFilter),
        invoiceBookPaidSoFar: parseJoinField(row, idx.invoiceBookPaidSoFar),
        invoiceBookPaymentDue: parseJoinField(row, idx.invoiceBookPaymentDue),
        invoiceBookPaymentType: parseJoinField(row, idx.invoiceBookPaymentType),
        invoiceBookSignature: parseJoinField(row, idx.invoiceBookSignature),
        invoiceBookStationaryUuid: parseJoinField(row, idx.invoiceBookStationaryUuid),
        invoiceBookUuid: normalizeLegacyUuid(parseJoinField(row, idx.invoiceBookUuid)),
        invoiceBookUuidFk: normalizeLegacyUuid(parseJoinField(row, idx.invoiceBookUuidFk)),
        legacyOrganizationUuid: normalizeLegacyUuid(parseJoinField(row, idx.legacyOrganizationUuid)),
      };
      if (!join.invoiceBookUuid && !join.invoiceBookUuidFk) return null;
      return join;
    })
    .filter(
      (join: ParsedInvoiceJoinReference | null): join is ParsedInvoiceJoinReference =>
        join !== null
    );
};

const buildInvoiceResolutionByParentUuid = async (
  db: Db
): Promise<Map<string, InvoiceLinkResolution>> => {
  const rows = await db
    .collection<Document>(INVOICE_LINKS_COLLECTION)
    .aggregate<{ _id: string; invoiceIds: string[] }>([
      {
        $match: {
          invoiceId: { $type: 'string' },
          legacyInvoiceBookUuidFk: { $type: 'string' },
        },
      },
      {
        $group: {
          _id: '$legacyInvoiceBookUuidFk',
          invoiceIds: { $addToSet: '$invoiceId' },
        },
      },
    ])
    .toArray();

  return new Map(
    rows
      .map((row): [string, InvoiceLinkResolution] | null => {
        const parentUuid = row._id.trim().toUpperCase();
        if (!parentUuid) return null;
        const invoiceIds = row.invoiceIds.filter(
          (invoiceId: string): boolean => invoiceId.trim().length > 0
        );
        return [
          parentUuid,
          {
            candidateCount: invoiceIds.length,
            ...(invoiceIds.length === 1
              ? { invoiceId: invoiceIds[0], resolvedBy: 'invoice-organization-link' }
              : {}),
          },
        ];
      })
      .filter((entry): entry is [string, InvoiceLinkResolution] => entry !== null)
  );
};

const loadInvoiceLookupDocuments = async (
  db: Db
): Promise<FilemakerInvoiceLookupDocument[]> =>
  db
    .collection<FilemakerInvoiceLookupDocument>(INVOICES_COLLECTION)
    .find(
      {},
      {
        projection: {
          _id: 1,
          cIssueYear: 1,
          cPaymentDue: 1,
          dayForPayment: 1,
          eventDate: 1,
          id: 1,
          invoiceNo: 1,
          issueDate: 1,
          isPaid: 1,
          organizationBUuid: 1,
          organizationSUuid: 1,
          orgFilter: 1,
          paidSoFar: 1,
          paymentType: 1,
          signature: 1,
          stationaryUuid: 1,
        },
      }
    )
    .toArray();

const buildInvoiceLookupByOrgYearNo = (
  invoices: FilemakerInvoiceLookupDocument[]
): Map<string, FilemakerInvoiceLookupDocument[]> => {
  const byOrgYearNo = new Map<string, FilemakerInvoiceLookupDocument[]>();
  for (const invoice of invoices) {
    const orgUuids = [invoice.organizationBUuid, invoice.organizationSUuid].filter(
      (uuid: string | undefined): uuid is string => !!uuid && uuid.length > 0
    );
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

const matchInvoiceFromJoinReference = (
  join: ParsedInvoiceJoinReference,
  input: {
    invoiceByOrgYearNo: Map<string, FilemakerInvoiceLookupDocument[]>;
    invoices: FilemakerInvoiceLookupDocument[];
  }
): FilemakerInvoiceLookupDocument | null => {
  if (join.legacyOrganizationUuid && join.invoiceBookIssueYear && join.invoiceBookInvoiceNo) {
    const candidatesByOrgYearNo = input.invoiceByOrgYearNo.get(
      `${join.legacyOrganizationUuid}|${join.invoiceBookIssueYear}|${join.invoiceBookInvoiceNo}`
    );
    if (candidatesByOrgYearNo?.length === 1) return candidatesByOrgYearNo[0];
  }

  const scored = input.invoices
    .map((invoice: FilemakerInvoiceLookupDocument): {
      invoice: FilemakerInvoiceLookupDocument;
      score: number;
    } => {
      let score = 0;
      if (join.invoiceBookIssueYear && invoice.cIssueYear === join.invoiceBookIssueYear) score += 1;
      if (join.invoiceBookPaymentDue && invoice.cPaymentDue === join.invoiceBookPaymentDue)
        score += 1;
      if (join.invoiceBookDayForPayment && invoice.dayForPayment === join.invoiceBookDayForPayment)
        score += 1;
      if (join.invoiceBookEventDate && invoice.eventDate === join.invoiceBookEventDate) score += 1;
      if (join.invoiceBookInvoiceNo && invoice.invoiceNo === join.invoiceBookInvoiceNo) score += 1;
      if (join.invoiceBookIsPaid && invoice.isPaid === join.invoiceBookIsPaid) score += 1;
      if (join.invoiceBookIssueDate && invoice.issueDate === join.invoiceBookIssueDate) score += 1;
      if (join.invoiceBookPaidSoFar && invoice.paidSoFar === join.invoiceBookPaidSoFar) score += 1;
      if (join.invoiceBookPaymentType && invoice.paymentType === join.invoiceBookPaymentType)
        score += 1;
      if (join.invoiceBookOrgFilter && invoice.orgFilter === join.invoiceBookOrgFilter) score += 1;
      if (join.invoiceBookSignature && invoice.signature === join.invoiceBookSignature) score += 1;
      if (
        join.invoiceBookStationaryUuid &&
        invoice.stationaryUuid === join.invoiceBookStationaryUuid
      ) {
        score += 1;
      }
      if (
        join.legacyOrganizationUuid &&
        (invoice.organizationBUuid === join.legacyOrganizationUuid ||
          invoice.organizationSUuid === join.legacyOrganizationUuid)
      ) {
        score += 2;
      }
      return { invoice, score };
    })
    .filter((entry): boolean => entry.score > 0)
    .sort(
      (left, right): number =>
        right.score - left.score || left.invoice.id.localeCompare(right.invoice.id)
    );

  if (scored.length === 0) return null;
  const top = scored[0];
  const topCandidateCount = scored.filter((entry): boolean => entry.score === top.score).length;
  return topCandidateCount === 1 ? top.invoice : null;
};

const buildInvoiceResolutionByParentUuidFromJoinWorkbook = async (input: {
  db: Db;
  joinInputPath: string | null;
}): Promise<Map<string, InvoiceLinkResolution>> => {
  if (input.joinInputPath === null) return new Map();

  const [joinRows, invoices] = await Promise.all([
    parseInvoiceJoinReferenceRows(input.joinInputPath),
    loadInvoiceLookupDocuments(input.db),
  ]);
  const invoiceByOrgYearNo = buildInvoiceLookupByOrgYearNo(invoices);
  const invoiceIdsByParentUuid = new Map<string, Set<string>>();

  for (const join of joinRows) {
    const invoice = matchInvoiceFromJoinReference(join, { invoiceByOrgYearNo, invoices });
    if (!invoice) continue;
    const parentUuids = [join.invoiceBookUuidFk, join.invoiceBookUuid].filter(
      (uuid: string | undefined): uuid is string => !!uuid && uuid.length > 0
    );
    for (const parentUuid of parentUuids) {
      const existing = invoiceIdsByParentUuid.get(parentUuid) ?? new Set<string>();
      existing.add(invoice.id);
      invoiceIdsByParentUuid.set(parentUuid, existing);
    }
  }

  return new Map(
    Array.from(invoiceIdsByParentUuid.entries()).map(
      ([parentUuid, invoiceIds]): [string, InvoiceLinkResolution] => {
        const ids = Array.from(invoiceIds);
        return [
          parentUuid,
          {
            candidateCount: ids.length,
            ...(ids.length === 1 ? { invoiceId: ids[0], resolvedBy: 'join-workbook' } : {}),
          },
        ];
      }
    )
  );
};

const mergeInvoiceResolutions = (input: {
  joinWorkbook: Map<string, InvoiceLinkResolution>;
  mongoLinks: Map<string, InvoiceLinkResolution>;
}): Map<string, InvoiceLinkResolution> => {
  const merged = new Map<string, InvoiceLinkResolution>();
  for (const [parentUuid, resolution] of input.mongoLinks.entries()) {
    merged.set(parentUuid, resolution);
  }
  for (const [parentUuid, fallbackResolution] of input.joinWorkbook.entries()) {
    const existing = merged.get(parentUuid);
    if (!existing?.invoiceId && fallbackResolution.invoiceId) {
      merged.set(parentUuid, fallbackResolution);
    }
  }
  return merged;
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
    db.collection(INVOICE_SERVICES_COLLECTION).createIndex(
      { id: 1 },
      { name: 'filemaker_invoice_services_id_unique', unique: true }
    ),
    db.collection(INVOICE_SERVICES_COLLECTION).createIndex(
      { legacyUuid: 1 },
      {
        name: 'filemaker_invoice_services_legacy_uuid_unique',
        partialFilterExpression: { legacyUuid: { $type: 'string' } },
        unique: true,
      }
    ),
    db.collection(INVOICE_SERVICES_COLLECTION).createIndex(
      { legacyParentUuid: 1 },
      { name: 'filemaker_invoice_services_legacy_parent_uuid' }
    ),
    db.collection(INVOICE_SERVICES_COLLECTION).createIndex(
      { invoiceId: 1, rowIndex: 1 },
      { name: 'filemaker_invoice_services_invoice_id_row_index' }
    ),
    db.collection(INVOICE_SERVICES_COLLECTION).createIndex(
      { serviceNameUuid: 1 },
      { name: 'filemaker_invoice_services_service_name_uuid' }
    ),
  ]);
};

const buildServiceDocuments = (input: {
  importBatchId: string;
  importedAt: Date;
  resolutionByParentUuid: Map<string, InvoiceLinkResolution>;
  services: ParsedServiceDisplayRow[];
}): FilemakerInvoiceServiceDocument[] =>
  input.services.map((service: ParsedServiceDisplayRow): FilemakerInvoiceServiceDocument => {
    const identityKey =
      service.legacyUuid ?? `${service.legacyParentUuid ?? 'orphan'}|${service.rowIndex}`;
    const id = createModernId('invoice-service', identityKey);
    const serviceNameRaw = service.serviceNameRaw?.trim();
    const serviceNameIsUuid = serviceNameRaw ? UUID_RE.test(serviceNameRaw) : false;
    const resolution =
      service.legacyParentUuid !== undefined
        ? input.resolutionByParentUuid.get(service.legacyParentUuid)
        : undefined;

    return {
      _id: id,
      ...(service.amount ? { amount: service.amount } : {}),
      ...(service.brutto ? { brutto: service.brutto } : {}),
      ...(service.creationAccountName ? { creationAccountName: service.creationAccountName } : {}),
      ...(service.creationHostTimestamp
        ? { creationHostTimestamp: service.creationHostTimestamp }
        : {}),
      ...(service.creationTimestamp ? { creationTimestamp: service.creationTimestamp } : {}),
      ...(service.currency ? { currency: service.currency, currencyUuid: service.currency } : {}),
      id,
      importBatchId: input.importBatchId,
      importedAt: input.importedAt,
      importSourceKind: IMPORT_SOURCE_KIND,
      ...(resolution?.invoiceId ? { invoiceId: resolution.invoiceId } : {}),
      ...(service.legacyParentUuid ? { legacyParentUuid: service.legacyParentUuid } : {}),
      ...(service.legacyUuid ? { legacyUuid: service.legacyUuid } : {}),
      ...(service.modificationAccountName
        ? { modificationAccountName: service.modificationAccountName }
        : {}),
      ...(service.modificationHostTimestamp
        ? { modificationHostTimestamp: service.modificationHostTimestamp }
        : {}),
      ...(service.modificationTimestamp
        ? { modificationTimestamp: service.modificationTimestamp }
        : {}),
      ...(service.price ? { price: service.price } : {}),
      ...(resolution?.resolvedBy ? { resolvedBy: resolution.resolvedBy } : {}),
      resolutionCandidateCount: resolution?.candidateCount ?? 0,
      rowIndex: service.rowIndex,
      schemaVersion: 1,
      ...(serviceNameRaw && !serviceNameIsUuid ? { serviceName: serviceNameRaw } : {}),
      ...(serviceNameRaw ? { serviceNameRaw } : {}),
      ...(serviceNameRaw && serviceNameIsUuid ? { serviceNameUuid: serviceNameRaw.toUpperCase() } : {}),
      ...(service.serviceType ? { serviceType: service.serviceType } : {}),
      ...(service.sum ? { sum: service.sum } : {}),
      ...(service.taxComment ? { taxComment: service.taxComment } : {}),
      ...(service.total ? { total: service.total } : {}),
      ...(service.vatNumber ? { vatNumber: service.vatNumber } : {}),
      ...(service.vatUuid ? { vatUuid: service.vatUuid } : {}),
    };
  });

const toUpsertOperation = <TDocument extends Document>(
  document: TDocument & { _id: string; id: string }
): AnyBulkWriteOperation<TDocument> => {
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
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedRows = await parseServiceDisplayRows(options.inputPath);
  const collected = collectServices(parsedRows);

  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection =
      db.collection<FilemakerInvoiceServiceDocument>(INVOICE_SERVICES_COLLECTION);

    if (!options.dryRun && options.replaceCollection) {
      await dropCollectionIfExists(collection);
    }

    const [mongoResolutionByParentUuid, workbookResolutionByParentUuid] = await Promise.all([
      buildInvoiceResolutionByParentUuid(db),
      buildInvoiceResolutionByParentUuidFromJoinWorkbook({
        db,
        joinInputPath: options.joinInputPath,
      }),
    ]);
    const resolutionByParentUuid = mergeInvoiceResolutions({
      joinWorkbook: workbookResolutionByParentUuid,
      mongoLinks: mongoResolutionByParentUuid,
    });
    const documents = buildServiceDocuments({
      importBatchId: randomUUID(),
      importedAt: new Date(),
      resolutionByParentUuid,
      services: collected.services,
    });

    const resolvedCount = documents.filter(
      (document: FilemakerInvoiceServiceDocument): boolean => !!document.invoiceId
    ).length;
    const unresolvedCount = documents.length - resolvedCount;
    const parentUuidCount = new Set(
      collected.services
        .map((service: ParsedServiceDisplayRow): string | undefined => service.legacyParentUuid)
        .filter((uuid): uuid is string => uuid !== undefined)
    ).size;

    console.log(
      JSON.stringify(
        {
          dryRun: options.dryRun,
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          inputPath: options.inputPath,
          joinInputPath: options.joinInputPath,
          parsedRowCount: parsedRows.length,
          parentUuidCount,
          resolvedCount,
          resolvedFromJoinWorkbookCount: documents.filter(
            (document: FilemakerInvoiceServiceDocument): boolean =>
              document.resolvedBy === 'join-workbook'
          ).length,
          resolvedFromMongoJoinCount: documents.filter(
            (document: FilemakerInvoiceServiceDocument): boolean =>
              document.resolvedBy === 'invoice-organization-link'
          ).length,
          serviceDocumentCount: documents.length,
          skippedRowCount: collected.skippedRowCount,
          unresolvedCount,
        },
        null,
        2
      )
    );

    if (options.dryRun) return;

    await ensureIndexes(db);
    const result = await runBulkWrites(collection, documents, options.batchSize);
    console.log(JSON.stringify({ writeResult: result }, null, 2));
  } finally {
    await client.close();
  }
};

main().catch((error: unknown): void => {
  console.error(error);
  process.exitCode = 1;
});
