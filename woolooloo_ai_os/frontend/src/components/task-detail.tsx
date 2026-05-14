'use client';

import Link from 'next/link';
import { LinearTask } from '@/lib/linear';
import { getPriorityLabel, getStatusColor, getPriorityColor } from '@/lib/linear';

interface TaskDetailProps {
  task: LinearTask | null;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  if (!task) return null;

  const priorityLabel = getPriorityLabel(task.priority);
  const priorityColor = getPriorityColor(task.priority);
  const statusColor = getStatusColor(task.state.type);
  const linearUrl = `https://linear.app/issue/${task.id}`;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-radius-xl shadow-lg">
          {/* Header */}
          <div className="modal-header border-0 pb-0">
            <div className="w-100 d-flex justify-content-between align-items-start">
              <div>
                <span className={`badge ${priorityColor} me-2`}>{priorityLabel}</span>
                <span className={`badge ${statusColor}`}>{task.state.name}</span>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <h5 className="modal-title font-weight-bolder mt-2">{task.title}</h5>
          </div>

          <div className="modal-body">
            <div className="row">
              {/* Main Content */}
              <div className="col-lg-8">
                {/* Description */}
                <div className="card shadow-sm border-radius-xl mb-4">
                  <div className="card-header pb-0">
                    <h6 className="font-weight-bolder">
                      <i className="material-symbols-rounded me-2">description</i>
                      Description
                    </h6>
                  </div>
                  <div className="card-body">
                    {task.description ? (
                      <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {task.description}
                      </div>
                    ) : (
                      <p className="text-secondary text-sm">No description provided</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="col-lg-4">
                <div className="card shadow-sm border-radius-xl mb-4">
                  <div className="card-header pb-0">
                    <h6 className="font-weight-bolder">
                      <i className="material-symbols-rounded me-2">info</i>
                      Details
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="text-xs text-uppercase text-secondary font-weight-bolder">Assignee</label>
                      <p className="mb-0">
                        {task.assigneeName ? (
                          <Link href={`/staff?search=${encodeURIComponent(task.assigneeName)}`} className="text-primary text-decoration-none">
                            <i className="material-symbols-rounded me-1" style={{ fontSize: '14px' }}>person</i>
                            {task.assigneeName}
                          </Link>
                        ) : (
                          <span className="text-secondary">Unassigned</span>
                        )}
                      </p>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-uppercase text-secondary font-weight-bolder">Project</label>
                      <p className="mb-0">
                        <Link href={`/tasks?projectId=${task.projectId}`} className="text-primary text-decoration-none">
                          <i className="material-symbols-rounded me-1" style={{ fontSize: '14px' }}>folder</i>
                          {task.projectKey}: {task.projectTitle}
                        </Link>
                      </p>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-uppercase text-secondary font-weight-bolder">Priority</label>
                      <p className="mb-0"><span className={`badge ${priorityColor}`}>{priorityLabel}</span></p>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-uppercase text-secondary font-weight-bolder">Status</label>
                      <p className="mb-0"><span className={`badge ${statusColor}`}>{task.state.name}</span></p>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-uppercase text-secondary font-weight-bolder">Created</label>
                      <p className="mb-0 text-sm text-secondary">{new Date(task.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="mb-0">
                      <label className="text-xs text-uppercase text-secondary font-weight-bolder">Updated</label>
                      <p className="mb-0 text-sm text-secondary">{new Date(task.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* External Links */}
                <div className="card shadow-sm border-radius-xl">
                  <div className="card-header pb-0">
                    <h6 className="font-weight-bolder">
                      <i className="material-symbols-rounded me-2">open_in_new</i>
                      Links
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="d-grid gap-2">
                      <a href={linearUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-dark">
                        <i className="material-symbols-rounded me-1">edit_note</i>
                        Open in Linear
                      </a>
                      <Link href={`/time-tracking?linearTaskId=${task.id}`} className="btn btn-sm btn-outline-dark">
                        <i className="material-symbols-rounded me-1">schedule</i>
                        View Time Entries
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer border-0">
            <button type="button" className="btn btn-outline-dark" onClick={onClose}>Close</button>
            <a href={linearUrl} target="_blank" rel="noreferrer" className="btn bg-gradient-primary">
              <i className="material-symbols-rounded me-1">open_in_new</i>
              Edit in Linear
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
