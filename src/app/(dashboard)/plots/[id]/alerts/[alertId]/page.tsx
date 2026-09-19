export default function PlotAlertPage({ params }: { params: { id: string; alertId: string } }) {
  return <div className="mx-auto max-w-md p-4"><h1 className="text-xl font-bold">Plot {params.id} — Alert {params.alertId}</h1></div>;
}
