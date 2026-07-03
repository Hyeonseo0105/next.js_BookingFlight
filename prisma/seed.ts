import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../lib/generated/prisma/client';
import { hashPassword } from '../lib/password';

const adapter = new PrismaLibSql({ url: process.env['DATABASE_URL'] ?? 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

// Business class: 2+2 config (no B or E)
const BUSINESS_COLS = ['A', 'C', 'D', 'F'] as const;
// Economy class: 3+3 config
const ECONOMY_COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// Phantom reserved seats (visually realistic, no real reservation record)
const PHANTOM_RESERVED = new Set([
	'1A', '1C', '2D', '3C', '3F', '4A', '4D',
	'5A', '5B', '6D', '6E', '7A', '9D', '10E', '10F',
	'11A', '14B', '14C', '16A', '17B', '17E', '18C',
	'19D', '20A', '20F', '21B', '22C', '23E', '24A', '25B',
]);

interface SeatInput {
	id: string;
	flightId: string;
	seatNumber: string;
	class: string;
	status: string;
	priceModifier: number;
	row: number;
	column: string;
}

function generateSeats(flightId: string): SeatInput[] {
	const seats: SeatInput[] = [];

	// Business (rows 1–4, 2+2)
	for (let row = 1; row <= 4; row++) {
		for (const col of BUSINESS_COLS) {
			const seatNumber = `${row}${col}`;
			seats.push({
				id: `${flightId}-${seatNumber}`,
				flightId,
				seatNumber,
				class: 'BUSINESS',
				status: PHANTOM_RESERVED.has(seatNumber) ? 'RESERVED' : 'AVAILABLE',
				priceModifier: 80,
				row,
				column: col,
			});
		}
	}

	// Economy (rows 5–25, 3+3)
	for (let row = 5; row <= 25; row++) {
		for (const col of ECONOMY_COLS) {
			const seatNumber = `${row}${col}`;
			const isExitRow = row === 12 || row === 13;
			const isWindow = col === 'A' || col === 'F';
			seats.push({
				id: `${flightId}-${seatNumber}`,
				flightId,
				seatNumber,
				class: 'ECONOMY',
				status: PHANTOM_RESERVED.has(seatNumber) ? 'RESERVED' : 'AVAILABLE',
				priceModifier: isExitRow ? 15 : isWindow ? 5 : 0,
				row,
				column: col,
			});
		}
	}

	return seats;
}

async function main() {
	// ---- Flights ----
	const flights = [
		{ id: 'fl-001', airline: 'Korean Air',         from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Tokyo (HND)',         toCode: 'HND', toKr: '도쿄 (HND)',        departureTime: '07:35', arrivalTime: '09:50', duration: '2h 15m',  price: 218 },
		{ id: 'fl-002', airline: 'Asiana Airlines',     from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Tokyo (NRT)',         toCode: 'NRT', toKr: '도쿄 (NRT)',        departureTime: '09:10', arrivalTime: '11:30', duration: '2h 20m',  price: 196 },
		{ id: 'fl-003', airline: 'Jeju Air',            from: 'Seoul (GMP)', fromCode: 'GMP', to: 'Osaka (KIX)',         toCode: 'KIX', toKr: '오사카 (KIX)',      departureTime: '10:15', arrivalTime: '12:05', duration: '1h 50m',  price: 142 },
		{ id: 'fl-004', airline: 'Tway Air',            from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Fukuoka (FUK)',       toCode: 'FUK', toKr: '후쿠오카 (FUK)',    departureTime: '12:20', arrivalTime: '13:45', duration: '1h 25m',  price: 128 },
		{ id: 'fl-005', airline: 'Jin Air',             from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Bangkok (BKK)',       toCode: 'BKK', toKr: '방콕 (BKK)',        departureTime: '17:40', arrivalTime: '21:35', duration: '5h 55m',  price: 286 },
		{ id: 'fl-006', airline: 'Thai Airways',        from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Bangkok (BKK)',       toCode: 'BKK', toKr: '방콕 (BKK)',        departureTime: '20:15', arrivalTime: '00:05', duration: '5h 50m',  price: 342 },
		{ id: 'fl-007', airline: 'Singapore Airlines',  from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Singapore (SIN)',     toCode: 'SIN', toKr: '싱가포르 (SIN)',    departureTime: '11:05', arrivalTime: '16:45', duration: '6h 40m',  price: 428 },
		{ id: 'fl-008', airline: 'Scoot',               from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Singapore (SIN)',     toCode: 'SIN', toKr: '싱가포르 (SIN)',    departureTime: '22:50', arrivalTime: '04:30', duration: '6h 40m',  price: 311 },
		{ id: 'fl-009', airline: 'Cathay Pacific',      from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Hong Kong (HKG)',     toCode: 'HKG', toKr: '홍콩 (HKG)',        departureTime: '08:55', arrivalTime: '11:45', duration: '3h 50m',  price: 244 },
		{ id: 'fl-010', airline: 'HK Express',          from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Hong Kong (HKG)',     toCode: 'HKG', toKr: '홍콩 (HKG)',        departureTime: '14:25', arrivalTime: '17:15', duration: '3h 50m',  price: 188 },
		{ id: 'fl-011', airline: 'China Airlines',      from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Taipei (TPE)',        toCode: 'TPE', toKr: '타이페이 (TPE)',    departureTime: '13:05', arrivalTime: '14:45', duration: '2h 40m',  price: 232 },
		{ id: 'fl-012', airline: 'EVA Air',             from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Taipei (TPE)',        toCode: 'TPE', toKr: '타이페이 (TPE)',    departureTime: '19:30', arrivalTime: '21:15', duration: '2h 45m',  price: 257 },
		{ id: 'fl-013', airline: 'Vietnam Airlines',    from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Hanoi (HAN)',         toCode: 'HAN', toKr: '하노이 (HAN)',      departureTime: '10:45', arrivalTime: '13:35', duration: '4h 50m',  price: 275 },
		{ id: 'fl-014', airline: 'VietJet Air',         from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Da Nang (DAD)',       toCode: 'DAD', toKr: '다낭 (DAD)',        departureTime: '06:20', arrivalTime: '09:25', duration: '4h 05m',  price: 201 },
		{ id: 'fl-015', airline: 'Philippine Airlines', from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Manila (MNL)',        toCode: 'MNL', toKr: '마닐라 (MNL)',      departureTime: '08:10', arrivalTime: '11:25', duration: '4h 15m',  price: 266 },
		{ id: 'fl-016', airline: 'Cebu Pacific',        from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Cebu (CEB)',          toCode: 'CEB', toKr: '세부 (CEB)',        departureTime: '21:35', arrivalTime: '01:05', duration: '4h 30m',  price: 217 },
		{ id: 'fl-017', airline: 'Garuda Indonesia',    from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Bali (DPS)',          toCode: 'DPS', toKr: '발리 (DPS)',        departureTime: '11:40', arrivalTime: '17:55', duration: '7h 15m',  price: 489 },
		{ id: 'fl-018', airline: 'AirAsia X',           from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Kuala Lumpur (KUL)', toCode: 'KUL', toKr: '쿠알라룸푸르 (KUL)', departureTime: '07:00', arrivalTime: '12:45', duration: '6h 45m',  price: 352 },
		{ id: 'fl-019', airline: 'Qantas',              from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Sydney (SYD)',        toCode: 'SYD', toKr: '시드니 (SYD)',      departureTime: '18:50', arrivalTime: '07:10', duration: '10h 20m', price: 812 },
		{ id: 'fl-020', airline: 'United Airlines',     from: 'Seoul (ICN)', fromCode: 'ICN', to: 'San Francisco (SFO)',toCode: 'SFO', toKr: '샌프란시스코 (SFO)', departureTime: '16:30', arrivalTime: '10:35', duration: '10h 05m', price: 928 },
		{ id: 'fl-021', airline: 'Delta Air Lines',     from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Seattle (SEA)',       toCode: 'SEA', toKr: '시애틀 (SEA)',      departureTime: '19:20', arrivalTime: '13:05', duration: '9h 45m',  price: 886 },
		{ id: 'fl-022', airline: 'Air France',          from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Paris (CDG)',         toCode: 'CDG', toKr: '파리 (CDG)',        departureTime: '09:55', arrivalTime: '17:20', duration: '13h 25m', price: 973 },
		{ id: 'fl-023', airline: 'Lufthansa',           from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Frankfurt (FRA)',     toCode: 'FRA', toKr: '프랑크푸르트 (FRA)', departureTime: '12:45', arrivalTime: '19:15', duration: '13h 30m', price: 948 },
		{ id: 'fl-024', airline: 'Emirates',            from: 'Seoul (ICN)', fromCode: 'ICN', to: 'Dubai (DXB)',         toCode: 'DXB', toKr: '두바이 (DXB)',      departureTime: '23:55', arrivalTime: '04:25', duration: '9h 30m',  price: 637 },
		{ id: 'fl-025', airline: 'Air France',           from: 'Tokyo (HND)',     fromCode: 'HND', to: 'Paris (CDG)',         toCode: 'CDG', toKr: '파리 (CDG)',          departureTime: '08:55', arrivalTime: '16:30', duration: '14h 40m', price: 1471 },
		{ id: 'fl-026', airline: 'ANA',                  from: 'Tokyo (HND)',     fromCode: 'HND', to: 'Singapore (SIN)',     toCode: 'SIN', toKr: '싱가포르 (SIN)',      departureTime: '09:00', arrivalTime: '14:30', duration: '6h 30m',  price: 312  },
		{ id: 'fl-027', airline: 'Singapore Airlines',   from: 'Singapore (SIN)', fromCode: 'SIN', to: 'London (LHR)',        toCode: 'LHR', toKr: '런던 (LHR)',          departureTime: '00:05', arrivalTime: '06:30', duration: '13h 25m', price: 748  },
		{ id: 'fl-028', airline: 'Emirates',             from: 'Bangkok (BKK)',   fromCode: 'BKK', to: 'Dubai (DXB)',         toCode: 'DXB', toKr: '두바이 (DXB)',        departureTime: '01:15', arrivalTime: '05:05', duration: '6h 50m',  price: 398  },
		{ id: 'fl-029', airline: 'Cathay Pacific',       from: 'Hong Kong (HKG)', fromCode: 'HKG', to: 'Sydney (SYD)',        toCode: 'SYD', toKr: '시드니 (SYD)',        departureTime: '21:40', arrivalTime: '08:05', duration: '9h 25m',  price: 524  },
		{ id: 'fl-030', airline: 'EVA Air',              from: 'Taipei (TPE)',    fromCode: 'TPE', to: 'Tokyo (NRT)',         toCode: 'NRT', toKr: '도쿄 (NRT)',          departureTime: '07:50', arrivalTime: '11:40', duration: '2h 50m',  price: 182  },
		{ id: 'fl-031', airline: 'Emirates',             from: 'Dubai (DXB)',     fromCode: 'DXB', to: 'London (LHR)',        toCode: 'LHR', toKr: '런던 (LHR)',          departureTime: '08:20', arrivalTime: '13:05', duration: '7h 45m',  price: 513  },
		{ id: 'fl-032', airline: 'Scoot',                from: 'Singapore (SIN)', fromCode: 'SIN', to: 'Tokyo (NRT)',         toCode: 'NRT', toKr: '도쿄 (NRT)',          departureTime: '17:30', arrivalTime: '00:55', duration: '6h 25m',  price: 245  },
		{ id: 'fl-033', airline: 'Peach',                from: 'Osaka (KIX)',     fromCode: 'KIX', to: 'Taipei (TPE)',        toCode: 'TPE', toKr: '타이페이 (TPE)',      departureTime: '13:10', arrivalTime: '15:05', duration: '2h 55m',  price: 134  },
		{ id: 'fl-034', airline: 'Qantas',               from: 'Sydney (SYD)',    fromCode: 'SYD', to: 'Singapore (SIN)',     toCode: 'SIN', toKr: '싱가포르 (SIN)',      departureTime: '06:00', arrivalTime: '11:40', duration: '8h 40m',  price: 487  },
		{ id: 'fl-035', airline: 'British Airways',      from: 'London (LHR)',    fromCode: 'LHR', to: 'New York (JFK)',      toCode: 'JFK', toKr: '뉴욕 (JFK)',          departureTime: '10:15', arrivalTime: '13:20', duration: '8h 05m',  price: 562  },
	];

	for (const flight of flights) {
		await prisma.flight.upsert({
			where: { id: flight.id },
			update: flight,
			create: flight,
		});
	}
	console.log(`✓ Seeded ${flights.length} flights`);

	// ---- Seats ----
	let seatedFlights = 0;
	for (const flight of flights) {
		const existing = await prisma.seat.count({ where: { flightId: flight.id } });
		if (existing === 0) {
			const seats = generateSeats(flight.id);
			await prisma.seat.createMany({ data: seats });
			seatedFlights++;
		}
	}
	console.log(`✓ Seeded seats for ${seatedFlights} flights (${flights.length - seatedFlights} already existed)`);

	// ---- Demo user ----
	const hashedDemoPassword = await hashPassword('demo1234');
	const demoUser = await prisma.user.upsert({
		where: { email: 'demo@example.com' },
		update: { password: hashedDemoPassword },
		create: {
			id: 'user-demo-001',
			email: 'demo@example.com',
			name: 'Hong Gildong',
			password: hashedDemoPassword,
		},
	});
	console.log(`✓ Seeded demo user: ${demoUser.email} (password: demo1234)`);

	// ---- Demo reservations (past trips) ----
	const demoReservations = [
		{
			bookingRef: 'BF-DEMO001',
			flightId: 'fl-001',
			departureDate: '2026-03-22',
			travelers: 1,
			totalPrice: 223,   // 218 + 5 (window seat 15A)
			status: 'COMPLETED',
			contactEmail: 'demo@example.com',
			contactPhone: '+82 10-1234-5678',
			passengers: [
				{ firstName: 'Gildong', lastName: 'Hong', dateOfBirth: '1990-05-15', nationality: 'Korean', passport: 'M12345678' },
			],
			seatNumbers: ['15A'],
		},
		{
			bookingRef: 'BF-DEMO002',
			flightId: 'fl-009',
			departureDate: '2025-12-05',
			travelers: 2,
			totalPrice: 488,   // 244 * 2
			status: 'COMPLETED',
			contactEmail: 'demo@example.com',
			contactPhone: '+82 10-1234-5678',
			passengers: [
				{ firstName: 'Gildong', lastName: 'Hong', dateOfBirth: '1990-05-15', nationality: 'Korean', passport: 'M12345678' },
				{ firstName: 'Jisoo', lastName: 'Kim', dateOfBirth: '1992-08-20', nationality: 'Korean', passport: 'M87654321' },
			],
			seatNumbers: ['10C', '10D'],
		},
		{
			bookingRef: 'BF-DEMO003',
			flightId: 'fl-007',
			departureDate: '2026-08-10',
			travelers: 1,
			totalPrice: 428,   // 428
			status: 'CONFIRMED',
			contactEmail: 'demo@example.com',
			contactPhone: '+82 10-1234-5678',
			passengers: [
				{ firstName: 'Gildong', lastName: 'Hong', dateOfBirth: '1990-05-15', nationality: 'Korean', passport: 'M12345678' },
			],
			seatNumbers: ['8B'],
		},
	];

	for (const res of demoReservations) {
		const { passengers, seatNumbers, ...reservationData } = res;

		const reservation = await prisma.reservation.upsert({
			where: { bookingRef: reservationData.bookingRef },
			update: {},
			create: {
				...reservationData,
				userId: demoUser.id,
				passengers: { create: passengers },
			},
			include: { passengers: true },
		});

		// Link demo seats → mark reserved + create ReservationSeat
		for (let i = 0; i < seatNumbers.length; i++) {
			const seatId = `${reservationData.flightId}-${seatNumbers[i]}`;
			await prisma.seat.update({
				where: { id: seatId },
				data: { status: 'RESERVED' },
			});
			await prisma.reservationSeat.upsert({
				where: { seatId },
				update: {},
				create: {
					reservationId: reservation.id,
					seatId,
					passengerId: reservation.passengers[i]?.id ?? null,
				},
			});
		}
	}
	console.log(`✓ Seeded ${demoReservations.length} demo reservations with seats`);

	await seedPriceHistory(flights);
}

async function seedPriceHistory(flights: { id: string; price: number }[]) {
	const REFERENCE_DATE = new Date('2026-06-29T00:00:00Z');
	const DAYS = 45;

	function flightSeed(flightId: string): number {
		let hash = 0;
		for (const ch of flightId) {
			hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
		}
		return hash;
	}

	let count = 0;
	for (const flight of flights) {
		const existing = await prisma.flightPriceHistory.count({ where: { flightId: flight.id } });
		if (existing > 0) continue;

		const seed = flightSeed(flight.id);
		const history = [];

		for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
			const dayOffset = DAYS - 1 - dayIndex;
			const recordedAt = new Date(REFERENCE_DATE);
			recordedAt.setUTCDate(recordedAt.getUTCDate() - dayOffset);

			let price: number;
			if (dayIndex === DAYS - 1) {
				price = flight.price;
			} else {
				const trendFactor = 0.80 + 0.20 * (dayIndex / (DAYS - 1));
				const noise = Math.sin(dayIndex * 7.3 + seed) * 0.05;
				price = Math.round(flight.price * (trendFactor + noise));
			}

			history.push({ flightId: flight.id, price, recordedAt });
		}

		await prisma.flightPriceHistory.createMany({ data: history });
		count++;
	}
	console.log(`✓ Seeded price history for ${count} flights (${flights.length - count} already existed)`);
}

main()
	.catch(e => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
