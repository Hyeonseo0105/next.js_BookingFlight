'use client';

import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';
import { useActionState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { login } from '@/app/actions/auth';

interface LoginFormProps {
	from: string;
}

export function LoginForm({ from }: LoginFormProps) {
	const [state, formAction, pending] = useActionState(login, undefined);

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="border-b bg-background p-6">
				<CardTitle className="text-xl">Log in</CardTitle>
				<CardDescription>Welcome back. Enter your details to continue.</CardDescription>
			</CardHeader>
			<CardContent className="p-6">
				<form action={formAction} className="flex flex-col gap-4">
					<input name="from" type="hidden" value={from} />

					{state?.message && (
						<p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
							{state.message}
						</p>
					)}

					<Field icon={<Mail aria-hidden="true" className="size-4" />} label="Email">
						<Input
							autoComplete="email"
							name="email"
							placeholder="you@example.com"
							required
							type="email"
						/>
					</Field>

					<Field icon={<Lock aria-hidden="true" className="size-4" />} label="Password">
						<Input
							autoComplete="current-password"
							name="password"
							required
							type="password"
						/>
					</Field>

					<Button className="mt-2 w-full" disabled={pending} size="lg" type="submit">
						Log in
					</Button>
				</form>

				<p className="mt-4 text-center text-sm text-muted-foreground">
					Don&apos;t have an account?{' '}
					<Link
						className="font-medium text-foreground underline-offset-4 hover:underline"
						href={`/signup?from=${encodeURIComponent(from)}`}
					>
						Sign up
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}

interface FieldProps {
	children: ReactNode;
	icon: ReactNode;
	label: string;
}

function Field({ children, icon, label }: FieldProps) {
	return (
		<label className="grid gap-2">
			<span className="flex items-center gap-2 text-sm font-medium text-foreground">
				<span className="text-muted-foreground">{icon}</span>
				{label}
			</span>
			{children}
		</label>
	);
}
