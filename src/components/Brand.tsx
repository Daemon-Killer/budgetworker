import Image from "next/image";
import Link from "next/link";
import styles from "./Brand.module.css";

export function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="Budget Worker home">
      <span className={styles.mark} aria-hidden="true">
        <Image
          src="/images/brand/budgetworker-logo.png"
          alt=""
          width={88}
          height={88}
          sizes="88px"
          className={styles.image}
        />
      </span>
      <span className={styles.name}>Budget<span>Worker</span></span>
    </Link>
  );
}
