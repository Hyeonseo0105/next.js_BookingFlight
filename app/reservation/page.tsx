import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { ReservationPageClient } from '@/components/reservation-page-client';
import { prisma } from '@/lib/prisma';
import type { SeatData } from '@/lib/seat-types';

interface ReservationPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReservationPage({ searchParams }: ReservationPageProps) {
	const query = await searchParams;
	const flightId = getQueryValue(query.flightId);
	const returnFlightId = getQueryValue(query.returnFlightId);
	const departureDate = getQueryValue(query.departureDate);
	const returnDate = getQueryValue(query.returnDate);
	const travelers = Number(getQueryValue(query.travelers)) || 1;
	const tripType = getQueryValue(query.tripType) || 'ONE_WAY';
	const isRoundTrip = tripType === 'ROUND_TRIP' && !!returnFlightId;

	const flight = flightId
		? await prisma.flight.findUnique({ where: { id: flightId } })
		: null;
	if (!flight) notFound();

	const returnFlight = isRoundTrip
		? await prisma.flight.findUnique({ where: { id: returnFlightId } })
		: null;

	const rawSeats = await prisma.seat.findMany({
		where: { flightId: flight.id },
		orderBy: [{ row: 'asc' }, { column: 'asc' }],
		select: {
			id: true,
			seatNumber: true,
			class: true,
			status: true,
			priceModifier: true,
			row: true,
			column: true,
		},
	});

	const seats: SeatData[] = rawSeats.map(s => ({
		...s,
		class: s.class as SeatData['class'],
		status: s.status as SeatData['status'],
	}));

	const backHref = isRoundTrip
		? `/search?tripType=ROUND_TRIP&from=${encodeURIComponent(flight.from)}&to=${encodeURIComponent(flight.to)}&outboundFlightId=${flightId}&departureDate=${departureDate}&returnDate=${returnDate}&travelers=${travelers}`
		: `/flights/${flight.id}?departureDate=${departureDate}&travelers=${travelers}`;

	return (
		<main className="min-h-screen bg-muted/30 px-4 py-8 text-foreground sm:px-6 lg:px-8">
			<section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				{/* Header */}
				<div className="space-y-2">
					<Link
						className={buttonVariants({
							className: 'mb-2 w-fit',
							size: 'sm',
							variant: 'ghost',
						})}
						href={backHref}
					>
						<ArrowLeft aria-hidden="true" className="size-4" />
						{isRoundTrip ? 'Change return flight' : 'Back to flight'}
					</Link>
					<p className="text-sm font-medium text-muted-foreground">
						{isRoundTrip ? 'Round trip' : 'One way'}
					</p>
					<h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
						Complete your reservation
					</h1>
					<p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
						Select your seats, then enter passenger and contact details.
					</p>
				</div>

				<ReservationPageClient
					departureDate={departureDate}
					flight={flight}
					returnFlight={returnFlight}
					returnDate={returnDate}
					tripType={tripType}
					seats={seats}
					travelers={travelers}
				/>
			</section>
		</main>
	);
}


function getQueryValue(value: string | string[] | undefined): string {
	if (Array.isArray(value)) return value[0] ?? '';
	return value ?? '';
}
