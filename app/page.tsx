import { LeadForm } from "./lead-form";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Plain <a>, not next/link: Link navigates via fetch(), which gets the 401 but never
          shows the browser's Basic Auth prompt. A full page load does. */}
      <a href="/dashboard" className={styles.login}>
        Log in
      </a>
      <h1>Get in touch</h1>
      <p className={styles.intro}>Tell us about your project and we&apos;ll get back to you within one business day.</p>
      <LeadForm />
    </main>
  );
}
