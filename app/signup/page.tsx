import { SignupForm } from '@/components/signup-form';

interface SignupPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
	const query = await searchParams;
	const from = getQueryValue(query.from);

	return (
		<main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
			<SignupForm from={from} />
		</main>
	);
}

function getQueryValue(value: string | string[] | undefined): string {
	if (Array.isArray(value)) return value[0] ?? '';
	return value ?? '';
}
