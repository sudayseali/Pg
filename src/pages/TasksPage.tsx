import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Check,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Pause,
  Play,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/adminApi';
import { hasPermission } from '../lib/rbac';
import { formatDateTime, formatNumber, formatUsd, isImageUrl, isSafeHttpUrl } from '../lib/formatters';
import { AccessDenied } from '../components/ui/AccessDenied';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeletons';
import type { MicroTask, TaskSubmission } from '../types/admin';

type TasksSubTab = 'tasks' | 'submissions';
type SubmissionFilter = 'pending' | 'approved' | 'rejected' | 'all';

export function TasksPage() {
  const { admin, refreshAdminData } = useAuth();
  const { pushToast } = useToast();

  const canManageTasks = hasPermission(admin?.role, 'manage_tasks');
  const canReviewSubmissions = hasPermission(admin?.role, 'review_submissions');

  const [subTab, setSubTab] = useState<TasksSubTab>(
    canReviewSubmissions ? 'submissions' : 'tasks',
  );

  // Tasks state
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'social',
    reward: '0.25',
    maxCompletions: '100',
    targetUrl: '',
    jobLength: '2 mins',
    proofInstructions: 'Upload a screenshot showing task completion',
  });

  // Submissions state
  const [subFilter, setSubFilter] = useState<SubmissionFilter>('pending');
  const [subPage, setSubPage] = useState(1);
  const subLimit = 15;
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subsLoading, setSubsLoading] = useState(false);
  const [selectedSub, setSelectedSub] = useState<TaskSubmission | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [brokenImgIds, setBrokenImgIds] = useState<Record<string, boolean>>({});

  const loadTasks = useCallback(async () => {
    if (!canManageTasks) return;
    setTasksLoading(true);
    try {
      const res = await adminApi.getTasks();
      setTasks(res.tasks ?? []);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load micro-tasks',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setTasksLoading(false);
    }
  }, [canManageTasks, pushToast]);

  const loadSubmissions = useCallback(async () => {
    if (!canReviewSubmissions) return;
    setSubsLoading(true);
    try {
      const res = await adminApi.getSubmissions({
        status: subFilter,
        page: subPage,
        limit: subLimit,
      });
      const list = res.submissions ?? [];
      setSubmissions(list);
      setSubTotal(res.total ?? 0);
      if (list.length > 0) {
        setSelectedSub((prev) => list.find((s) => s.id === prev?.id) ?? list[0]);
      } else {
        setSelectedSub(null);
      }
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load submissions',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubsLoading(false);
    }
  }, [canReviewSubmissions, subFilter, subPage, pushToast]);

  useEffect(() => {
    if (subTab === 'tasks') void loadTasks();
    else void loadSubmissions();
  }, [subTab, loadTasks, loadSubmissions]);

  if (!canManageTasks && !canReviewSubmissions) {
    return <AccessDenied role={admin?.role} required="Tasks & Proof Submissions" />;
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    const rewardNum = Number.parseFloat(taskForm.reward);
    const maxNum = Number.parseInt(taskForm.maxCompletions, 10);
    if (!taskForm.title.trim() || !taskForm.targetUrl.trim() || !Number.isFinite(rewardNum) || rewardNum <= 0 || !Number.isFinite(maxNum) || maxNum <= 0) {
      pushToast({
        variant: 'error',
        title: 'Invalid task fields',
        description: 'Provide a valid title, target URL, positive reward, and max completions.',
      });
      return;
    }

    setCreating(true);
    try {
      await adminApi.createTask({
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        category: taskForm.category.trim(),
        reward: rewardNum,
        maxCompletions: maxNum,
        targetUrl: taskForm.targetUrl.trim(),
        jobLength: taskForm.jobLength.trim(),
        proofInstructions: taskForm.proofInstructions.trim(),
      });
      pushToast({
        variant: 'success',
        title: 'Micro-task created',
        description: 'Task is live and Telegram alert broadcast triggered.',
      });
      setCreateOpen(false);
      setTaskForm({
        title: '',
        description: '',
        category: 'social',
        reward: '0.25',
        maxCompletions: '100',
        targetUrl: '',
        jobLength: '2 mins',
        proofInstructions: 'Upload a screenshot showing task completion',
      });
      await Promise.all([loadTasks(), refreshAdminData()]);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Could not create task',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleTaskStatus(
    task: MicroTask,
    status: 'active' | 'paused' | 'completed' | 'archived',
  ) {
    try {
      await adminApi.updateTaskStatus({ taskId: task.id, status });
      pushToast({
        variant: 'success',
        title: `Task ${status}`,
        description: task.title,
      });
      await Promise.all([loadTasks(), refreshAdminData()]);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Status update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleReview(decision: 'approved' | 'rejected') {
    if (!selectedSub || reviewing) return;
    setReviewing(true);
    try {
      await adminApi.reviewSubmission({
        submissionId: selectedSub.id,
        decision,
        comment: reviewComment.trim() || undefined,
      });
      pushToast({
        variant: 'success',
        title: decision === 'approved' ? 'Submission approved' : 'Submission rejected',
        description:
          decision === 'approved'
            ? 'User credited (+10% referrer commission applied) and notified via Telegram.'
            : 'User notified via Telegram.',
      });
      setReviewComment('');
      await Promise.all([loadSubmissions(), refreshAdminData()]);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Review failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setReviewing(false);
    }
  }

  const proofSource = selectedSub?.proof_signed_url || selectedSub?.proof_url || selectedSub?.proof_text || '';
  const showImagePreview =
    selectedSub &&
    !brokenImgIds[selectedSub.id] &&
    (isImageUrl(selectedSub.proof_signed_url) ||
      isImageUrl(selectedSub.proof_url) ||
      isImageUrl(selectedSub.proof_text));
  const previewImageUrl = isImageUrl(selectedSub?.proof_signed_url)
    ? selectedSub?.proof_signed_url
    : isImageUrl(selectedSub?.proof_url)
      ? selectedSub?.proof_url
      : isImageUrl(selectedSub?.proof_text)
        ? selectedSub?.proof_text
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Micro-Tasks & Proof Verification
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Publish Telegram micro-tasks, monitor slot capacity, and verify user proof submissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0F172A] p-1">
            {canReviewSubmissions ? (
              <button
                type="button"
                onClick={() => setSubTab('submissions')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  subTab === 'submissions'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Proof Submissions
              </button>
            ) : null}
            {canManageTasks ? (
              <button
                type="button"
                onClick={() => setSubTab('tasks')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  subTab === 'tasks'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Micro-Tasks
              </button>
            ) : null}
          </div>

          {canManageTasks && subTab === 'tasks' ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </button>
          ) : null}
        </div>
      </div>

      {subTab === 'tasks' && canManageTasks ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
          {tasksLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : tasks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-slate-400">No micro-tasks configured yet.</p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Task</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800/80 bg-[#0B1122] text-xs font-medium text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Task</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right">Reward</th>
                    <th className="px-5 py-3">Slot Progress</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tasks.map((task) => {
                    const max = Math.max(1, task.max_completions || 1);
                    const pct = Math.min(100, Math.round(((task.completions_count || 0) / max) * 100));
                    return (
                      <tr key={task.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-100">{task.title}</p>
                          <p className="mt-0.5 max-w-md truncate text-xs text-slate-400">
                            {task.description}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-300">{task.category}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-emerald-400">
                          {formatUsd(task.reward)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="w-40">
                            <div className="flex justify-between font-mono text-xs tabular-nums text-slate-300">
                              <span>
                                {formatNumber(task.completions_count)} /{' '}
                                {formatNumber(task.max_completions)}
                              </span>
                              <span>{pct}%</span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {task.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => void handleTaskStatus(task, 'paused')}
                                title="Pause task"
                                className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                              >
                                <Pause className="h-3 w-3" />
                                <span>Pause</span>
                              </button>
                            ) : task.status === 'paused' ? (
                              <button
                                type="button"
                                onClick={() => void handleTaskStatus(task, 'active')}
                                title="Activate task"
                                className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
                              >
                                <Play className="h-3 w-3" />
                                <span>Activate</span>
                              </button>
                            ) : null}

                            {task.status !== 'completed' && task.status !== 'archived' ? (
                              <button
                                type="button"
                                onClick={() => void handleTaskStatus(task, 'completed')}
                                title="Mark completed"
                                className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Complete</span>
                              </button>
                            ) : null}

                            {task.status !== 'archived' ? (
                              <button
                                type="button"
                                onClick={() => void handleTaskStatus(task, 'archived')}
                                title="Archive task"
                                className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-red-300"
                              >
                                <Archive className="h-3 w-3" />
                                <span>Archive</span>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0F172A] p-1">
              {(['pending', 'approved', 'rejected', 'all'] as SubmissionFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setSubFilter(f);
                    setSubPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    subFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Queue List */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A] lg:col-span-7">
              {subsLoading ? (
                <TableSkeleton rows={6} cols={4} />
              ) : submissions.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">
                  No {subFilter === 'all' ? '' : subFilter} proof submissions found.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {submissions.map((sub) => {
                    const isSelected = selectedSub?.id === sub.id;
                    const userLabel =
                      sub.username || sub.user?.username
                        ? `@${sub.username || sub.user?.username}`
                        : sub.first_name || sub.user?.first_name || 'User';
                    const taskTitle = sub.task_title || sub.task?.title || 'Micro-Task';
                    const reward = sub.task_reward ?? sub.task?.reward ?? 0;

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setSelectedSub(sub);
                          setReviewComment('');
                        }}
                        className={`flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors ${
                          isSelected ? 'bg-blue-600/10' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-100">{taskTitle}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {userLabel} · {formatDateTime(sub.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs font-semibold tabular-nums text-emerald-400">
                            {formatUsd(reward)}
                          </span>
                          <StatusBadge status={sub.status} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <Pagination
                page={subPage}
                limit={subLimit}
                total={subTotal}
                onPageChange={setSubPage}
                disabled={subsLoading}
              />
            </div>

            {/* Side-by-Side Proof Viewer */}
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-5">
              {selectedSub ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-100">
                        {selectedSub.task_title || selectedSub.task?.title || 'Proof Review'}
                      </h2>
                      <p className="mt-1 text-xs text-slate-400">
                        Submitted {formatDateTime(selectedSub.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={selectedSub.status} />
                  </div>

                  {/* Proof Media / Text */}
                  <div className="rounded-lg border border-slate-800 bg-[#070B19] p-4">
                    <p className="mb-2 text-xs font-medium text-slate-400">Submitted Proof</p>
                    {showImagePreview && previewImageUrl ? (
                      <div className="space-y-3">
                        <img
                          src={previewImageUrl}
                          alt="User task completion proof"
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenImgIds((prev) => ({ ...prev, [selectedSub.id]: true }))
                          }
                          className="max-h-72 w-full rounded-lg border border-slate-800 object-contain bg-black/40"
                        />
                        <a
                          href={previewImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Open Original Signed Image</span>
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedSub.proof_text ? (
                          <p className="whitespace-pre-wrap break-words text-sm text-slate-200">
                            {selectedSub.proof_text}
                          </p>
                        ) : null}
                        {isSafeHttpUrl(proofSource) ? (
                          <a
                            href={proofSource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span>Open Proof Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : !selectedSub.proof_text ? (
                          <p className="text-xs text-slate-500">No proof payload provided.</p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {selectedSub.status === 'pending' ? (
                    <div className="space-y-3 border-t border-slate-800/80 pt-4">
                      <div>
                        <label
                          htmlFor="submission-comment"
                          className="mb-1.5 block text-xs font-medium text-slate-300"
                        >
                          Reviewer Comment (Optional)
                        </label>
                        <textarea
                          id="submission-comment"
                          rows={2}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Verification note sent to user on rejection or approval"
                          className="w-full rounded-lg border border-slate-800 bg-[#070B19] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() => void handleReview('approved')}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          <span>{reviewing ? 'Saving...' : 'Approve & Credit'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() => void handleReview('rejected')}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          <span>Reject Proof</span>
                        </button>
                      </div>
                    </div>
                  ) : selectedSub.admin_comment ? (
                    <div className="rounded-lg border border-slate-800 bg-[#070B19] p-3 text-xs text-slate-300">
                      <span className="font-medium text-slate-400">Admin Note: </span>
                      {selectedSub.admin_comment}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-slate-500">
                  Select a submission from the queue to inspect proof details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        open={createOpen}
        title="Create Micro-Task"
        subtitle="New tasks broadcast an alert to Telegram users immediately."
        onClose={() => setCreateOpen(false)}
        busy={creating}
      >
        <form onSubmit={(e) => void handleCreateTask(e)} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="mb-1 block text-xs font-medium text-slate-300">
              Task Title
            </label>
            <input
              id="task-title"
              required
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Follow Payvora Official Channel"
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-category" className="mb-1 block text-xs font-medium text-slate-300">
                Category
              </label>
              <input
                id="task-category"
                required
                type="text"
                value={taskForm.category}
                onChange={(e) => setTaskForm((p) => ({ ...p, category: e.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="task-length" className="mb-1 block text-xs font-medium text-slate-300">
                Estimated Time
              </label>
              <input
                id="task-length"
                type="text"
                value={taskForm.jobLength}
                onChange={(e) => setTaskForm((p) => ({ ...p, jobLength: e.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-reward" className="mb-1 block text-xs font-medium text-slate-300">
                Reward (USD)
              </label>
              <input
                id="task-reward"
                required
                type="number"
                step="0.01"
                min="0.01"
                value={taskForm.reward}
                onChange={(e) => setTaskForm((p) => ({ ...p, reward: e.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="task-max" className="mb-1 block text-xs font-medium text-slate-300">
                Max Completions
              </label>
              <input
                id="task-max"
                required
                type="number"
                min="1"
                value={taskForm.maxCompletions}
                onChange={(e) => setTaskForm((p) => ({ ...p, maxCompletions: e.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-url" className="mb-1 block text-xs font-medium text-slate-300">
              Target URL
            </label>
            <input
              id="task-url"
              required
              type="url"
              value={taskForm.targetUrl}
              onChange={(e) => setTaskForm((p) => ({ ...p, targetUrl: e.target.value }))}
              placeholder="https://t.me/payvora"
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-desc" className="mb-1 block text-xs font-medium text-slate-300">
              Description
            </label>
            <textarea
              id="task-desc"
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-slate-800 bg-[#070B19] p-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-proof" className="mb-1 block text-xs font-medium text-slate-300">
              Proof Instructions
            </label>
            <input
              id="task-proof"
              type="text"
              value={taskForm.proofInstructions}
              onChange={(e) => setTaskForm((p) => ({ ...p, proofInstructions: e.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={creating}
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {creating ? 'Publishing...' : 'Publish Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
