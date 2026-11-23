/**
 * @fileoverview Root Next.js App Router entry page assembling the AirWise header,
 * client workspace, and footer inside semantic landmarks.
 */

import { AirWiseApp } from '@/components/AirWiseApp';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

/**
 * Root Server Component assembling semantic landmarks and the AirWise client workspace.
 *
 * @returns Full AirWise landing and interactive workspace page.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col" suppressHydrationWarning>
      <Header />
      <div className="flex-1">
        <AirWiseApp />
      </div>
      <Footer />
    </div>
  );
}
