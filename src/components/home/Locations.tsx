import Image from "next/image";
import { LOCATIONS } from "@/lib/locations";
import styles from "./Locations.module.css";

export function Locations() {
  return (
    <section id="locations" className={styles.section} aria-labelledby="locations-heading">
      <h2 id="locations-heading">Serving Across India</h2>
      <ul className={styles.grid} aria-label="Locations we serve">
        {LOCATIONS.map((location) => (
          <li key={location.name} className={styles.card}>
            <div className={styles.sketch}>
              <Image
                src="/images/locations/city-sketches.png"
                alt={location.imageAlt}
                width={1024}
                height={1024}
                sizes="(max-width: 599px) 216px, 264px"
                className={styles.sketchImage}
                style={{ left: `${-location.sketchColumn * 100}%`, top: `${-location.sketchRow * 100}%` }}
              />
            </div>
            <h3>{location.name}</h3>
          </li>
        ))}
      </ul>
    </section>
  );
}
