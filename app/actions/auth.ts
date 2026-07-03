'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, deleteSession } from '@/lib/session';
import { EMAIL_PATTERN } from '@/lib/validation';

export interface AuthFormState {
	errors?: {
		confirmPassword?: string;
		email?: string;
		name?: string;
		password?: string;
	};
	message?: string;
}

export interface CheckEmailResult {
	available: boolean;
}

export async function checkEmailAvailability(email: string): Promise<CheckEmailResult> {
	const normalized = email.trim().toLowerCase();
	if (!EMAIL_PATTERN.test(normalized)) return { available: true };

	const existing = await prisma.user.findUnique({ where: { email: normalized } });
	return { available: !existing };
}

function safeRedirectTarget(formData: FormData): string {
	const from = String(formData.get('from') ?? '');
	return from.startsWith('/') ? from : '/';
}

export async function signup(
	_state: AuthFormState | undefined,
	formData: FormData,
): Promise<AuthFormState> {
	const name = String(formData.get('name') ?? '').trim();
	const email = String(formData.get('email') ?? '').trim().toLowerCase();
	const password = String(formData.get('password') ?? '');
	const confirmPassword = String(formData.get('confirmPassword') ?? '');

	const errors: AuthFormState['errors'] = {};
	if (!name) errors.name = '이름을 입력해 주세요.';
	if (!EMAIL_PATTERN.test(email)) errors.email = '올바른 이메일 주소를 입력해 주세요.';
	if (password.length < 8) errors.password = '비밀번호는 8자 이상이어야 합니다.';
	if (password !== confirmPassword) errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
	if (Object.keys(errors).length > 0) return { errors };

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) return { message: '이미 가입된 이메일입니다.' };

	const hashed = await hashPassword(password);
	const user = await prisma.user.create({ data: { email, name, password: hashed } });

	await createSession(user.id);
	revalidatePath('/', 'layout');
	redirect(safeRedirectTarget(formData));
}

export async function login(
	_state: AuthFormState | undefined,
	formData: FormData,
): Promise<AuthFormState> {
	const email = String(formData.get('email') ?? '').trim().toLowerCase();
	const password = String(formData.get('password') ?? '');
	if (!email || !password) return { message: '이메일과 비밀번호를 입력해 주세요.' };

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user || !user.password) {
		return { message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
	}

	const valid = await verifyPassword(password, user.password);
	if (!valid) return { message: '이메일 또는 비밀번호가 올바르지 않습니다.' };

	await createSession(user.id);
	revalidatePath('/', 'layout');
	redirect(safeRedirectTarget(formData));
}

export async function logout(): Promise<void> {
	await deleteSession();
	revalidatePath('/', 'layout');
	redirect('/');
}
