'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Folder,
  FolderPlus,
  ChevronRight,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FolderItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  children: Array<{ id: string; name: string; slug: string }>;
  documentsCount: number;
  childrenCount: number;
  createdAt: string;
}

export default function FoldersPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [currentPath, setCurrentPath] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchFolders();
  }, [selectedParent]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedParent) {
        params.append('parentId', selectedParent);
      } else {
        params.append('parentId', 'null');
      }

      const response = await fetch(`/api/folders?${params}`);
      const data = await response.json();

      if (data.success) {
        setFolders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          description: newFolderDescription || undefined,
          parentId: selectedParent || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewFolderName('');
        setNewFolderDescription('');
        setShowCreateForm(false);
        fetchFolders();
      } else {
        setError(data.error || 'Failed to create folder');
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
      setError('Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const navigateToFolder = (folder: FolderItem) => {
    setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
    setSelectedParent(folder.id);
  };

  const navigateBack = (index: number) => {
    if (index === -1) {
      setCurrentPath([]);
      setSelectedParent(null);
    } else {
      const newPath = currentPath.slice(0, index + 1);
      setCurrentPath(newPath);
      setSelectedParent(newPath[newPath.length - 1]?.id || null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Folders</h1>
          <p className="text-gray-500 dark:text-gray-400">Organize your documents into folders</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm">
        <button
          onClick={() => navigateBack(-1)}
          className={`hover:text-indigo-600 ${currentPath.length === 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Root
        </button>
        {currentPath.map((item, index) => (
          <div key={item.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
            <button
              onClick={() => navigateBack(index)}
              className={`hover:text-indigo-600 ${
                index === currentPath.length - 1 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {item.name}
            </button>
          </div>
        ))}
      </div>

      {/* Create Folder Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Folder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder Name
                </label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <Input
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Enter description"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); setError(''); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Folder
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Folders Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : folders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No folders yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Create your first folder to organize documents</p>
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigateToFolder(folder)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Folder className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600">
                        {folder.name}
                      </h3>
                      {folder.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                          {folder.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Show folder actions menu
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {folder.documentsCount} document{folder.documentsCount !== 1 ? 's' : ''}
                  </span>
                  {folder.childrenCount > 0 && (
                    <span className="flex items-center">
                      <Folder className="h-4 w-4 mr-1" />
                      {folder.childrenCount} subfolder{folder.childrenCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
