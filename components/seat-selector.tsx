'use client';

import type { SeatData } from '@/lib/seat-types';

// Business class: 2+2 (A C | D F)
const BUSINESS_LEFT  = ['A', 'C'];
const BUSINESS_RIGHT = ['D', 'F'];
// Economy class: 3+3 (A B C | D E F)
const ECONOMY_LEFT   = ['A', 'B', 'C'];
const ECONOMY_RIGHT  = ['D', 'E', 'F'];

const BUSINESS_ROWS = [1, 2, 3, 4];
const ECONOMY_ROWS  = Array.from({ length: 21 }, (_, i) => i + 5); // 5–25

interface SeatSelectorProps {
	seats: SeatData[];
	travelers: number;
	selectedSeatIds: string[];
	onSelectionChange: (ids: string[]) => void;
}

export function SeatSelector({
	seats,
	travelers,
	selectedSeatIds,
	onSelectionChange,
}: SeatSelectorProps) {
	// Index seats by "row-col" for fast lookup
	const seatMap = new Map<string, SeatData>();
	for (const seat of seats) {
		seatMap.set(`${seat.row}-${seat.column}`, seat);
	}

	function handleClick(seat: SeatData) {
		if (seat.status === 'RESERVED') return;

		if (selectedSeatIds.includes(seat.id)) {
			// Deselect
			onSelectionChange(selectedSeatIds.filter(id => id !== seat.id));
		} else if (selectedSeatIds.length < travelers) {
			// Select
			onSelectionChange([...selectedSeatIds, seat.id]);
		}
	}

	const selectedCount = selectedSeatIds.length;

	return (
		<div className="flex flex-col items-center gap-4">
			{/* Selection counter */}
			<p className="text-sm text-muted-foreground">
				좌석 선택:{' '}
				<span className={selectedCount === travelers ? 'font-semibold text-primary' : 'font-semibold'}>
					{selectedCount} / {travelers}
				</span>
				{selectedCount < travelers && (
					<span className="ml-1">— {travelers - selectedCount}석을 더 선택하세요</span>
				)}
			</p>

			{/* Seat map — overflow-x-auto lets mobile users scroll horizontally */}
			<div className="flex w-full justify-center overflow-x-auto pb-2">
				<div className="inline-flex min-w-max flex-col items-center gap-1 px-2">
					{/* Airplane nose */}
					<div className="-translate-x-[3px] mb-1 flex h-10 w-32 items-end justify-center overflow-hidden">
						<div className="h-10 w-32 rounded-t-full border border-border bg-muted/40" />
					</div>

					{/* ── BUSINESS CLASS ── */}
					<SectionLabel label="BUSINESS CLASS" />
					<ColHeader left={BUSINESS_LEFT} right={BUSINESS_RIGHT} />
					{BUSINESS_ROWS.map(row => (
						<SeatRow
							key={row}
							row={row}
							leftCols={BUSINESS_LEFT}
							rightCols={BUSINESS_RIGHT}
							seatMap={seatMap}
							selectedSeatIds={selectedSeatIds}
							onSeatClick={handleClick}
						/>
					))}

					{/* ── ECONOMY CLASS ── */}
					<SectionLabel label="ECONOMY CLASS" />
					<ColHeader left={ECONOMY_LEFT} right={ECONOMY_RIGHT} />
					{ECONOMY_ROWS.map(row => (
						<SeatRow
							key={row}
							row={row}
							leftCols={ECONOMY_LEFT}
							rightCols={ECONOMY_RIGHT}
							seatMap={seatMap}
							selectedSeatIds={selectedSeatIds}
							onSeatClick={handleClick}
							exitRow={row === 12 || row === 13}
						/>
					))}

					{/* Airplane tail */}
					<div className="mt-1 flex h-6 w-32 items-start justify-center overflow-hidden">
						<div className="h-6 w-32 rounded-b-full border border-border bg-muted/40" />
					</div>
				</div>
			</div>

			{/* Legend */}
			<div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
				<LegendItem color="bg-emerald-100 border-emerald-500" label="선택 가능" />
				<LegendItem color="bg-blue-500 border-blue-600" label="내가 선택" />
				<LegendItem color="bg-red-100 border-red-300" label="예약 완료" />
			</div>

			{/* Seat fee guide */}
			<div className="flex flex-wrap justify-center gap-x-5 gap-y-1 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
				<span><span className="font-semibold text-foreground">비즈니스석</span> · 1–4행</span>
				<span className="font-medium text-amber-600">+$80</span>
				<span className="text-border">·</span>
				<span><span className="font-semibold text-foreground">비상구 좌석</span> · 12, 13행</span>
				<span className="font-medium text-amber-600">+$15</span>
				<span className="text-border">·</span>
				<span><span className="font-semibold text-foreground">창가 좌석</span> · A, F열</span>
				<span className="font-medium text-amber-600">+$5</span>
				<span className="text-border">·</span>
				<span>일반 이코노미</span>
				<span className="font-medium text-muted-foreground">무료</span>
			</div>

			{/* Selected seat list */}
			{selectedSeatIds.length > 0 && (
				<div className="flex flex-wrap justify-center gap-2">
					{selectedSeatIds.map(id => {
						const seat = seats.find(s => s.id === id);
						if (!seat) return null;
						return (
							<span
								key={id}
								className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
							>
								{seat.seatNumber}
								{seat.priceModifier > 0 && (
									<span className="text-blue-500">+${seat.priceModifier}</span>
								)}
								<button
									aria-label={`${seat.seatNumber} 선택 해제`}
									className="ml-0.5 text-blue-400 hover:text-blue-600"
									onClick={() => onSelectionChange(selectedSeatIds.filter(i => i !== id))}
									type="button"
								>
									×
								</button>
							</span>
						);
					})}
				</div>
			)}
		</div>
	);
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
	return (
		<div className="my-2 flex w-full items-center gap-2">
			<div className="h-px flex-1 bg-border" />
			<span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
				{label}
			</span>
			<div className="h-px flex-1 bg-border" />
		</div>
	);
}

