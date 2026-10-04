import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Budget Worker",
    short_name: "Budget Worker",
    description: "Find nearby home help, compare free profiles and unlock resumes",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#075caf",
    icons: [{
      src: "/images/brand/budgetworker-logo.png",
      sizes: "1254x1254",
      type: "image/png",
      purpose: "any",
    }],
  };
}
