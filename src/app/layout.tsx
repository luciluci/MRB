import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GET MR B · Local delivery demo",
  description: "An interactive demonstration of local shopping and delivery.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
