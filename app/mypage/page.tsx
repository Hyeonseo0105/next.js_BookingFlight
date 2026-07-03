import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
	Bell,
	BellRing,
	Briefcase,
	CalendarDays,
	CheckCircle2,
	ChevronDown,
	Clock,
	Plane,
	Search,
	Sparkles,
	Ticket,
	Trash2,
	User,
	Users,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CancelReservationButton } from '@/components/cancel-reservation-button';
import { DeleteAlertButton } from '@/components/delete-alert-button';

interface MyPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MyPage({ searchParams }: MyPageProps) {
	const query = await searchParams;
	const justBooked = getQueryValue(query.booked) === '1';
	const newRef = getQueryValue(query.ref);

	const user = await getCurrentUser();
	if (!user) redirect('/login');

	const [reservations, priceAlerts, plannerConversations] = await Promise.all([
		prisma.reservation.findMany({
			where: { userId: user.id },
			include: {
				flight: true,
				returnFlight: true,
				reservationSeats: { include: { seat: true } },
			},
			orderBy: { createdAt: 'desc' },
		}),
		prisma.priceAlert.findMany({
			where: { userId: user.id },
			include: { flight: true },
			orderBy: { createdAt: 'desc' },
		}),
		prisma.plannerConversation.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: 'desc' },
			take: 5,
		}),
	]);

	const upcoming = reservations.filter(r => r.status === 'CONFIRMED');
	const past = reservations.filter(r => r.status !== 'CONFIRMED');
	const activeReservations = reservations.filter(r => r.status !== 'CANCELLED');

	const newReservation = justBooked && newRef
		? reservations.find(r => r.bookingRef === newRef)
		: null;

	return (
		<main className="min-h-screen bg-muted/30 px-4 py-8 text-foreground sm:px-6 lg:px-8">
			<section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">My account</p>
						<h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
							My Page
						</h1>
						<p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
							Manage your bookings and account details.
						</p>
					</div>
					<Link
						className={buttonVariants({ size: 'sm', variant: 'outline' })}
						href="/"
					>
						<Search aria-hidden="true" className="size-4" />
						Search new flight
					</Link>
				</div>

				{/* Success banner */}
				{justBooked && (
					<div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
						<CheckCircle2
							aria-hidden="true"
							className="mt-0.5 size-5 shrink-0 text-primary"
						/>
						<div>
							<p className="text-sm font-semibold">Booking confirmed!</p>
							<p className="text-sm text-muted-foreground">
								{newReservation
									? `Reservation ${newReservation.bookingRef} for ${newReservation.flight.from} → ${newReservation.flight.to} has been confirmed.`
									: 'Your reservation has been confirmed. A confirmation email will be sent shortly.'}
							</p>
						</div>
					</div>
				)}

				<div className="grid gap-6 lg:grid-cols-[1fr_300px]">
					<div className="flex flex-col gap-6">
						{/* Upcoming trips */}
						<Card className="overflow-hidden">
							<CardHeader className="border-b bg-background p-5 sm:p-6">
								<CardTitle className="text-xl">Upcoming trips</CardTitle>
								<CardDescription>
									{upcoming.length} booking{upcoming.length !== 1 ? 's' : ''} scheduled
								</CardDescription>
							</CardHeader>
							<CardContent className="bg-card p-5 sm:p-6">
								{upcoming.length > 0 ? (
									<div className="grid gap-4">
										{upcoming.map(res => (
											<BookingCard
												isNew={res.bookingRef === newRef}
												key={res.id}
												reservation={res}
											/>
										))}
									</div>
								) : (
									<div className="rounded-lg border border-dashed p-8 text-center">
										<Plane
											aria-hidden="true"
											className="mx-auto mb-3 size-8 text-muted-foreground"
										/>
										<p className="text-sm font-medium">No upcoming trips</p>
										<p className="mt-2 text-sm text-muted-foreground">
											Search for a flight to get started.
										</p>
										<Link
											className={buttonVariants({
												className: 'mt-4',
												size: 'sm',
												variant: 'outline',
											})}
											href="/"
										>
											Search flights
										</Link>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Past trips */}
						{past.length > 0 && (
							<Card className="overflow-hidden">
								<CardHeader className="border-b bg-background p-5 sm:p-6">
									<CardTitle className="text-xl">Past trips</CardTitle>
									<CardDescription>
										{past.length} completed trip{past.length !== 1 ? 's' : ''}
									</CardDescription>
								</CardHeader>
								<CardContent className="bg-card p-5 sm:p-6">
									<div className="grid gap-4">
										{past.map(res => (
											<BookingCard key={res.id} past reservation={res} />
										))}
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Profile sidebar */}
					<div className="flex flex-col gap-4">
						<Card className="overflow-hidden">
							<CardHeader className="border-b bg-background p-5">
								<CardTitle className="text-lg">Profile</CardTitle>
							</CardHeader>
							<CardContent className="bg-card p-5">
								<div className="flex flex-col items-center gap-3 text-center">
									<div className="flex size-16 items-center justify-center rounded-full bg-secondary">
										<User aria-hidden="true" className="size-8 text-secondary-foreground" />
									</div>
									<div>
										<p className="font-semibold">{user?.name ?? 'Guest'}</p>
										<p className="text-sm text-muted-foreground">{user?.email ?? ''}</p>
									</div>
								</div>

								<dl className="mt-5 grid gap-3 border-t pt-5">
									<div className="flex items-center justify-between gap-4">
										<dt className="text-sm text-muted-foreground">Member since</dt>
										<dd className="text-sm font-medium">
											{user?.createdAt
												? new Date(user.createdAt).getFullYear()
												: '—'}
										</dd>
									</div>
									<div className="flex items-center justify-between gap-4">
										<dt className="text-sm text-muted-foreground">Total bookings</dt>
										<dd className="text-sm font-medium">{reservations.length}</dd>
									</div>
								</dl>

								<Link
									className={buttonVariants({
										className: 'mt-5 w-full',
										size: 'sm',
										variant: 'outline',
									})}
									href="/mypage/edit"
								>
									Edit profile
								</Link>
							</CardContent>
						</Card>

						<Card className="overflow-hidden">
							<CardHeader className="border-b bg-background p-5">
								<CardTitle className="text-lg">Travel stats</CardTitle>
							</CardHeader>
							<CardContent className="bg-card p-5">
								<dl className="grid grid-cols-2 gap-4">
									<StatBox
										label="Trips taken"
										value={String(activeReservations.length)}
									/>
									<StatBox
										label="Total spend"
										value={`$${activeReservations.reduce((sum, r) => sum + r.totalPrice, 0).toLocaleString()}`}
									/>
								</dl>
							</CardContent>
						</Card>

						{priceAlerts.length > 0 && (
							<Card className="overflow-hidden">
								<CardHeader className="border-b bg-background p-5">
									<CardTitle className="flex items-center gap-2 text-lg">
										<Bell aria-hidden="true" className="size-4" />
										가격 알림
									</CardTitle>
								</CardHeader>
								<CardContent className="bg-card p-5">
									<div className="flex flex-col gap-3">
										{priceAlerts.map(alert => (
											<div
												className="flex items-start gap-3 rounded-lg border bg-background p-3"
												key={alert.id}
											>
												<div className="mt-0.5 shrink-0">
													{alert.triggered ? (
														<BellRing aria-hidden="true" className="size-4 text-primary" />
													) : (
														<Bell aria-hidden="true" className="size-4 text-muted-foreground" />
													)}
												</div>
												<div className="min-w-0 flex-1">
													<Link
														className="text-sm font-medium hover:underline"
														href={`/flights/${alert.flightId}`}
													>
														{alert.flight.from.split('(')[0].trim()} → {alert.flight.to.split('(')[0].trim()}
													</Link>
													<p className="text-xs text-muted-foreground">
														목표 ${alert.targetPrice.toLocaleString()} · 현재 ${alert.flight.price.toLocaleString()}
													</p>
													{alert.triggered && alert.triggeredAt && (
														<p className="mt-0.5 text-xs font-medium text-primary">
															{new Date(alert.triggeredAt).toLocaleDateString('ko-KR')} 달성
														</p>
													)}
												</div>
												<DeleteAlertButton flightId={alert.flightId} />
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						)}

						{plannerConversations.length > 0 && (
							<Card className="overflow-hidden">
								<CardHeader className="border-b bg-background p-5">
									<CardTitle className="flex items-center gap-2 text-lg">
										<Sparkles aria-hidden="true" className="size-4" />
										AI 여행 상담 기록
									</CardTitle>
								</CardHeader>
								<CardContent className="bg-card p-5">
									<div className="flex flex-col gap-3">
										{plannerConversations.map(pc => (
											<div className="rounded-lg border bg-background p-3" key={pc.id}>
												<p className="text-sm font-medium">{pc.destination}</p>
												<p className="mt-1 text-xs text-muted-foreground">{pc.summary}</p>
												<p className="mt-1.5 text-[11px] text-muted-foreground/70">
													{new Date(pc.createdAt).toLocaleDateString('ko-KR')}
												</p>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</section>
		</main>
	);
}

type ReservationWithFlight = Awaited<
	ReturnType<typeof prisma.reservation.findMany<{
		include: { flight: true; returnFlight: true; reservationSeats: { include: { seat: true } } };
	}>>
>[number];

const INCLUSIONS = [
	'1 carry-on bag (7 kg)',
	'1 checked bag (15 kg)',
	'Seat selection included',
	'In-flight meal service',
];

const POLICIES = [
	{ label: 'Cancellation', value: 'Free within 24 h' },
	{ label: 'Date change', value: '$30 fee' },
	{ label: 'Refund', value: 'Partial refund' },
];

function BookingCard({
	reservation,
	isNew,
	past,
}: {
	reservation: ReservationWithFlight;
	isNew?: boolean;
	past?: boolean;
}) {
	const statusColors: Record<string, string> = {
		CANCELLED: 'bg-destructive/10 text-destructive',
		COMPLETED: 'bg-muted text-muted-foreground',
		CONFIRMED: 'bg-primary/10 text-primary',
	};

	const { flight, returnFlight } = reservation;
	const isRoundTrip = reservation.tripType === 'ROUND_TRIP' && !!returnFlight;

	return (
		<div
			className={`rounded-lg border bg-background p-4 ${isNew ? 'ring-1 ring-primary/40' : ''}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<p className="text-sm font-semibold">
							{flight.from} → {flight.to}
							{isRoundTrip && <span className="text-muted-foreground"> → {returnFlight!.to}</span>}
						</p>
						{isNew && (
							<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
								New
							</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<p className="text-xs text-muted-foreground">{flight.airline}</p>
						{isRoundTrip && (
							<span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
								Round trip
							</span>
						)}
					</div>
				</div>
				<span
					className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColors[reservation.status] ?? 'bg-muted text-muted-foreground'}`}
				>
					{reservation.status.toLowerCase()}
				</span>
			</div>

			{/* Outbound leg */}
			<div className="mt-3 flex items-center gap-3">
				<div>
					<p className="text-base font-semibold">{flight.departureTime}</p>
					<p className="text-xs text-muted-foreground">{flight.fromCode}</p>
				</div>
				<div className="flex flex-1 items-center gap-1 text-muted-foreground">
					<span className="h-px flex-1 bg-border" />
					<Plane aria-hidden="true" className="size-3.5" />
					<span className="h-px flex-1 bg-border" />
				</div>
				<div className="text-right">
					<p className="text-base font-semibold">{flight.arrivalTime}</p>
					<p className="text-xs text-muted-foreground">{flight.toCode}</p>
				</div>
			</div>

			{/* Return leg */}
			{isRoundTrip && returnFlight && (
				<div className="mt-2 flex items-center gap-3 border-t pt-2">
					<div>
						<p className="text-base font-semibold">{returnFlight.departureTime}</p>
						<p className="text-xs text-muted-foreground">{returnFlight.fromCode}</p>
					</div>
					<div className="flex flex-1 items-center gap-1 text-muted-foreground">
						<span className="h-px flex-1 bg-border" />
						<Plane aria-hidden="true" className="size-3.5 -scale-x-100" />
						<span className="h-px flex-1 bg-border" />
					</div>
					<div className="text-right">
						<p className="text-base font-semibold">{returnFlight.arrivalTime}</p>
						<p className="text-xs text-muted-foreground">{returnFlight.toCode}</p>
					</div>
				</div>
			)}

			<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
				<span className="flex items-center gap-1">
					<CalendarDays aria-hidden="true" className="size-3" />
					{reservation.departureDate}
					{isRoundTrip && reservation.returnDate && ` – ${reservation.returnDate}`}
				</span>
				<span className="flex items-center gap-1">
					<Clock aria-hidden="true" className="size-3" />
					{flight.duration}
				</span>
				<span className="flex items-center gap-1">
					<Ticket aria-hidden="true" className="size-3" />
					{reservation.bookingRef}
				</span>
				<span className="ml-auto font-medium text-foreground">
					${reservation.totalPrice}
				</span>
			</div>

			{!past && (
				<details className="group mt-3 border-t pt-3">
					<summary className="flex cursor-pointer list-none items-center justify-end gap-2 [&::-webkit-details-marker]:hidden">
						{reservation.status === 'CONFIRMED' && (
							<CancelReservationButton
								bookingRef={reservation.bookingRef}
								reservationId={reservation.id}
							/>
						)}
						<span className={buttonVariants({ size: 'sm', variant: 'outline' })}>
							View details
							<ChevronDown
								aria-hidden="true"
								className="size-3.5 transition-transform group-open:rotate-180"
							/>
						</span>
					</summary>

					<div className="mt-4 flex flex-col gap-4">
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<InfoPill
								icon={<Ticket aria-hidden="true" className="size-3.5" />}
								label="Flight no."
								value={flight.id.toUpperCase()}
							/>
							<InfoPill
								icon={<Plane aria-hidden="true" className="size-3.5" />}
								label="Class"
								value={seatClassLabel(reservation)}
							/>
							<InfoPill
								icon={<Briefcase aria-hidden="true" className="size-3.5" />}
								label="Baggage"
								value="15 kg"
							/>
							<InfoPill
								icon={<Users aria-hidden="true" className="size-3.5" />}
								label="Travelers"
								value={String(reservation.travelers)}
							/>
						</div>

						{reservation.reservationSeats.length > 0 && (
							<div>
								<p className="mb-2 text-xs font-medium text-muted-foreground">Selected seats</p>
								<div className="flex flex-wrap gap-2">
									{reservation.reservationSeats.map(rs => (
										<span
											className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-medium"
											key={rs.id}
										>
											{rs.seat.seatNumber} · {rs.seat.class === 'BUSINESS' ? 'Business' : 'Economy'}
										</span>
									))}
								</div>
							</div>
						)}

						<div>
							<p className="mb-2 text-xs font-medium text-muted-foreground">What&apos;s included</p>
							<ul className="grid gap-1.5 sm:grid-cols-2">
								{INCLUSIONS.map(item => (
									<li className="flex items-start gap-2 text-xs" key={item}>
										<CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
										{item}
									</li>
								))}
							</ul>
						</div>

						<div className="grid grid-cols-3 gap-3 border-t pt-3">
							{POLICIES.map(p => (
								<div key={p.label}>
									<p className="text-[11px] text-muted-foreground">{p.label}</p>
									<p className="text-xs font-medium">{p.value}</p>
								</div>
							))}
						</div>
					</div>
				</details>
			)}
		</div>
	);
}

function seatClassLabel(reservation: ReservationWithFlight): string {
	if (reservation.reservationSeats.length === 0) return 'Economy';
	const classes = new Set(
		reservation.reservationSeats.map(rs => (rs.seat.class === 'BUSINESS' ? 'Business' : 'Economy')),
	);
	return Array.from(classes).join(', ');
}

interface InfoPillProps {
	icon: React.ReactNode;
	label: string;
	value: string;
}

function InfoPill({ icon, label, value }: InfoPillProps) {
	return (
		<div className="flex flex-col gap-1">
			<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
				{icon}
				{label}
			</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	);
}

function StatBox({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border bg-background p-3 text-center">
			<dd className="text-2xl font-bold">{value}</dd>
			<dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
		</div>
	);
}

function getQueryValue(value: string | string[] | undefined): string {
	if (Array.isArray(value)) return value[0] ?? '';
	return value ?? '';
}
