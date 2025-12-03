'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Tag,
  Folder,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  fileName: string;
  documentType: string;
  status: string;
  ownerName: string;
  tags: string[];
  createdAt: number;
}

interface Facets {
  documentType?: Record<string, number>;
  status?: Record<string, number>;
  tags?: Record<string, number>;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<Facets>({});
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (query || selectedType || selectedStatus) {
      performSearch();
    }
  }, [page, selectedType, selectedStatus]);

  const performSearch = async (newQuery?: string) => {
    const searchQuery = newQuery !== undefined ? newQuery : query;
    if (!searchQuery && !selectedType && !selectedStatus) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedType) params.append('type', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('page', page.toString());
      params.append('limit', '20');

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.facets) {
          setFacets(data.facets);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    performSearch();

    // Update URL
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedType) params.set('type', selectedType);
    if (selectedStatus) params.set('status', selectedStatus);
    router.push(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    setSelectedType('');
    setSelectedStatus('');
    setPage(1);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      PUBLISHED: 'bg-blue-100 text-blue-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Documents</h1>
        <p className="text-gray-500">Search through all your documents and files</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documents, content, metadata..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-5 w-5 mr-2" />
          Filters
          {(selectedType || selectedStatus) && (
            <Badge variant="default" className="ml-2">
              {[selectedType, selectedStatus].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Filters</h3>
              {(selectedType || selectedStatus) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Types</option>
                  <option value="GENERAL">General</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INVOICE">Invoice</option>
                  <option value="REPORT">Report</option>
                  <option value="MEMO">Memo</option>
                  <option value="LETTER">Letter</option>
                  <option value="POLICY">Policy</option>
                  <option value="PROCEDURE">Procedure</option>
                  <option value="FORM">Form</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => { setPage(1); performSearch(); }}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Facets Sidebar */}
        {Object.keys(facets).length > 0 && (
          <div className="space-y-4">
            {facets.documentType && Object.keys(facets.documentType).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Document Type
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(facets.documentType).map(([type, count]) => (
                      <button
                        key={type}
                        onClick={() => { setSelectedType(type); setPage(1); performSearch(); }}
                        className={`flex items-center justify-between w-full px-2 py-1 rounded text-sm hover:bg-gray-100 ${
                          selectedType === type ? 'bg-indigo-50 text-indigo-700' : ''
                        }`}
                      >
                        <span>{type}</span>
                        <span className="text-gray-500">{count}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {facets.status && Object.keys(facets.status).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Status</h4>
                  <div className="space-y-2">
                    {Object.entries(facets.status).map(([status, count]) => (
                      <button
                        key={status}
                        onClick={() => { setSelectedStatus(status); setPage(1); performSearch(); }}
                        className={`flex items-center justify-between w-full px-2 py-1 rounded text-sm hover:bg-gray-100 ${
                          selectedStatus === status ? 'bg-indigo-50 text-indigo-700' : ''
                        }`}
                      >
                        <span>{status.replace('_', ' ')}</span>
                        <span className="text-gray-500">{count}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Results List */}
        <div className={`${Object.keys(facets).length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No results found</h3>
                <p className="text-gray-500 mt-1">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-500">
                Found {total} result{total !== 1 ? 's' : ''}
              </div>
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link
                            href={`/documents/${result.id}`}
                            className="text-lg font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {result.title}
                          </Link>
                          {result.description && (
                            <p className="text-gray-600 mt-1 line-clamp-2">
                              {result.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              {result.fileName}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(result.status)}`}>
                              {result.status.replace('_', ' ')}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(new Date(result.createdAt).toISOString())}
                            </span>
                          </div>
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <Tag className="h-4 w-4 text-gray-400" />
                              {result.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{result.documentType}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
