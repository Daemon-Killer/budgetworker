import { DEFAULT_SETTINGS, getSettings } from "@/lib/marketplace";
import { ServiceCards } from "@/components/directory/ServiceCards";
import { PricingIntro } from "@/components/home/PricingIntro";
import { WorkerForms } from "@/components/home/WorkerForms";
import { Locations } from "@/components/home/Locations";
import { SERVICES } from "@/lib/services";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, s] = await Promise.all([searchParams, getSettings()]);
  return (
    <div className="bw-home-directory">
      <PricingIntro />
      <section className="bw-directory-hero">
        <div>
          <h1>{s.headline === "Good help. Close to home." ? DEFAULT_SETTINGS.headline : s.headline}</h1>
        </div>
      </section>
      <ServiceCards services={SERVICES} params={params} />
      <Locations />
      <WorkerForms />
    </div>
  );
}
