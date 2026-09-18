import { BottomNav } from "@/components/campo/bottom-nav";
import { Header } from "@/components/campo/header";
import { ServiceWorkerRegistrator } from "@/components/pwa/service-worker-registrator";

export default function CampoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-5 pt-4">
        {children}
      </main>
      <BottomNav />
      <ServiceWorkerRegistrator />
    </div>
  );
}