import { BottomNav } from "@/components/campo/bottom-nav";
import { Header } from "@/components/campo/header";
import { ServiceWorkerRegistrator } from "@/components/pwa/service-worker-registrator";

export default function CampoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-4 md:px-8 md:py-6">
        {children}
      </main>
      <BottomNav />
      <ServiceWorkerRegistrator />
    </div>
  );
}
