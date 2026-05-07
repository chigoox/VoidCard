"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction } from "./actions";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function onDelete() {
    start(async () => {
      await deleteProductAction(id);
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (!confirmOpen) {
    return (
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="btn-ghost px-2 py-1 text-xs text-red-200 hover:text-red-100"
        data-testid={`delete-product-${id}`}
      >
        Delete
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-ivory-mute">Delete &ldquo;{name}&rdquo;?</span>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="btn-ghost px-2 py-1 text-xs text-red-200 hover:text-red-100"
        data-testid={`delete-product-confirm-${id}`}
      >
        {pending ? "Deleting…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(false)}
        disabled={pending}
        className="btn-ghost px-2 py-1 text-xs"
      >
        Cancel
      </button>
    </span>
  );
}
