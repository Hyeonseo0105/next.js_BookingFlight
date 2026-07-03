'use client';

import { useActionState, useEffect, type ReactNode } from 'react';
import { Lock, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateProfile } from '@/app/actions/profile';

interface EditProfileFormProps {
	initialName: string;
}

export function EditProfileForm({ initialName }: EditProfileFormProps) {
	const [state, formAction, pending] = useActionState(updateProfile, undefined);

	useEffect(() => {
		if (state?.success) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}, [state?.success]);

	return (
		<form action={formAction} className="flex flex-col gap-6">
			{state?.success && (
				<p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
					프로필이 업데이트되었습니다.
				</p>
			)}
			{state?.message && (
				<p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
					{state.message}
				</p>
			)}

			{/* Name */}
			<div>
				<h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
					<User aria-hidden="true" className="size-4 text-muted-foreground" />
					기본 정보
				</h2>
				<Field label="이름">
					<Input
						defaultValue={initialName}
						name="name"
						placeholder="홍길동"
						required
						type="text"
					/>
					{state?.errors?.name && (
						<p className="text-xs text-destructive">{state.errors.name}</p>
					)}
				</Field>
			</div>

			{/* Password change */}
			<div className="border-t pt-6">
				<h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
					<Lock aria-hidden="true" className="size-4 text-muted-foreground" />
					비밀번호 변경
				</h2>
				<p className="mb-4 text-xs text-muted-foreground">
					변경하지 않으려면 비워두세요.
				</p>
				<div className="flex flex-col gap-4">
					<Field label="현재 비밀번호">
						<Input
							autoComplete="current-password"
							name="currentPassword"
							placeholder="현재 비밀번호"
							type="password"
						/>
						{state?.errors?.currentPassword && (
							<p className="text-xs text-destructive">{state.errors.currentPassword}</p>
						)}
					</Field>

					<Field label="새 비밀번호">
						<Input
							autoComplete="new-password"
							name="newPassword"
							placeholder="8자 이상"
							type="password"
						/>
						{state?.errors?.newPassword && (
							<p className="text-xs text-destructive">{state.errors.newPassword}</p>
						)}
					</Field>

					<Field label="새 비밀번호 확인">
						<Input
							autoComplete="new-password"
							name="confirmPassword"
							placeholder="비밀번호 재입력"
							type="password"
						/>
						{state?.errors?.confirmPassword && (
							<p className="text-xs text-destructive">{state.errors.confirmPassword}</p>
						)}
					</Field>
				</div>
			</div>

			<div className="flex gap-3 border-t pt-6">
				<Button className="flex-1" disabled={pending} type="submit">
					{pending ? '저장 중...' : '저장'}
				</Button>
			</div>
		</form>
	);
}

interface FieldProps {
	children: ReactNode;
	label: string;
}

function Field({ children, label }: FieldProps) {
	return (
		<label className="grid gap-2">
			<span className="text-sm font-medium text-foreground">{label}</span>
			{children}
		</label>
	);
}
