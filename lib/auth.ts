import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';

import { decrypt } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export const getSessionPayload = cache(async () => {
	const cookieStore = await cookies();
	return decrypt(cookieStore.get('session')?.value);
});

export const getCurrentUser = cache(async () => {
	const session = await getSessionPayload();
	if (!session) return null;

	return prisma.user.findUnique({
		where: { id: session.userId },
		select: { id: true, email: true, name: true, createdAt: true },
	});
});
