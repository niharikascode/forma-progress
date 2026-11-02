import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Forma — Make meaningful progress",
  description:
    "An intentional workspace for your projects, daily focus, and meaningful outputs.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
