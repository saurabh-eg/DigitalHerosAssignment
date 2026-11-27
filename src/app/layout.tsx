import type { Metadata } from "next";
import { IBM_Plex_Sans, Jost } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE_CONFIG } from "@/constants/site-config";
import { signOutAction } from "./(auth)/actions";
import "./globals.css";

const jost = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["500", "600", "700"] });
const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: SITE_CONFIG.name, template: `%s · ${SITE_CONFIG.name}` },
  description: SITE_CONFIG.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${jost.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader signOutAction={signOutAction} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
