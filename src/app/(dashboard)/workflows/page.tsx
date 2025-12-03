'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  User,
  FileText,
  Calendar,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  document: { id: string; title: string; slug: string };
  createdBy: { id: string; name: string | null; email: string };
  steps: Array<{
    id: string;
    order: number;
    name: string;
    assignedTo: { id: string; name: string | null; email: string };
    status: string;
  }>;
  currentStep: number | null;
  createdAt: string;
  completedAt: string | null;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'created'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchWorkflows();
  }, [filter, statusFilter, page]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (filter === 'assigned') params.append('assignedToMe', 'true');
      if (filter === 'created') params.append('createdByMe', 'true');
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/workflows?${params}`);
      const data = await response.json();

      if (data.success) {
        setWorkflows(data.data);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'ON_HOLD':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <GitBranch className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
      ACTIVE: 'default',
      COMPLETED: 'success',
      CANCELLED: 'destructive',
      ON_HOLD: 'warning',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
      LOW: 'secondary',
      MEDIUM: 'default',
      HIGH: 'warning',
      URGENT: 'destructive',
    };
    return <Badge variant={variants[priority] || 'secondary'}>{priority}</Badge>;
  };

  const getStepProgress = (workflow: Workflow) => {
    const completed = workflow.steps.filter((s) => s.status === 'COMPLETED').length;
    return { completed, total: workflow.steps.length };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage document approval workflows</p>
        </div>
        <Link href="/workflows/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex rounded-lg border overflow-hidden">
          {[
            { key: 'all', label: 'All' },
            { key: 'assigned', label: 'Assigned to Me' },
            { key: 'created', label: 'Created by Me' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => { setFilter(item.key as any); setPage(1); }}
              className={`px-4 py-2 text-sm ${
                filter === item.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No workflows found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Create a new workflow to get started</p>
            <Link href="/workflows/new">
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                New Workflow
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => {
            const progress = getStepProgress(workflow);
            return (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        {getStatusIcon(workflow.status)}
                      </div>
                      <div>
                        <Link
                          href={`/workflows/${workflow.id}`}
                          className="text-lg font-medium text-gray-900 dark:text-white hover:text-indigo-600"
                        >
                          {workflow.name}
                        </Link>
                        {workflow.description && (
                          <p className="text-gray-500 dark:text-gray-400 mt-1">{workflow.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            <Link href={`/documents/${workflow.document.slug}`} className="hover:text-indigo-600">
                              {workflow.document.title}
                            </Link>
                          </span>
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {workflow.createdBy.name || workflow.createdBy.email}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(workflow.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getPriorityBadge(workflow.priority)}
                      {getStatusBadge(workflow.status)}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500 dark:text-gray-400">Progress</span>
                      <span className="font-medium">
                        {progress.completed} / {progress.total} steps
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Steps Overview */}
                  <div className="mt-4 flex items-center space-x-2">
                    {workflow.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`flex items-center ${index < workflow.steps.length - 1 ? 'flex-1' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            step.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-600'
                              : step.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-600'
                              : step.status === 'REJECTED'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          }`}
                          title={`${step.name} - ${step.assignedTo.name || step.assignedTo.email}`}
                        >
                          {step.status === 'COMPLETED' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : step.status === 'REJECTED' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            step.order
                          )}
                        </div>
                        {index < workflow.steps.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-2 ${
                              step.status === 'COMPLETED' ? 'bg-green-300' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
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
    </div>
  );
}
