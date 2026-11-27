import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE_CONFIG } from "@/constants/site-config";
import { signOutAction } from "./(auth)/actions";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: SITE_CONFIG.name, template: `%s · ${SITE_CONFIG.name}` },
  description: SITE_CONFIG.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader signOutAction={signOutAction} />
        {children}
      </body>
    </html>
  );
}
