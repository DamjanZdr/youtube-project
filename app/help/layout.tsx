import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center | Blueprint",
  description: "Get help with Blueprint - guides, tutorials, and support",
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
