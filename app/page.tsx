import { AirWiseApp } from '@/components/AirWiseApp';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

/**
 * Root Server Component assembling semantic landmarks and the AirWise client workspace.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">
        <AirWiseApp />
      </div>
      <Footer />
    </div>
  );
}
