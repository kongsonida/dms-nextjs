'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkflowStep {
  name: string;
  description: string;
  assignedToId: string;
  action: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface DocumentOption {
  id: string;
  title: string;
  slug: string;
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDocumentId = searchParams.get('documentId');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [documentId, setDocumentId] = useState(preselectedDocumentId || '');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { name: '', description: '', assignedToId: '', action: 'REVIEW' },
  ]);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchDocuments();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?limit=100');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents?limit=100');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const addStep = () => {
    setSteps([...steps, { name: '', description: '', assignedToId: '', action: 'REVIEW' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!name.trim()) {
      setError('Workflow name is required');
      return;
    }
    if (!documentId) {
      setError('Please select a document');
      return;
    }
    if (steps.some((s) => !s.name.trim() || !s.assignedToId)) {
      setError('All steps must have a name and assignee');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          documentId,
          priority,
          dueDate: dueDate || undefined,
          steps: steps.map((s) => ({
            name: s.name,
            description: s.description || undefined,
            assignedToId: s.assignedToId,
            action: s.action,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/workflows');
      } else {
        setError(data.error || data.errors?.join(', ') || 'Failed to create workflow');
      }
    } catch (err) {
      setError('Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/workflows">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Workflow</h1>
          <p className="text-gray-500 dark:text-gray-400">Set up a document approval workflow</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Workflow Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workflow Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Contract Approval"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this workflow..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Document *
                </label>
                <select
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                  required
                >
                  <option value="">Select a document</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Workflow Steps</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-4 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Step {index + 1}</span>
                  </div>
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Step Name *
                    </label>
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(index, 'name', e.target.value)}
                      placeholder="e.g., Manager Review"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Assign To *
                    </label>
                    <select
                      value={step.assignedToId}
                      onChange={(e) => updateStep(index, 'assignedToId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                      required
                    >
                      <option value="">Select assignee</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Action Type
                    </label>
                    <select
                      value={step.action}
                      onChange={(e) => updateStep(index, 'action', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                    >
                      <option value="REVIEW">Review</option>
                      <option value="APPROVE">Approve</option>
                      <option value="SIGN">Sign</option>
                      <option value="VERIFY">Verify</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <Input
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      placeholder="Optional instructions"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Link href="/workflows">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Workflow'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