function ColHeader({
	left,
	right,
}: {
	left: readonly string[];
	right: readonly string[];
}) {
	return (
		<div className="flex items-center gap-1">
			<span className="w-4" /> {/* row number placeholder */}
			{left.map(col => (
				<span
					className="flex h-6 w-8 items-center justify-center text-[10px] font-semibold text-muted-foreground"
					key={col}
				>
					{col}
				</span>
			))}
			<span className="w-5" /> {/* aisle */}
			{right.map(col => (
				<span
					className="flex h-6 w-8 items-center justify-center text-[10px] font-semibold text-muted-foreground"
					key={col}
				>
					{col}
				</span>
			))}
		</div>
	);
}

interface SeatRowProps {
	row: number;
	leftCols: readonly string[];
	rightCols: readonly string[];
	seatMap: Map<string, SeatData>;
	selectedSeatIds: string[];
	onSeatClick: (seat: SeatData) => void;
	exitRow?: boolean;
}

function SeatRow({
	row,
	leftCols,
	rightCols,
	seatMap,
	selectedSeatIds,
	onSeatClick,
	exitRow,
}: SeatRowProps) {
	return (
		<div className="flex items-center gap-1">
			{/* Row number */}
			<span className="flex w-2 justify-end pr-1 text-[10px] text-muted-foreground">
				{exitRow ? 'Exit' : row}
			</span>

			{leftCols.map(col => {
				const seat = seatMap.get(`${row}-${col}`);
				return seat
					? <SeatButton key={col} seat={seat} selected={selectedSeatIds.includes(seat.id)} onClick={onSeatClick} />
					: <span className="h-7 w-7" key={col} />;
			})}

			{/* Aisle */}
			<span className="flex w-5 justify-center text-[10px] text-muted-foreground">│</span>

			{rightCols.map(col => {
				const seat = seatMap.get(`${row}-${col}`);
				return seat
					? <SeatButton key={col} seat={seat} selected={selectedSeatIds.includes(seat.id)} onClick={onSeatClick} />
					: <span className="h-7 w-7" key={col} />;
			})}
		</div>
	);
}

interface SeatButtonProps {
	seat: SeatData;
	selected: boolean;
	onClick: (seat: SeatData) => void;
}

function SeatButton({ seat, selected, onClick }: SeatButtonProps) {
	const isReserved = seat.status === 'RESERVED';

	let colorClass: string;
	if (selected) {
		colorClass = 'bg-blue-500 border-blue-600 text-white active:bg-blue-600';
	} else if (isReserved) {
		colorClass = 'bg-red-100 border-red-300 text-red-300 cursor-not-allowed';
	} else {
		colorClass = 'bg-emerald-100 border-emerald-500 text-emerald-700 hover:bg-emerald-200 active:bg-emerald-300';
	}

	return (
		<button
			aria-disabled={isReserved}
			aria-label={`좌석 ${seat.seatNumber}${isReserved ? ' (예약됨)' : selected ? ' (선택됨)' : ''}`}
			aria-pressed={selected}
			className={`touch-manipulation flex h-8 w-8 items-center justify-center rounded border text-[9px] font-bold transition-colors ${isReserved ? 'cursor-not-allowed' : 'cursor-pointer'} ${colorClass}`}
			disabled={isReserved}
			onClick={() => onClick(seat)}
			title={`${seat.seatNumber} · ${seat.class}${seat.priceModifier > 0 ? ` · +$${seat.priceModifier}` : ''}`}
			type="button"
		>
			{seat.column}
		</button>
	);
}

interface LegendItemProps {
	color: string;
	label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
	return (
		<span className="flex items-center gap-1.5">
			<span className={`h-4 w-4 rounded border ${color}`} />
			{label}
		</span>
	);
}
