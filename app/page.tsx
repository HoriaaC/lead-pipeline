import { LeadForm } from "./lead-form";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Get in touch</h1>
      <p className={styles.intro}>Tell us about your project and we&apos;ll get back to you within one business day.</p>
      <LeadForm />
    </main>
  );
}
