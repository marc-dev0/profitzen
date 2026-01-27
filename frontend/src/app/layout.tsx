import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/toast";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Profitzen - Sistema de Ventas",
  description: "Sistema de gestión de ventas para tiendas peruanas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        <QueryProvider>
          {children}
          <ToastProvider />
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
