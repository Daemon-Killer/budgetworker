import { DirectoryPage } from "@/components/directory/DirectoryPage";
export const dynamic = "force-dynamic";
export default async function Workers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DirectoryPage params={await searchParams} />;
}
