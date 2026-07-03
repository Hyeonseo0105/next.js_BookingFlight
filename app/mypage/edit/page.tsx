import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { EditProfileForm } from '@/components/edit-profile-form';

export default async function EditProfilePage() {
	const user = await getCurrentUser();
	if (!user) redirect('/login');

	return (
		<main className="min-h-screen bg-muted/30 px-4 py-8 text-foreground sm:px-6 lg:px-8">
			<section className="mx-auto flex w-full max-w-lg flex-col gap-6">
				<div className="space-y-2">
					<Link
						className={buttonVariants({ className: 'mb-2 w-fit', size: 'sm', variant: 'ghost' })}
						href="/mypage"
					>
						<ArrowLeft aria-hidden="true" className="size-4" />
						My Page
					</Link>
					<p className="text-sm font-medium text-muted-foreground">My account</p>
					<h1 className="text-3xl font-semibold tracking-normal">Edit Profile</h1>
				</div>

				<Card className="overflow-hidden">
					<CardHeader className="border-b bg-background p-6">
						<CardTitle className="text-lg">{user.name}</CardTitle>
					</CardHeader>
					<CardContent className="p-6">
						<EditProfileForm initialName={user.name ?? ''} />
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
