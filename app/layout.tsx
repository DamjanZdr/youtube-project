import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "myBlueprint",
  description: "The all-in-one creator operating system for YouTube creators",
};

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased custom-scrollbar`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <Providers>
            {children}
          </Providers>
          <Toaster 
            position="bottom-center" 
            toastOptions={{
              unstyled: true,
              classNames: {
                toast: 'glass-card flex items-center justify-center gap-3 p-4 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-2xl bg-white/5 animate-in slide-in-from-bottom-5',
                title: 'text-sm font-medium text-center',
                description: 'text-sm text-muted-foreground text-center',
                success: 'border-green-500/30 bg-gradient-to-br from-green-500/15 to-green-500/5',
                error: 'border-red-500/30 bg-gradient-to-br from-red-500/15 to-red-500/5',
                warning: 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 to-yellow-500/5',
                info: 'border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-blue-500/5',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
