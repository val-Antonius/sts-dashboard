import { redirect } from 'next/navigation';

export default function CaseOverviewRedirect() {
  redirect('/operations/active-case');
}
