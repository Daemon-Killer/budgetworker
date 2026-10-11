import Link from "next/link";
import styles from "./WorkerForms.module.css";

export function WorkerForms() {
  return <section id="work-with-us" className={styles.section} aria-label="Worker registration and referral / काम के लिए पंजीकरण और रेफरेंस">
    <div className={styles.tabs}>
      <Link href="/register-for-work"><span>Register for Work</span><span lang="hi">काम के लिए पंजीकरण</span></Link>
      <Link href="/refer-a-worker"><span>Refer a Worker</span><span lang="hi">कर्मचारी का रेफरेंस दें</span></Link>
    </div>
  </section>;
}
