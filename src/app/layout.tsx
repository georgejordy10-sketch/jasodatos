import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap'});

export const metadata: Metadata = {
  title: {
    default: 'JasoDatos – Dashboard',
    template: '%s | JasoDatos',
  },
  description: 'Carga y análisis de CSV con KPIs, tendencias y visualizaciones para toma de decisiones.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
  },
  applicationName: 'JasoDatos',
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* ⬇️ Volvemos al fondo claro y tipografía gris oscuro */}
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-800`}>
        {children}
      </body>
    </html>
  );
}
