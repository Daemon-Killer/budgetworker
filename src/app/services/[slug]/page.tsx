import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import serviceVideos from "@/lib/service-videos.json";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES.find((item) => item.slug === slug);
  if (!service) notFound();

  return {
    title: `${service.title} | BudgetWorker`,
    description: service.description,
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = SERVICES.find((item) => item.slug === slug);
  if (!service) notFound();

  const video = serviceVideos.find((item) => item.category === service.category);
  if (!video) notFound();


  return (
    <section className={styles.page} aria-labelledby="service-page-heading">
      <Link href="/services" className={styles.back}>← All services</Link>
      <div className={styles.layout}>
        <div className={styles.service}>
          <article className={styles.card} aria-labelledby="service-page-heading">
            {service.image && (
              <div className={styles.image}>
                <Image
                  src={service.image}
                  alt={service.imageAlt ?? ""}
                  fill
                  sizes="(max-width: 640px) 300px, 280px"
                  style={{ objectFit: service.imageFit ?? "contain", objectPosition: service.imagePosition ?? "center" }}
                />
              </div>
            )}
            <div className={styles.copy}>
              <h1 id="service-page-heading">{service.title}</h1>
              <p>{service.description}</p>
            </div>
          </article>
          <Link href={`/services/${service.slug}/book`} className={`bw-button ${styles.bookNow}`} prefetch={false}>
            Book Now
          </Link>
        </div>
        <section className={styles.videoPanel} aria-labelledby="service-video-heading">
          <h2 id="service-video-heading">See what’s included</h2>
          <video
            className={styles.video}
            aria-label={`${service.title} service video`}
            controls
            playsInline
            preload="none"
            poster={`/videos/services/${service.slug}.webp`}
            width={768}
            height={432}
          >
            <source src={`/videos/services/${service.slug}.mp4`} type="video/mp4" />
            <track kind="captions" src={`/videos/services/${service.slug}.vtt`} srcLang="en" label="English" />
            <p>Your browser cannot play this video. <a href={`/videos/services/${service.slug}.mp4`}>Watch the service video</a>.</p>
          </video>
          <ul className={styles.tasks} aria-label={`${service.title} tasks`}>
            {video.tasks.map((task) => <li key={task.label}>{task.label}</li>)}
          </ul>
        </section>
      </div>
    </section>
  );
}
