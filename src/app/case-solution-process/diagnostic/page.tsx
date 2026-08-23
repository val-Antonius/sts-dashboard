import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function DiagnosticRedirect({ searchParams }: PageProps) {
  const { id } = await searchParams;
  if (id) {
    redirect(`/operations/diagnostic?id=${id}`);
  } else {
    redirect('/operations/diagnostic');
  }
}
