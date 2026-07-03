import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const field = searchParams.get('field');

	if (field === 'from') {
		const rows = await prisma.flight.findMany({
			select: { from: true },
			distinct: ['from'],
			orderBy: { from: 'asc' },
		});
		return Response.json(rows.map(r => r.from));
	}

	// field === 'to': from 값이 있으면 해당 출발지에서 갈 수 있는 목적지만 반환
	const from = searchParams.get('from') ?? '';
	const rows = await prisma.flight.findMany({
		select: { to: true },
		distinct: ['to'],
		where: from ? { from: { contains: from } } : undefined,
		orderBy: { to: 'asc' },
	});
	return Response.json(rows.map(r => r.to));
}
