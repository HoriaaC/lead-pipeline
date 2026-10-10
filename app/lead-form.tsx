"use client";

import { useActionState } from "react";
import styles from "./page.module.css";

const FIELDS = ["name", "email", "phone", "company", "message"] as const;
type Field = (typeof FIELDS)[number];

type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<Field, string[]>>;
  // React 19 resets uncontrolled inputs after a form action; we hand the
  // submitted values back as defaultValue so a validation error doesn't wipe them.
  values?: Partial<Record<Field, string>>;
};

async function submitLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const values: Partial<Record<Field, string>> = {};
  for (const f of FIELDS) values[f] = String(formData.get(f) ?? "");

  const source = new URLSearchParams(window.location.search).get("utm_source") ?? undefined;

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, source }),
    });
    if (res.status === 201) {
      return { status: "success", message: "Thanks! We'll be in touch soon." };
    }
    const data = await res.json().catch(() => ({}));
    return {
      status: "error",
      message: res.status === 400 ? "Please fix the highlighted fields." : "Something went wrong. Please try again.",
      fieldErrors: data.fields,
      values,
    };
  } catch {
    return { status: "error", message: "Network error. Please try again.", values };
  }
}

export function LeadForm() {
  const [state, formAction, pending] = useActionState(submitLead, { status: "idle" });

  if (state.status === "success") {
    return <p className={styles.success}>{state.message}</p>;
  }

  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className={styles.form} noValidate>
      <label>
        Name *
        <input name="name" defaultValue={v.name} required aria-invalid={!!err.name} />
        {err.name && <span className={styles.error}>{err.name[0]}</span>}
      </label>
      <label>
        Email *
        <input name="email" type="email" defaultValue={v.email} required aria-invalid={!!err.email} />
        {err.email && <span className={styles.error}>{err.email[0]}</span>}
      </label>
      <label>
        Phone
        <input name="phone" type="tel" defaultValue={v.phone} />
        {err.phone && <span className={styles.error}>{err.phone[0]}</span>}
      </label>
      <label>
        Company
        <input name="company" defaultValue={v.company} />
        {err.company && <span className={styles.error}>{err.company[0]}</span>}
      </label>
      <label>
        Message
        <textarea name="message" rows={4} defaultValue={v.message} />
        {err.message && <span className={styles.error}>{err.message[0]}</span>}
      </label>

      {state.status === "error" && <p className={styles.error}>{state.message}</p>}

      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
