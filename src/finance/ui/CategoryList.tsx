// UI: Листа категорија — chip картице, accordion по типу (само Admin може мењати).

import { useState } from "react";
import {
  createCategory,
  updateCategory,
} from "@finance/infrastructure/CategoryRepository";
import { useCategoryList } from "@finance/application/useCategoryList";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import type { Category, RecordType } from "@finance/domain/Category";
import type { Role } from "@identity/domain/User";

interface Props {
  role: Role;
}

const MAX_NAME_LENGTH = 40;

const TYPE_SECTIONS: { type: RecordType; label: string; accent: string }[] = [
  { type: "Приход", label: "Приходи",  accent: "income" },
  { type: "Расход", label: "Расходи",  accent: "expense" },
];

export function CategoryList({ role }: Props) {
  const categories = useCategoryList();
  const isAdmin    = role === "Admin";

  const [newName,    setNewName]    = useState("");
  const [newType,    setNewType]    = useState<RecordType>("Приход");
  const [formError,  setFormError]  = useState("");
  const [formOpen,   setFormOpen]   = useState(false);

  const [editId,   setEditId]   = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [pendingDeactivate, setPendingDeactivate] = useState<Category | null>(null);

  const [busy,        setBusy]        = useState(false);
  const [actionError, setActionError] = useState("");

  /** Враћа поруку о грешци или "" ако је назив валидан (дупликат се проверава по типу, без разлике у величини слова). */
  function validateName(name: string, type: RecordType, excludeId?: string): string {
    if (!name) return "Назив је обавезан.";
    if (name.length > MAX_NAME_LENGTH) return `Назив може имати највише ${MAX_NAME_LENGTH} знакова.`;
    const key = name.toLocaleLowerCase("sr");
    const duplicate = categories.some(
      (c) => c.id !== excludeId && c.type === type && c.name.trim().toLocaleLowerCase("sr") === key
    );
    return duplicate ? "Категорија са тим називом већ постоји." : "";
  }

  /** Једна тачка за in-flight стање и хватање грешака; спречава двоструки клик. */
  async function run(action: () => Promise<void>): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setActionError("");
    try {
      await action();
      return true;
    } catch {
      setActionError("Операција није успела. Покушајте поново.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    const trimmed = newName.trim();
    const error = validateName(trimmed, newType);
    if (error) { setFormError(error); return; }
    setFormError("");
    const ok = await run(async () => {
      await createCategory({ name: trimmed, type: newType, active: true, system: false });
    });
    if (ok) {
      setNewName("");
      setFormOpen(false);
    }
  }

  async function confirmDeactivate() {
    if (!pendingDeactivate) return;
    const target = pendingDeactivate;
    const ok = await run(() => updateCategory(target.id, { active: false }));
    if (ok) setPendingDeactivate(null);
  }

  async function handleReactivate(cat: Category) {
    await run(() => updateCategory(cat.id, { active: true }));
  }

  async function handleEditSave(cat: Category) {
    const trimmed = editName.trim();
    const error = validateName(trimmed, cat.type, cat.id);
    if (error) { setActionError(error); return; }
    if (trimmed === cat.name) { setEditId(null); return; }
    const ok = await run(() => updateCategory(cat.id, { name: trimmed }));
    if (ok) setEditId(null);
  }

  return (
    <div className="cat-root">

      {actionError && <p className="error-text" role="alert">{actionError}</p>}

      {/* ── Accordion по типу ── */}
      {TYPE_SECTIONS.map(({ type, label, accent }) => {
        const list = categories.filter((c) => c.type === type);
        return (
          <details key={type} className="cat-section" open>
            <summary className="cat-section-header">
              <span className={`cat-section-dot ${accent}-dot`} />
              <span className="cat-section-label">{label}</span>
              <span className="cat-section-count">{list.filter((c) => c.active).length}</span>
            </summary>

            <div className="cat-chip-grid">
              {list.map((cat) => (
                <div
                  key={cat.id}
                  className={`cat-chip ${accent} ${cat.active ? "" : "inactive"}`}
                >
                  {isAdmin && editId === cat.id ? (
                    <div className="cat-chip-edit">
                      <input
                        className="cat-chip-input"
                        value={editName}
                        autoFocus
                        maxLength={MAX_NAME_LENGTH}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")  handleEditSave(cat);
                          if (e.key === "Escape") setEditId(null);
                        }}
                      />
                      <button className="chip-action-btn" disabled={busy} onClick={() => handleEditSave(cat)}>✓</button>
                      <button className="chip-action-btn" disabled={busy} onClick={() => setEditId(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="cat-chip-view">
                      <span className="cat-chip-name">{cat.name}</span>
                      {!cat.active && <span className="cat-chip-badge">неактивна</span>}
                      {isAdmin && !cat.system && !cat.active && (
                        <div className="cat-chip-actions">
                          <button
                            className="chip-action-btn"
                            title="Поново активирај"
                            disabled={busy}
                            onClick={() => handleReactivate(cat)}
                          >↺</button>
                        </div>
                      )}
                      {isAdmin && !cat.system && cat.active && (
                        <div className="cat-chip-actions">
                          <button
                            className="chip-action-btn"
                            title="Уреди"
                            onClick={() => { setEditId(cat.id); setEditName(cat.name); }}
                          >✎</button>
                          <button
                            className="chip-action-btn danger"
                            title="Деактивирај"
                            onClick={() => setPendingDeactivate(cat)}
                          >✕</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        );
      })}

      {/* ── Нова категорија (само Admin) ── */}
      {isAdmin && (
        <div className="card">
          <button
            className={`form-toggle ${formOpen ? "open" : ""}`}
            onClick={() => setFormOpen((v) => !v)}
          >
            <span>{formOpen ? "✕  Затвори" : "+ Нова категорија"}</span>
          </button>

          {formOpen && (
            <div className="cat-form">
              <div className="form-type-row">
                {(["Приход", "Расход"] as RecordType[]).map((t) => (
                  <button
                    key={t}
                    className={`type-btn ${newType === t ? (t === "Приход" ? "income-active" : "expense-active") : ""}`}
                    onClick={() => setNewType(t)}
                  >
                    {t === "Приход" ? "↑ Приход" : "↓ Расход"}
                  </button>
                ))}
              </div>
              <div className="form-field">
                <label className="field-label">Назив категорије</label>
                <input
                  placeholder="Нпр. Закупнина"
                  value={newName}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                />
              </div>
              {formError && <p className="error-text">{formError}</p>}
              <div className="form-actions">
                <button className="primary" disabled={busy} onClick={handleCreate}>Додај</button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title={`Деактивирај „${pendingDeactivate?.name ?? ""}“?`}
        message="Категорија више неће бити понуђена при уносу нових записа. Постојећи записи остају нетакнути — ово не брише историју."
        confirmLabel="Деактивирај"
        onConfirm={confirmDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />

    </div>
  );
}
