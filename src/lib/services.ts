import type { EmploymentType, WorkerCategory } from "./constants";

export type ServiceCard = {
  slug: string;
  category: WorkerCategory;
  employmentType?: EmploymentType;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  imageFit?: "contain" | "cover";
};

const services: ServiceCard[] = [
  {
    slug: "domestic-help",
    category: "HOUSEKEEPING",
    title: "Domestic Help",
    description: "Cleaning, tidying and everyday household upkeep.",
    image: "/images/services/housekeeping.png",
    imageAlt: "Budget Worker housekeeper cleaning a family home",
  },
  {
    slug: "all-round-home-help",
    category: "ALLROUNDER",
    title: "All-round home help",
    description: "Cooking and housekeeping support from one helper.",
    image: "/images/services/all-rounder.png",
    imageAlt: "Budget Worker all-round home support for housekeeping and cooking",
  },
  {
    slug: "babycare",
    category: "BABYCARE",
    title: "Babycare",
    description: "Help with playtime, routines and day-to-day child care.",
    image: "/images/services/childcare.png",
    imageAlt: "Budget Worker caregiver playing with a child at home",
  },
  {
    slug: "japa-care",
    category: "JAPA",
    title: "Newborn & mother care (Japa Care)",
    description: "Japa and postnatal support for mothers and newborns.",
    image: "/images/services/newborn-care.png",
    imageAlt: "Budget Worker caregiver supporting a mother and her newborn",
  },
];

const liveInServices: ServiceCard[] = services.map((service) => ({
  ...service,
  slug: `24-hours-live-in-${service.slug}`,
  title: `24 hours Live-in ${service.title}`,
  employmentType: "LIVE_IN",
}));

export const SERVICES: ServiceCard[] = [...services, ...liveInServices];
