import Image from "next/image";
import { DirectoryPage } from "@/components/directory/DirectoryPage";
import { getSettings } from "@/lib/marketplace";
import { ServiceCards, type ServiceCard } from "@/components/directory/ServiceCards";

const services: ServiceCard[] = [
  {
    category: "HOUSEKEEPING",
    title: "Housekeeping",
    description: "Cleaning, tidying and everyday household upkeep.",
    image: "/images/services/housekeeping.png",
    imageAlt: "Budget Worker housekeeper cleaning a family home",
  },
  {
    category: "ALLROUNDER",
    title: "All-round home help",
    description: "Cooking and housekeeping support from one helper.",
    image: "/images/services/all-rounder.png",
    imageAlt: "Budget Worker all-round home support for housekeeping and cooking",
  },
  {
    category: "BABYCARE",
    title: "Childcare",
    description: "Help with playtime, routines and day-to-day child care.",
    image: "/images/services/childcare.png",
    imageAlt: "Budget Worker caregiver playing with a child at home",
  },
  {
    category: "JAPA",
    title: "Newborn & mother care",
    description: "Japa and postnatal support for mothers and newborns.",
    image: "/images/services/newborn-care.png",
    imageAlt: "Budget Worker caregiver supporting a mother and her newborn",
  },
  {
    category: "ELDERCARE",
    title: "Eldercare",
    description: "Companionship and help with everyday activities at home.",
    image: "/images/services/eldercare.png",
    imageAlt: "Budget Worker caregiver offering companionship to an older adult",
  },
  {
    category: "COOK",
    title: "Cooking",
    description: "Home cooks for daily meals and your family's food preferences.",
    image: "/images/home/woman-cooking.jpg",
    imageAlt: "Home cook preparing a meal",
    imageFit: "cover",
  },
];
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, s] = await Promise.all([searchParams, getSettings()]);
  return (
    <div className="bw-home-directory">
      <section className="bw-directory-hero">
        <div>
          <p className="bw-eyebrow">A LITTLE HELP. A HAPPIER HOME.</p>
          <h1>{s.headline}</h1>
          <p>{s.description}</p>
          <div className="bw-actions">
            <a href="#services" className="bw-button">Choose a service ↓</a>
            <a href="#profiles" className="bw-button secondary">Browse profiles</a>
          </div>
          <small>
            Free profiles · Clear expectations · Resume packs from ₹199
          </small>
        </div>
        <div className="bw-directory-photo">
          <Image
            src="/images/services/childcare.png"
            alt="Budget Worker caregiver playing with a child at home"
            fill
            sizes="(max-width:760px) 100vw,40vw"
            preload
            className="object-contain"
          />
        </div>
      </section>
      <ServiceCards services={services} params={params} />
      <div id="profiles">
        <DirectoryPage params={params} />
      </div>
      <section className="bw-how">
        <div>
          <p className="bw-eyebrow">SIMPLE FROM THE START</p>
          <h2>Find. Compare. Connect.</h2>
        </div>
        <ol>
          {[
            [
              "01",
              "Choose your criteria",
              "Use your location or choose an area, then set the type of help, hours and budget.",
            ],
            [
              "02",
              "Explore worker profiles",
              "Compare skills, experience, availability and expected pay for free.",
            ],
            [
              "03",
              "Unlock the right resumes",
              "Choose an existing resume plan. Each credit unlocks one worker’s resume; repeat downloads are free.",
            ],
          ].map(([n, title, body]) => (
            <li key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
