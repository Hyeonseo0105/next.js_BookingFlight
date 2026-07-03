import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
	ArrowLeft,
	ArrowRight,
	Briefcase,
	CheckCircle2,
	Clock,
	Plane,
	ShieldCheck,
	Ticket,
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
import { PricePrediction } from '@/components/price-prediction';
import { PriceAlertButton } from '@/components/price-alert-button';
import { CarbonBadge } from '@/components/carbon-badge';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface FlightDetailPageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FlightDetailPage({
	params,
	searchParams,
}: FlightDetailPageProps) {
	const { id } = await params;
	const query = await searchParams;

	const [flight, user] = await Promise.all([
		prisma.flight.findUnique({
			where: { id },
			include: {
				priceHistory: {
					orderBy: { recordedAt: 'asc' },
				},
			},
		}),
		getCurrentUser(),
	]);
	if (!flight) notFound();

	// Fetch existing alert and check if it should be triggered
	let existingAlert = user
		? await prisma.priceAlert.findUnique({
			where: { userId_flightId: { userId: user.id, flightId: id } },
		})
		: null;

	if (existingAlert && !existingAlert.triggered && flight.price <= existingAlert.targetPrice) {
		existingAlert = await prisma.priceAlert.update({
			where: { id: existingAlert.id },
			data: { triggered: true, triggeredAt: new Date() },
		});
	}

	const departureDate = getQueryValue(query.departureDate);
	const travelers = Number(getQueryValue(query.travelers)) || 1;
	const totalPrice = flight.price * travelers;

	const reservationHref =
		`/reservation?flightId=${flight.id}&departureDate=${departureDate}&travelers=${travelers}`;

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
						href="/search"
					>
						<ArrowLeft aria-hidden="true" className="size-4" />
						Back to results
					</Link>
					<p className="text-sm font-medium text-muted-foreground">
						Flight details
					</p>
					<h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
						{flight.from.split('(')[0].trim()}{' → '}{flight.to.split('(')[0].trim()}
					</h1>
					<p className="text-sm leading-6 text-muted-foreground">
						{flight.airline} · {departureDate || 'Flexible date'}
					</p>
				</div>

				<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
					<div className="flex flex-col gap-6">
						{/* Route card */}
						<Card className="overflow-hidden">
							<CardHeader className="border-b bg-background p-5 sm:p-6">
								<CardTitle className="text-xl">Itinerary</CardTitle>
								<CardDescription>{flight.airline} · Economy class</CardDescription>
							</CardHeader>
							<CardContent className="bg-card p-5 sm:p-6">
								<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-0">
									<div className="min-w-0 flex-1">
										<p className="text-3xl font-bold">{flight.departureTime}</p>
										<p className="mt-1 text-base font-medium">{flight.from}</p>
										{departureDate && (
											<p className="text-sm text-muted-foreground">{departureDate}</p>
										)}
									</div>

									<div className="flex items-center gap-3 sm:flex-col sm:gap-1 sm:px-6">
										<div className="flex flex-1 items-center gap-2 sm:flex-none sm:flex-row">
											<span className="h-px flex-1 bg-border sm:w-12 sm:flex-none" />
											<Plane
												aria-hidden="true"
												className="size-5 rotate-90 text-muted-foreground sm:rotate-0"
											/>
											<span className="h-px flex-1 bg-border sm:w-12 sm:flex-none" />
										</div>
										<span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
											<Clock aria-hidden="true" className="size-3.5" />
											{flight.duration}
										</span>
									</div>

									<div className="min-w-0 flex-1 sm:text-right">
										<p className="text-3xl font-bold">{flight.arrivalTime}</p>
										<p className="mt-1 text-base font-medium">{flight.to}</p>
										{departureDate && (
											<p className="text-sm text-muted-foreground">{departureDate}</p>
										)}
									</div>
								</div>

								<div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
									<InfoPill
										icon={<Ticket aria-hidden="true" className="size-4" />}
										label="Flight no."
										value={flight.id.toUpperCase()}
									/>
									<InfoPill
										icon={<Plane aria-hidden="true" className="size-4" />}
										label="Class"
										value="Economy"
									/>
									<InfoPill
										icon={<Briefcase aria-hidden="true" className="size-4" />}
										label="Baggage"
										value="15 kg"
									/>
									<InfoPill
										icon={<Users aria-hidden="true" className="size-4" />}
										label="Travelers"
										value={String(travelers)}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Inclusions */}
						<Card className="overflow-hidden">
							<CardHeader className="border-b bg-background p-5 sm:p-6">
								<CardTitle className="text-xl">What's included</CardTitle>
								<CardDescription>Fare conditions for this booking</CardDescription>
							</CardHeader>
							<CardContent className="bg-card p-5 sm:p-6">
								<ul className="grid gap-3 sm:grid-cols-2">
									{INCLUSIONS.map(item => (
										<li className="flex items-start gap-3" key={item}>
											<CheckCircle2
												aria-hidden="true"
												className="mt-0.5 size-4 shrink-0 text-primary"
											/>
											<span className="text-sm">{item}</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>

						{/* Policy */}
						<Card className="overflow-hidden">
							<CardHeader className="border-b bg-background p-5 sm:p-6">
								<CardTitle className="flex items-center gap-2 text-xl">
									<ShieldCheck aria-hidden="true" className="size-5" />
									Fare policy
								</CardTitle>
							</CardHeader>
							<CardContent className="bg-card p-5 sm:p-6">
								<dl className="grid gap-4 sm:grid-cols-3">
									{POLICIES.map(p => (
										<div key={p.label}>
											<dt className="text-xs font-medium text-muted-foreground">
												{p.label}
											</dt>
											<dd className="mt-1 text-sm font-medium">{p.value}</dd>
										</div>
									))}
								</dl>
							</CardContent>
						</Card>

						{/* Carbon emissions */}
						<CarbonBadge fromCode={flight.fromCode} toCode={flight.toCode} variant="detailed" />

						{/* Price prediction */}
						<PricePrediction
							currentPrice={flight.price}
							departureDate={departureDate || undefined}
							history={flight.priceHistory}
						/>
					</div>

					{/* Sidebar */}
					<div className="flex flex-col gap-4">
						<Card className="sticky top-20 overflow-hidden">
							<CardHeader className="border-b bg-background p-5">
								<CardTitle className="text-lg">Price summary</CardTitle>
							</CardHeader>
							<CardContent className="bg-card p-5">
								<div className="grid gap-3">
									<div className="flex items-center justify-between gap-4">
										<span className="text-sm text-muted-foreground">
											Base fare × {travelers}
										</span>
										<span className="text-sm font-medium">
											${flight.price} × {travelers}
										</span>
									</div>
									<div className="flex items-center justify-between gap-4">
										<span className="text-sm text-muted-foreground">Taxes &amp; fees</span>
										<span className="text-sm font-medium">Included</span>
									</div>
									<div className="flex items-center justify-between gap-4 border-t pt-3">
										<span className="font-semibold">Total</span>
										<span className="text-xl font-bold">${totalPrice}</span>
									</div>
								</div>

								<Link
									className={buttonVariants({
										className: 'mt-6 w-full',
										size: 'lg',
									})}
									href={reservationHref}
								>
									Book now
									<ArrowRight aria-hidden="true" className="size-4 translate-y-0.5" />
								</Link>

								<p className="mt-3 text-center text-xs text-muted-foreground">
									No payment charged yet. Review on next step.
								</p>

								<div className="border-t pt-4 mt-1">
									<PriceAlertButton
										currentPrice={flight.price}
										existingAlert={existingAlert}
										flightId={flight.id}
										isLoggedIn={!!user}
									/>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
		</main>
	);
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

const INCLUSIONS = [
	'1 carry-on bag (7 kg)',
	'1 checked bag (15 kg)',
	'Seat selection included',
	'In-flight meal service',
	'Entertainment on select routes',
	'24/7 customer support',
];

const POLICIES = [
	{ label: 'Cancellation', value: 'Free within 24 h' },
	{ label: 'Date change', value: '$30 fee' },
	{ label: 'Refund', value: 'Partial refund' },
];

function getQueryValue(value: string | string[] | undefined): string {
	if (Array.isArray(value)) return value[0] ?? '';
	return value ?? '';
}
