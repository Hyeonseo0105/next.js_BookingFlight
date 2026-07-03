'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export interface PriceAlertResult {
	error?: string;
}

export async function setAlert(
	flightId: string,
	targetPrice: number,
): Promise<PriceAlertResult> {
	const user = await getCurrentUser();
	if (!user) return { error: '로그인이 필요합니다.' };

	if (!Number.isInteger(targetPrice) || targetPrice <= 0) {
		return { error: '올바른 목표 가격을 입력해 주세요.' };
	}

	const flight = await prisma.flight.findUnique({ where: { id: flightId }, select: { price: true } });
	if (!flight) return { error: '항공편을 찾을 수 없습니다.' };

	const alreadyTriggered = flight.price <= targetPrice;

	await prisma.priceAlert.upsert({
		where: { userId_flightId: { userId: user.id, flightId } },
		create: {
			userId: user.id,
			flightId,
			targetPrice,
			triggered: alreadyTriggered,
			triggeredAt: alreadyTriggered ? new Date() : null,
		},
		update: {
			targetPrice,
			triggered: alreadyTriggered,
			triggeredAt: alreadyTriggered ? new Date() : null,
		},
	});

	revalidatePath(`/flights/${flightId}`);
	revalidatePath('/mypage');
	return {};
}

export async function deleteAlert(flightId: string): Promise<PriceAlertResult> {
	const user = await getCurrentUser();
	if (!user) return { error: '로그인이 필요합니다.' };

	await prisma.priceAlert.deleteMany({
		where: { userId: user.id, flightId },
	});

	revalidatePath(`/flights/${flightId}`);
	revalidatePath('/mypage');
	return {};
}
