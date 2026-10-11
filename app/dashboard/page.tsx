import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isAuthorized } from "@/lib/basic-auth";
import { listLatestLeads } from "@/lib/leads";
import styles from "./dashboard.module.css";
import { LogoutButton } from "./logout-button";

export const metadata = { title: "Leads dashboard", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Bucharest",
});

export default function DashboardPage() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Latest leads</h1>
        <LogoutButton />
      </div>
      {/* cacheComponents: request-time data (headers, DB) must sit inside Suspense. */}
      <Suspense fallback={<p className={styles.muted}>Loading…</p>}>
        <LeadsTable />
      </Suspense>
    </main>
  );
}

async function LeadsTable() {
  // Second auth check, independent of proxy.ts (defence in depth).
  if (!isAuthorized((await headers()).get("authorization"))) notFound();

  const leads = await listLatestLeads(50);
  if (leads.length === 0) return <p className={styles.muted}>No leads yet.</p>;

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Received</th>
            <th>Name</th>
            <th>Email</th>
            <th>Company</th>
            <th>Source</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td className={styles.nowrap}>{dateFormat.format(l.created_at)}</td>
              <td>{l.name}</td>
              <td>
                <a href={`mailto:${l.email}`}>{l.email}</a>
              </td>
              <td>{l.company ?? "—"}</td>
              <td>{l.source}</td>
              <td>
                <span className={styles.status} data-status={l.status}>
                  {l.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
