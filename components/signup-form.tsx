'use client';

import Link from 'next/link';
import { Lock, Mail, User } from 'lucide-react';
import { useActionState, useState, type FocusEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { checkEmailAvailability, signup } from '@/app/actions/auth';
import { EMAIL_PATTERN } from '@/lib/validation';

interface SignupFormProps {
	from: string;
}

export function SignupForm({ from }: SignupFormProps) {
	const [state, formAction, pending] = useActionState(signup, undefined);
	const [email, setEmail] = useState('');
	const [emailError, setEmailError] = useState('');
	const [checkingEmail, setCheckingEmail] = useState(false);

	async function handleEmailBlur(event: FocusEvent<HTMLInputElement>) {
		const value = event.target.value.trim();
		if (!value) {
			setEmailError('');
			return;
		}

		if (!EMAIL_PATTERN.test(value)) {
			setEmailError('올바른 이메일 주소를 입력해 주세요.');
			return;
		}

		setEmailError('');
		setCheckingEmail(true);
		const { available } = await checkEmailAvailability(value);
		setCheckingEmail(false);
		if (!available) {
			setEmailError('이미 가입된 이메일입니다.');
		}
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="border-b bg-background p-6">
				<CardTitle className="text-xl">Sign up</CardTitle>
				<CardDescription>Create an account to book and track your trips.</CardDescription>
			</CardHeader>
			<CardContent className="p-6">
				<form action={formAction} className="flex flex-col gap-4">
					<input name="from" type="hidden" value={from} />

					{state?.message && (
						<p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
							{state.message}
						</p>
					)}

					<Field icon={<User aria-hidden="true" className="size-4" />} label="Name">
						<Input
							autoComplete="name"
							name="name"
							placeholder="Gildong Hong"
							required
							type="text"
						/>
						{state?.errors?.name && (
							<p className="text-xs text-destructive">{state.errors.name}</p>
						)}
					</Field>

					<Field icon={<Mail aria-hidden="true" className="size-4" />} label="Email">
						<Input
							autoComplete="email"
							name="email"
							onBlur={handleEmailBlur}
							onChange={e => { setEmail(e.target.value); setEmailError(''); }}
							placeholder="you@example.com"
							required
							type="email"
							value={email}
						/>
						{checkingEmail && (
							<p className="text-xs text-muted-foreground">확인 중...</p>
						)}
						{!checkingEmail && (emailError || state?.errors?.email) && (
							<p className="text-xs text-destructive">{emailError || state?.errors?.email}</p>
						)}
					</Field>

					<Field icon={<Lock aria-hidden="true" className="size-4" />} label="Password">
						<Input
							autoComplete="new-password"
							name="password"
							required
							type="password"
						/>
						{state?.errors?.password && (
							<p className="text-xs text-destructive">{state.errors.password}</p>
						)}
					</Field>

					<Field icon={<Lock aria-hidden="true" className="size-4" />} label="Confirm password">
						<Input
							autoComplete="new-password"
							name="confirmPassword"
							required
							type="password"
						/>
						{state?.errors?.confirmPassword && (
							<p className="text-xs text-destructive">{state.errors.confirmPassword}</p>
						)}
					</Field>

					<Button className="mt-2 w-full" disabled={pending} size="lg" type="submit">
						Sign up
					</Button>
				</form>

				<p className="mt-4 text-center text-sm text-muted-foreground">
					Already have an account?{' '}
					<Link
						className="font-medium text-foreground underline-offset-4 hover:underline"
						href={`/login?from=${encodeURIComponent(from)}`}
					>
						Log in
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
