export default function PlotDetailPage({ params }: { params: { id: string } }) {
  return <div className="mx-auto max-w-md p-4"><h1 className="text-xl font-bold">Plot {params.id}</h1></div>;
}
