'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { getCurrentUser } from '@/lib/auth';

export interface ProfileFormState {
	errors?: {
		name?: string;
		currentPassword?: string;
		newPassword?: string;
		confirmPassword?: string;
	};
	success?: boolean;
	message?: string;
}

export async function updateProfile(
	_state: ProfileFormState | undefined,
	formData: FormData,
): Promise<ProfileFormState> {
	const user = await getCurrentUser();
	if (!user) return { message: '로그인이 필요합니다.' };

	const name = String(formData.get('name') ?? '').trim();
	const currentPassword = String(formData.get('currentPassword') ?? '');
	const newPassword = String(formData.get('newPassword') ?? '');
	const confirmPassword = String(formData.get('confirmPassword') ?? '');

	const errors: ProfileFormState['errors'] = {};

	if (!name) errors.name = '이름을 입력해 주세요.';

	const changingPassword = newPassword.length > 0;
	if (changingPassword) {
		if (!currentPassword) errors.currentPassword = '현재 비밀번호를 입력해 주세요.';
		if (newPassword.length < 8) errors.newPassword = '비밀번호는 8자 이상이어야 합니다.';
		if (newPassword !== confirmPassword) errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
	}

	if (Object.keys(errors).length > 0) return { errors };

	// Verify current password if changing
	if (changingPassword) {
		const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
		if (!dbUser?.password) return { message: '비밀번호를 변경할 수 없습니다.' };
		const valid = await verifyPassword(currentPassword, dbUser.password);
		if (!valid) return { errors: { currentPassword: '현재 비밀번호가 올바르지 않습니다.' } };
	}

	await prisma.user.update({
		where: { id: user.id },
		data: {
			name,
			...(changingPassword ? { password: await hashPassword(newPassword) } : {}),
		},
	});

	revalidatePath('/mypage', 'layout');
	return { success: true };
}
