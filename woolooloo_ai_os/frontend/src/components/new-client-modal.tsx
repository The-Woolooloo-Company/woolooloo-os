"use client";

import { useState } from "react";
import type { Client } from "@/lib/clients";

const GRADIENT_COLORS = ["primary", "info", "success", "warning", "dark", "danger"];

type NewClientData = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projects'>;

export function NewClientModal({ onClose, onSave }: { onClose: () => void; onSave: (client: NewClientData) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("primary");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const client: NewClientData = {
      name: name.trim(),
      color,
      notes: notes.trim() || undefined,
    };
    onSave(client);
  };

  return (
    <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-radius-xl">
          <div className="modal-header border-0">
            <h5 className="modal-title font-weight-bolder">
              <i className="material-symbols-rounded me-2">person_add</i>
              Add New Client
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label text-sm font-weight-bold">Client Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Netsweeper"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label text-sm font-weight-bold">Card Color</label>
                <div className="d-flex gap-2">
                  {GRADIENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`btn btn-sm btn-outline-secondary ${color === c ? "active" : ""}`}
                      onClick={() => setColor(c)}
                    >
                      <span className={`badge bg-gradient-${c}`}>Aa</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label text-sm font-weight-bold">Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this client..."
                />
              </div>
            </div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-outline-dark" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn bg-gradient-primary">
                <i className="material-symbols-rounded me-1">add</i>
                Add Client
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
