"use client";

import { useTransition } from "react";
import { deleteCard, disableCard, reactivateCard } from "./actions";

type AdminCardActionsProps = {
  cardId: string;
  status: string;
  userId: string | null;
};

export function AdminCardActions({ cardId, status, userId }: AdminCardActionsProps) {
  const [pending, startTransition] = useTransition();
  const isDisabled = status === "lost" || status === "replaced";
  const toggleLabel = isDisabled ? "reactivate" : "disable";
  const deleteMessage = userId
    ? "Delete this card from admin? The row will be removed and any paired owner reference will be cleared with it."
    : "Delete this card from admin? The row will be removed permanently.";

  function submit(action: (formData: FormData) => Promise<unknown>, needsConfirm = false) {
    if (needsConfirm && !window.confirm(deleteMessage)) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", cardId);
      await action(formData);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
      <button
        className="text-gold hover:underline disabled:cursor-wait disabled:opacity-60"
        type="button"
        onClick={() => submit(isDisabled ? reactivateCard : disableCard)}
        disabled={pending}
        data-testid={`admin-card-toggle-${cardId}`}
      >
        {pending ? "saving..." : toggleLabel}
      </button>
      <button
        className="text-red-400 hover:underline disabled:cursor-wait disabled:opacity-60"
        type="button"
        onClick={() => submit(deleteCard, true)}
        disabled={pending}
        data-testid={`admin-card-delete-${cardId}`}
      >
        {pending ? "working..." : "delete"}
      </button>
    </div>
  );
}