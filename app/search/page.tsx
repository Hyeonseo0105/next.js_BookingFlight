import Link from 'next/link';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronLeft, ChevronRight, Clock, Plane, Users } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';
import { FlexibleDateGrid, type DateSlot } from '@/components/flexible-date-grid';
import { CarbonBadge } from '@/components/carbon-badge';
import type { Flight } from '@/lib/generated/prisma/client';

const FLIGHTS_PER_PAGE = 12;

interface SearchPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
	const params = await searchParams;
	const from = getQueryValue(params.from);
	const to = getQueryValue(params.to);
	const departureDate = getQueryValue(params.departureDate);
	const returnDate = getQueryValue(params.returnDate);
	const travelers = getQueryValue(params.travelers);
	const tripType = getQueryValue(params.tripType) || 'ONE_WAY';
	const sort = getQueryValue(params.sort) || 'price';
	const dir = getQueryValue(params.dir) || 'asc';
	const page = Math.max(1, parseInt(getQueryValue(params.page) || '1', 10));
	const outboundFlightId = getQueryValue(params.outboundFlightId);

	const isRoundTrip = tripType === 'ROUND_TRIP';

	// 출발편 (항상 조회)
	const allFlights = await prisma.flight.findMany({
		where: {
			...(from && { from: { contains: from } }),
			...(to && {
				OR: [
					{ to: { contains: to } },
					{ toKr: { contains: to } },
				],
			}),
		},
	});

	// 날짜 유연 가격 비교 그리드 (출발편 선택 단계에서만, departureDate 필요)
	const dateGridSlots =
		from && to && departureDate && !(isRoundTrip && outboundFlightId)
			? await fetchDateGridSlots(from, to, departureDate)
			: null;

	// 왕복: 선택된 출발편 + 귀환편 조회
	const selectedOutbound = isRoundTrip && outboundFlightId
		? (allFlights.find(f => f.id === outboundFlightId)
			?? await prisma.flight.findUnique({ where: { id: outboundFlightId } }))
		: null;

	const returnFlights: Flight[] = isRoundTrip && outboundFlightId
		? await prisma.flight.findMany({
			where: {
				...(to && { from: { contains: to } }),
				...(from && {
					OR: [
						{ to: { contains: from } },
						{ toKr: { contains: from } },
					],
				}),
			},
		})
		: [];

	// 정렬 & 페이지네이션 (출발편 목록 또는 귀환편 목록에 적용)
	const activeList = isRoundTrip && outboundFlightId ? returnFlights : allFlights;
	const sorted = sortFlights(activeList, sort, dir);
	const totalPages = Math.max(1, Math.ceil(sorted.length / FLIGHTS_PER_PAGE));
	const currentPage = Math.min(page, totalPages);
	const flights = sorted.slice(
		(currentPage - 1) * FLIGHTS_PER_PAGE,
		currentPage * FLIGHTS_PER_PAGE,
	);

	const baseParams = { from, to, departureDate, returnDate, travelers, tripType };
	const roundTripBase = { ...baseParams, outboundFlightId };

	return (
		<main className="min-h-screen bg-muted/30 px-4 py-8 text-foreground sm:px-6 lg:px-8">
			<section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">
							{isRoundTrip ? 'Round trip' : 'One way'}
						</p>
						<h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
							{isRoundTrip && outboundFlightId ? 'Select return flight' : 'Available flights'}
						</h1>
						{isRoundTrip && !outboundFlightId && (
							<p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
								Select your outbound flight first.
							</p>
						)}
					</div>
					<SearchSummary
						departureDate={departureDate}
						from={from}
						returnDate={returnDate}
						to={to}
						travelers={travelers}
						tripType={tripType}
					/>
				</div>

				{/* 왕복: 선택된 출발편 요약 */}
				{isRoundTrip && selectedOutbound && (
					<Card className="border-primary/30 bg-primary/5">
						<CardContent className="p-4">
							<div className="flex flex-wrap items-center justify-between gap-4">
								<div className="flex items-center gap-3">
									<CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
									<div>
										<p className="text-xs font-medium text-muted-foreground">Outbound selected</p>
										<p className="text-sm font-semibold">
											{selectedOutbound.from} → {selectedOutbound.to}
										</p>
										<p className="text-xs text-muted-foreground">
											{selectedOutbound.airline} · {selectedOutbound.departureTime} – {selectedOutbound.arrivalTime} · {selectedOutbound.duration}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-sm font-semibold">${selectedOutbound.price} / person</span>
									<Link
										href={`/reservation?flightId=${selectedOutbound.id}&tripType=ONE_WAY&departureDate=${departureDate}&travelers=${travelers || '1'}`}
										className={buttonVariants({ size: 'sm', variant: 'outline' })}
									>
										Book one-way instead
									</Link>
									<Link
										href={buildHref(baseParams, { page: '1' })}
										className={buttonVariants({ size: 'sm', variant: 'outline' })}
									>
										Change
									</Link>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				<Card className="overflow-hidden">
					<CardHeader className="border-b bg-background p-5 sm:p-6">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<CardTitle className="text-xl">
									{isRoundTrip && outboundFlightId ? 'Return flights' : 'Outbound flights'}
								</CardTitle>
								<CardDescription>
									{sorted.length} flight{sorted.length !== 1 ? 's' : ''} found
								</CardDescription>
							</div>
							<SortControls
								baseParams={isRoundTrip && outboundFlightId ? roundTripBase : baseParams}
								currentSort={sort}
								currentDir={dir}
							/>
						</div>
					</CardHeader>
					<CardContent className="bg-card p-5 sm:p-6">
						{flights.length > 0 ? (
							<>
								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
									{flights.map(flight => (
										<FlightCard
											key={flight.id}
											flight={flight}
											departureDate={isRoundTrip && outboundFlightId ? returnDate : departureDate}
											travelers={travelers}
											tripType={tripType}
											outboundFlightId={outboundFlightId}
											returnDate={returnDate}
											baseParams={baseParams}
										/>
									))}
								</div>
								{totalPages > 1 && (
									<Pagination
										baseParams={isRoundTrip && outboundFlightId ? roundTripBase : baseParams}
										currentPage={currentPage}
										dir={dir}
										sort={sort}
										totalPages={totalPages}
									/>
								)}
							</>
						) : (
							<div className="rounded-lg border border-dashed p-8 text-center">
								<p className="text-sm font-medium">No matching flights</p>
								<p className="mt-2 text-sm text-muted-foreground">
									{isRoundTrip && outboundFlightId
										? 'This route has no return flights yet. Use "Book one-way instead" above to continue.'
										: 'Try a broader origin or destination query.'}
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				{dateGridSlots && (
					<FlexibleDateGrid
						key={departureDate}
						searchParams={baseParams}
						selectedDate={departureDate}
						slots={dateGridSlots}
					/>
				)}
			</section>
		</main>
	);
}

// ─── Sort controls ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
	{ key: 'price', label: '가격' },
	{ key: 'departureTime', label: '출발시간' },
	{ key: 'duration', label: '소요시간' },
] as const;

interface SortControlsProps {
	baseParams: Record<string, string>;
	currentSort: string;
	currentDir: string;
}

function SortControls({ baseParams, currentSort, currentDir }: SortControlsProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{SORT_OPTIONS.map(({ key, label }) => {
				const isActive = currentSort === key;
				const nextDir = isActive ? (currentDir === 'asc' ? 'desc' : 'asc') : 'asc';
				const Icon = isActive
					? (currentDir === 'desc' ? ArrowUp : ArrowDown)
					: null;

				return (
					<Link
						key={key}
						href={buildHref(baseParams, { sort: key, dir: nextDir, page: '1' })}
						className={buttonVariants({
							variant: isActive ? 'default' : 'outline',
							size: 'sm',
						})}
					>
						{label}
						{Icon && <Icon aria-hidden="true" className="ml-1 size-3" />}
					</Link>
				);
			})}
		</div>
	);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
	baseParams: Record<string, string>;
	currentPage: number;
	dir: string;
	sort: string;
	totalPages: number;
}

function Pagination({ baseParams, currentPage, dir, sort, totalPages }: PaginationProps) {
	const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

	return (
		<nav
			aria-label="Pagination"
			className="mt-6 flex items-center justify-center gap-1"
		>
			<Link
				aria-disabled={currentPage <= 1}
				href={buildHref(baseParams, { sort, dir, page: String(currentPage - 1) })}
				className={cn(
					buttonVariants({ variant: 'outline', size: 'sm' }),
					currentPage <= 1 && 'pointer-events-none opacity-40',
				)}
			>
				<ChevronLeft aria-hidden="true" className="size-4" />
			</Link>

			{pages.map(p => (
				<Link
					key={p}
					href={buildHref(baseParams, { sort, dir, page: String(p) })}
					aria-current={currentPage === p ? 'page' : undefined}
					className={cn(
						buttonVariants({
							variant: currentPage === p ? 'default' : 'ghost',
							size: 'sm',
						}),
						'min-w-9',
					)}
				>
					{p}
				</Link>
			))}

			<Link
				aria-disabled={currentPage >= totalPages}
				href={buildHref(baseParams, { sort, dir, page: String(currentPage + 1) })}
				className={cn(
					buttonVariants({ variant: 'outline', size: 'sm' }),
					currentPage >= totalPages && 'pointer-events-none opacity-40',
				)}
			>
				<ChevronRight aria-hidden="true" className="size-4" />
			</Link>
		</nav>
	);
}

// ─── Search summary ───────────────────────────────────────────────────────────

interface SearchSummaryProps {
	departureDate: string;
	from: string;
	returnDate: string;
	to: string;
	travelers: string;
	tripType: string;
}

function SearchSummary({ departureDate, from, returnDate, to, travelers, tripType }: SearchSummaryProps) {
	return (
		<Card className="w-full sm:max-w-md">
			<CardContent className="grid gap-3 p-4">
				<div className="flex items-center justify-between gap-4">
					<span className="text-sm text-muted-foreground">Route</span>
					<span className="text-right text-sm font-medium">
						{from || 'Any origin'}{' -> '}{to || 'Any destination'}
					</span>
				</div>
				<div className="flex items-center justify-between gap-4">
					<span className="text-sm text-muted-foreground">Dates</span>
					<span className="text-right text-sm font-medium">
						{departureDate || 'Any date'}
						{tripType === 'ROUND_TRIP' && ` / ${returnDate || '귀환일 미정'}`}
					</span>
				</div>
				<div className="flex items-center justify-between gap-4">
					<span className="flex items-center gap-2 text-sm text-muted-foreground">
						<Users aria-hidden="true" className="size-4" />
						Travelers
					</span>
					<span className="text-sm font-medium">{travelers || '1'}</span>
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Flight card ──────────────────────────────────────────────────────────────

interface FlightCardProps {
	flight: Flight;
	departureDate: string;
	travelers: string;
	tripType: string;
	outboundFlightId: string;
	returnDate: string;
	baseParams: Record<string, string>;
}

function FlightCard({
	flight,
	departureDate,
	travelers,
	tripType,
	outboundFlightId,
	returnDate,
	baseParams,
}: FlightCardProps) {
	const isRoundTrip = tripType === 'ROUND_TRIP';
	const selectingReturn = isRoundTrip && !!outboundFlightId;

	// 편도: 상세 페이지로 이동
	// 왕복 출발편 선택: outboundFlightId를 URL에 추가
	// 왕복 귀환편 선택: 예약 페이지로 이동
	const href = selectingReturn
		? `/reservation?flightId=${outboundFlightId}&returnFlightId=${flight.id}&tripType=ROUND_TRIP&departureDate=${baseParams.departureDate}&returnDate=${returnDate}&travelers=${travelers || '1'}`
		: isRoundTrip
			? buildHref(baseParams, { outboundFlightId: flight.id, page: '1' })
			: `/flights/${flight.id}?departureDate=${departureDate}&travelers=${travelers || '1'}`;

	const ctaLabel = selectingReturn
		? 'Select return'
		: isRoundTrip
			? 'Select outbound'
			: 'View details';

	return (
		<Card className="flex h-full flex-col">
			<CardHeader className="p-5">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-2">
						<CardDescription>{flight.airline}</CardDescription>
						<CardTitle className="text-lg">
							{flight.from}{' -> '}{flight.to}
						</CardTitle>
					</div>
					<span className="rounded-md bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground">
						${flight.price}
					</span>
				</div>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0">
				<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
					<TimeBlock label="Depart" value={flight.departureTime} />
					<div className="flex items-center gap-2 text-muted-foreground">
						<span className="h-px w-6 bg-border" />
						<Plane aria-hidden="true" className="size-4" />
						<span className="h-px w-6 bg-border" />
					</div>
					<TimeBlock align="right" label="Arrive" value={flight.arrivalTime} />
				</div>
				<div className="flex items-center justify-between gap-2 border-t pt-4">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Clock aria-hidden="true" className="size-4" />
						{flight.duration}
					</div>
					<CarbonBadge fromCode={flight.fromCode} toCode={flight.toCode} />
				</div>
				<Link
					className={buttonVariants({ className: 'mt-auto w-full', size: 'sm' })}
					href={href}
				>
					{ctaLabel}
				</Link>
			</CardContent>
		</Card>
	);
}

// ─── Time block ───────────────────────────────────────────────────────────────

interface TimeBlockProps {
	align?: 'left' | 'right';
	label: string;
	value: string;
}

function TimeBlock({ align = 'left', label, value }: TimeBlockProps) {
	return (
		<div className={align === 'right' ? 'text-right' : undefined}>
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-xl font-semibold">{value}</p>
		</div>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortFlights(flights: Flight[], sort: string, dir: string): Flight[] {
	const sign = dir === 'desc' ? -1 : 1;
	return [...flights].sort((a, b) => {
		if (sort === 'departureTime') return sign * a.departureTime.localeCompare(b.departureTime);
		if (sort === 'duration') return sign * (parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration));
		return sign * (a.price - b.price);
	});
}

function parseDurationMinutes(duration: string): number {
	const h = duration.match(/(\d+)h/);
	const m = duration.match(/(\d+)m/);
	return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

function buildHref(base: Record<string, string>, overrides: Record<string, string>): string {
	const entries = Object.entries({ ...base, ...overrides }).filter(([, v]) => v !== '');
	return `/search?${new URLSearchParams(Object.fromEntries(entries)).toString()}`;
}

function getQueryValue(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? '';
	return value ?? '';
}

// ─── Flexible date grid data ──────────────────────────────────────────────────

// Price history index 44 = 2026-06-29 (the reference "today" used in seed)
const PRICE_HISTORY_REFERENCE = new Date('2026-06-29T00:00:00Z');
const PRICE_HISTORY_LEN = 45;

async function fetchDateGridSlots(
	from: string,
	to: string,
	departureDate: string,
): Promise<DateSlot[] | null> {
	if (!from || !to || !departureDate) return null;

	const routeFlights = await prisma.flight.findMany({
		where: {
			from: { contains: from },
			OR: [{ to: { contains: to } }, { toKr: { contains: to } }],
		},
		include: { priceHistory: { orderBy: { recordedAt: 'asc' } } },
	});

	if (routeFlights.length === 0) return null;

	const anchor = new Date(departureDate + 'T00:00:00Z');
	const RANGE = 7;
	const slots: DateSlot[] = [];

	for (let d = -RANGE; d <= RANGE; d++) {
		const slotDate = new Date(anchor);
		slotDate.setUTCDate(slotDate.getUTCDate() + d);
		const dateStr = slotDate.toISOString().slice(0, 10);

		// Map the display date onto the price history index.
		// Index 44 = PRICE_HISTORY_REFERENCE; each day offset shifts by 1.
		const dayOffset = Math.round(
			(slotDate.getTime() - PRICE_HISTORY_REFERENCE.getTime()) / 86_400_000,
		);
		const histIdx = Math.max(0, Math.min(PRICE_HISTORY_LEN - 1, PRICE_HISTORY_LEN - 1 + dayOffset));

		let minPrice = Infinity;
		for (const flight of routeFlights) {
			const price = flight.priceHistory[histIdx]?.price ?? flight.price;
			if (price < minPrice) minPrice = price;
		}

		slots.push({ date: dateStr, price: minPrice === Infinity ? 0 : minPrice });
	}

	return slots;
}
