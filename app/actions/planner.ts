'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export interface SavePlannerSummaryResult {
	error?: string;
}

export async function savePlannerSummary(
	destination: string,
	summary: string,
): Promise<SavePlannerSummaryResult> {
	const user = await getCurrentUser();
	if (!user) return { error: '로그인이 필요합니다.' };

	const trimmedDestination = destination.trim();
	const trimmedSummary = summary.trim();
	if (!trimmedDestination || !trimmedSummary) {
		return { error: '저장할 내용이 없습니다.' };
	}

	await prisma.plannerConversation.create({
		data: { userId: user.id, destination: trimmedDestination, summary: trimmedSummary },
	});

	revalidatePath('/mypage');
	return {};
}
