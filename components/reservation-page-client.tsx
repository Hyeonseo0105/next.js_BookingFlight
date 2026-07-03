'use client';

import { useState } from 'react';
import { Clock, CreditCard, Plane, Shield } from 'lucide-react';

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { ReservationForm } from '@/components/reservation-form';
import type { SeatData } from '@/lib/seat-types';

interface FlightSnapshot {
	id: string;
	price: number;
	airline: string;
	departureTime: string;
	arrivalTime: string;
	fromCode: string;
	toCode: string;
	duration: string;
}

interface ReservationPageClientProps {
	departureDate: string;
	flight: FlightSnapshot;
	returnFlight: FlightSnapshot | null;
	returnDate: string;
	tripType: string;
	travelers: number;
	seats: SeatData[];
}

const TRUST_ITEMS = [
	{
		description: 'Book up to 24 h before departure.',
		icon: <Shield aria-hidden="true" className="size-4" />,
		label: 'Secure checkout',
	},
	{
		description: 'Free cancellation within 24 h.',
		icon: <Clock aria-hidden="true" className="size-4" />,
		label: 'Flexible policy',
	},
	{
		description: 'Instant email confirmation.',
		icon: <CreditCard aria-hidden="true" className="size-4" />,
		label: 'Instant booking',
	},
];

export function ReservationPageClient({
	departureDate,
	flight,
	returnFlight,
	returnDate,
	tripType,
	travelers,
	seats,
}: ReservationPageClientProps) {
	const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
	const isRoundTrip = tripType === 'ROUND_TRIP' && !!returnFlight;

	const seatFee = selectedSeatIds.reduce((sum, id) => {
		const seat = seats.find(s => s.id === id);
		return sum + (seat?.priceModifier ?? 0);
	}, 0);

	const outboundFare = flight.price * travelers;
	const returnFare = isRoundTrip && returnFlight ? returnFlight.price * travelers : 0;
	const totalPrice = outboundFare + returnFare + seatFee;

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
			{/* Form column */}
			<div className="flex flex-col gap-6">
				<ReservationForm
					departureDate={departureDate}
					flight={flight}
					returnFlight={returnFlight}
					returnDate={returnDate}
					tripType={tripType}
					onSeatSelectionChange={setSelectedSeatIds}
					seats={seats}
					seatFee={seatFee}
					selectedSeatIds={selectedSeatIds}
					totalPrice={totalPrice}
					travelers={travelers}
				/>

				{/* Trust badges */}
				<div className="grid gap-3 sm:grid-cols-3">
					{TRUST_ITEMS.map(item => (
						<div
							className="flex items-start gap-3 rounded-lg border bg-card p-4"
							key={item.label}
						>
							<span className="mt-0.5 text-muted-foreground">{item.icon}</span>
							<div>
								<p className="text-sm font-medium">{item.label}</p>
								<p className="text-xs text-muted-foreground">{item.description}</p>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Sidebar */}
			<div className="flex flex-col gap-4">
				<Card className="sticky top-6 overflow-hidden">
					<CardHeader className="border-b bg-background p-5">
						<CardTitle className="text-lg">Order summary</CardTitle>
					</CardHeader>
					<CardContent className="bg-card p-5">
						{/* Outbound flight snapshot */}
						<FlightSummaryBlock
							flight={flight}
							date={departureDate}
							label={isRoundTrip ? 'Outbound' : undefined}
						/>

						{/* Return flight snapshot */}
						{isRoundTrip && returnFlight && (
							<FlightSummaryBlock
								flight={returnFlight}
								date={returnDate}
								label="Return"
								className="mt-3"
							/>
						)}

						{/* Price breakdown */}
						<div className="mt-5 grid gap-3">
							<div className="flex items-center justify-between gap-4">
								<span className="text-sm text-muted-foreground">
									Outbound × {travelers}
								</span>
								<span className="text-sm font-medium">${outboundFare}</span>
							</div>
							{isRoundTrip && returnFlight && (
								<div className="flex items-center justify-between gap-4">
									<span className="text-sm text-muted-foreground">
										Return × {travelers}
									</span>
									<span className="text-sm font-medium">${returnFare}</span>
								</div>
							)}
							{seatFee > 0 && (
								<div className="flex items-center justify-between gap-4">
									<span className="text-sm text-muted-foreground">좌석 추가 요금</span>
									<span className="text-sm font-medium text-amber-600">+${seatFee}</span>
								</div>
							)}
							<div className="flex items-center justify-between gap-4 border-t pt-3">
								<span className="font-semibold">합계</span>
								<span className="text-lg font-bold">${totalPrice}</span>
							</div>
							{seats.length > 0 && selectedSeatIds.length === 0 && (
								<p className="text-xs text-muted-foreground">
									* 좌석 선택 후 추가 요금이 반영됩니다.
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

interface FlightSummaryBlockProps {
	flight: FlightSnapshot;
	date: string;
	label?: string;
	className?: string;
}

function FlightSummaryBlock({ flight, date, label, className }: FlightSummaryBlockProps) {
	return (
		<div className={`rounded-lg border bg-background p-4 ${className ?? ''}`}>
			{label && (
				<p className="mb-1 text-xs font-semibold text-primary">{label}</p>
			)}
			<p className="text-xs font-medium text-muted-foreground">{flight.airline}</p>
			<div className="mt-2 flex items-center gap-3">
				<div>
					<p className="text-lg font-semibold">{flight.departureTime}</p>
					<p className="text-xs text-muted-foreground">{flight.fromCode}</p>
				</div>
				<div className="flex flex-1 items-center gap-1 text-muted-foreground">
					<span className="h-px flex-1 bg-border" />
					<Plane aria-hidden="true" className="size-3.5" />
					<span className="h-px flex-1 bg-border" />
				</div>
				<div className="text-right">
					<p className="text-lg font-semibold">{flight.arrivalTime}</p>
					<p className="text-xs text-muted-foreground">{flight.toCode}</p>
				</div>
			</div>
			<div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
				<Clock aria-hidden="true" className="size-3" />
				{flight.duration}
				{date && (
					<>
						<span>·</span>
						<span>{date}</span>
					</>
				)}
			</div>
		</div>
	);
}
