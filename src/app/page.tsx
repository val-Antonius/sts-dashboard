import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/operations/active-case');
}
