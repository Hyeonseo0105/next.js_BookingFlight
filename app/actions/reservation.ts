'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export interface PassengerInput {
	dateOfBirth: string;
	firstName: string;
	lastName: string;
	nationality: string;
	passport: string;
}

export interface CreateReservationInput {
	contactEmail: string;
	contactPhone: string;
	departureDate: string;
	flightId: string;
	returnFlightId?: string;
	returnDate?: string;
	tripType?: string;
	passengers: PassengerInput[];
	seatIds: string[];
	travelers: number;
}

export interface CreateReservationResult {
	bookingRef: string;
	error?: never;
}

export interface CreateReservationError {
	bookingRef?: never;
	error: string;
}

export async function createReservation(
	input: CreateReservationInput,
): Promise<CreateReservationResult | CreateReservationError> {
	const sessionUser = await getCurrentUser();
	if (!sessionUser) return { error: '로그인이 필요합니다.' };

	try {
		const result = await prisma.$transaction(async tx => {
			const flight = await tx.flight.findUnique({ where: { id: input.flightId } });
			if (!flight) throw new Error('Flight not found');

			const isRoundTrip = input.tripType === 'ROUND_TRIP' && !!input.returnFlightId;
			const returnFlight = isRoundTrip
				? await tx.flight.findUnique({ where: { id: input.returnFlightId! } })
				: null;
			if (isRoundTrip && !returnFlight) throw new Error('Return flight not found');

			// Verify all requested seats are still available (race-condition guard)
			if (input.seatIds.length > 0) {
				const available = await tx.seat.findMany({
					where: { id: { in: input.seatIds }, status: 'AVAILABLE' },
					select: { id: true },
				});
				if (available.length !== input.seatIds.length) {
					throw new Error('SEATS_TAKEN');
				}
			}

			// Calculate total including seat fees and return flight fare
			const seatFee = input.seatIds.length > 0
				? await tx.seat
					.findMany({ where: { id: { in: input.seatIds } }, select: { priceModifier: true } })
					.then(rows => rows.reduce((s, r) => s + r.priceModifier, 0))
				: 0;
			const outboundFare = flight.price * input.travelers;
			const returnFare = returnFlight ? returnFlight.price * input.travelers : 0;
			const totalPrice = outboundFare + returnFare + seatFee;

			const bookingRef = `BF-${Date.now().toString(36).toUpperCase()}`;

			const reservation = await tx.reservation.create({
				data: {
					bookingRef,
					flightId: input.flightId,
					returnFlightId: isRoundTrip ? input.returnFlightId : null,
					tripType: input.tripType ?? 'ONE_WAY',
					userId: sessionUser.id,
					departureDate: input.departureDate,
					returnDate: isRoundTrip ? (input.returnDate ?? null) : null,
					travelers: input.travelers,
					totalPrice,
					contactEmail: input.contactEmail,
					contactPhone: input.contactPhone,
					passengers: {
						create: input.passengers.map(p => ({
							firstName: p.firstName,
							lastName: p.lastName,
							dateOfBirth: p.dateOfBirth,
							nationality: p.nationality,
							passport: p.passport,
						})),
					},
				},
				include: { passengers: true },
			});

			// Reserve seats and link to reservation + passenger
			if (input.seatIds.length > 0) {
				await tx.seat.updateMany({
					where: { id: { in: input.seatIds } },
					data: { status: 'RESERVED' },
				});

				for (let i = 0; i < input.seatIds.length; i++) {
					await tx.reservationSeat.create({
						data: {
							reservationId: reservation.id,
							seatId: input.seatIds[i]!,
							passengerId: reservation.passengers[i]?.id ?? null,
						},
					});
				}
			}

			return { bookingRef };
		});

		revalidatePath('/mypage');
		return result;
	} catch (err) {
		if (err instanceof Error && err.message === 'SEATS_TAKEN') {
			return { error: '선택한 좌석 중 이미 예약된 좌석이 있습니다. 다른 좌석을 선택해 주세요.' };
		}
		if (err instanceof Error && err.message === 'Flight not found') {
			return { error: 'Flight not found' };
		}
		if (err instanceof Error && err.message === 'Return flight not found') {
			return { error: 'Return flight not found' };
		}
		console.error('[createReservation]', err);
		return { error: 'Reservation failed. Please try again.' };
	}
}

export interface CancelReservationResult {
	error?: string;
}

export async function cancelReservation(reservationId: string): Promise<CancelReservationResult> {
	const sessionUser = await getCurrentUser();
	if (!sessionUser) redirect('/login');

	try {
		await prisma.$transaction(async tx => {
			const reservation = await tx.reservation.findUnique({
				where: { id: reservationId },
				include: { reservationSeats: true },
			});

			if (!reservation || reservation.userId !== sessionUser.id) {
				throw new Error('NOT_FOUND');
			}
			if (reservation.status !== 'CONFIRMED') {
				throw new Error('NOT_CANCELLABLE');
			}

			await tx.reservation.update({
				where: { id: reservationId },
				data: { status: 'CANCELLED' },
			});

			// Free the seats: drop the ReservationSeat links (seatId is @unique, so a
			// future booking on the same seat would fail if the old link stayed) and
			// flip the seats back to AVAILABLE.
			const seatIds = reservation.reservationSeats.map(rs => rs.seatId);
			if (seatIds.length > 0) {
				await tx.reservationSeat.deleteMany({ where: { reservationId } });
				await tx.seat.updateMany({
					where: { id: { in: seatIds } },
					data: { status: 'AVAILABLE' },
				});
			}
		});

		revalidatePath('/mypage');
		return {};
	} catch (err) {
		if (err instanceof Error && (err.message === 'NOT_FOUND' || err.message === 'NOT_CANCELLABLE')) {
			return { error: '취소할 수 없는 예약입니다.' };
		}
		console.error('[cancelReservation]', err);
		return { error: '예약 취소에 실패했습니다. 다시 시도해 주세요.' };
	}
}
