import { MeiliSearch, Index } from 'meilisearch';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || '';

let client: MeiliSearch | null = null;

export function getSearchClient(): MeiliSearch {
  if (!client) {
    client = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY,
    });
  }
  return client;
}

export interface DocumentSearchRecord {
  id: string;
  title: string;
  description: string;
  fileName: string;
  documentNumber: string;
  documentType: string;
  direction: string;
  status: string;
  ocrText: string;
  tags: string[];
  ownerId: string;
  ownerName: string;
  folderId: string;
  folderName: string;
  createdAt: number;
  updatedAt: number;
}

const DOCUMENTS_INDEX = 'documents';

export async function initializeSearchIndex(): Promise<void> {
  const client = getSearchClient();

  try {
    // Create or get the documents index
    await client.createIndex(DOCUMENTS_INDEX, { primaryKey: 'id' });
  } catch {
    // Index might already exist
  }

  const index = client.index(DOCUMENTS_INDEX);

  // Configure searchable attributes
  await index.updateSearchableAttributes([
    'title',
    'description',
    'fileName',
    'documentNumber',
    'ocrText',
    'tags',
    'ownerName',
    'folderName',
  ]);

  // Configure filterable attributes
  await index.updateFilterableAttributes([
    'documentType',
    'direction',
    'status',
    'ownerId',
    'folderId',
    'tags',
    'createdAt',
  ]);

  // Configure sortable attributes
  await index.updateSortableAttributes(['title', 'createdAt', 'updatedAt']);

  // Configure ranking rules
  await index.updateRankingRules([
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'createdAt:desc',
  ]);
}

export async function indexDocument(document: DocumentSearchRecord): Promise<void> {
  const client = getSearchClient();
  const index = client.index(DOCUMENTS_INDEX);
  await index.addDocuments([document]);
}

export async function updateDocumentIndex(document: DocumentSearchRecord): Promise<void> {
  const client = getSearchClient();
  const index = client.index(DOCUMENTS_INDEX);
  await index.updateDocuments([document]);
}

export async function removeDocumentFromIndex(documentId: string): Promise<void> {
  const client = getSearchClient();
  const index = client.index(DOCUMENTS_INDEX);
  await index.deleteDocument(documentId);
}

export async function searchDocuments(
  query: string,
  options: {
    filters?: string;
    sort?: string[];
    limit?: number;
    offset?: number;
    facets?: string[];
  } = {}
): Promise<{
  hits: DocumentSearchRecord[];
  totalHits: number;
  facetDistribution?: Record<string, Record<string, number>>;
}> {
  const client = getSearchClient();
  const index = client.index(DOCUMENTS_INDEX);

  const results = await index.search<DocumentSearchRecord>(query, {
    filter: options.filters,
    sort: options.sort,
    limit: options.limit || 20,
    offset: options.offset || 0,
    facets: options.facets,
  });

  return {
    hits: results.hits,
    totalHits: results.estimatedTotalHits || 0,
    facetDistribution: results.facetDistribution,
  };
}

export async function bulkIndexDocuments(documents: DocumentSearchRecord[]): Promise<void> {
  const client = getSearchClient();
  const index = client.index(DOCUMENTS_INDEX);
  await index.addDocuments(documents);
}

export async function clearDocumentsIndex(): Promise<void> {
  const client = getSearchClient();
  const index = client.index(DOCUMENTS_INDEX);
  await index.deleteAllDocuments();
}

export async function getIndexStats(): Promise<{
  numberOfDocuments: number;
  isIndexing: boolean;
}> {
  const client = getSearchClient();
  const index = client.index(DOCUMENTS_INDEX);
  const stats = await index.getStats();

  return {
    numberOfDocuments: stats.numberOfDocuments,
    isIndexing: stats.isIndexing,
  };
}
