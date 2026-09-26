import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ApolloProviderWrapper } from '@/components/ApolloProviderWrapper';
import { CartProvider } from '@/components/CartProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Afirmative Pill - E-Commerce Farmacéutico',
  description: 'Plataforma e-commerce farmacéutica con GraphQL + CQRS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ApolloProviderWrapper>
          <CartProvider>
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <Footer />
          </CartProvider>
        </ApolloProviderWrapper>
      </body>
    </html>
  );
}
