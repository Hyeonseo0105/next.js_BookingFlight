'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DateSlot {
	date: string;   // "2026-07-15"
	price: number;  // cheapest price across all route flights for this slot
}

interface FlexibleDateGridProps {
	slots: DateSlot[];
	selectedDate: string;
	searchParams: Record<string, string>;
}

const VISIBLE = 9;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getDayLabel(dateStr: string): string {
	return WEEKDAYS[new Date(dateStr + 'T12:00:00Z').getUTCDay()] ?? '';
}

function priceToHsl(ratio: number): string {
	const hue = Math.round(120 * (1 - ratio));
	return `hsl(${hue} 55% 88%)`;
}

function priceToTextHsl(ratio: number): string {
	const hue = Math.round(120 * (1 - ratio));
	return `hsl(${hue} 70% 30%)`;
}

function priceToBorderHsl(ratio: number): string {
	const hue = Math.round(120 * (1 - ratio));
	return `hsl(${hue} 55% 68%)`;
}

function priceToBoxShadow(ratio: number): string {
	const hue = Math.round(120 * (1 - ratio));
	// ratio=0(최저가) → hue 120 초록, ratio=0.5 → hue 60 노랑, ratio=1(최고가) → hue 0 빨강
	return [
		`0 6px 18px hsl(${hue} 70% 40% / 0.28)`,
		'0 2px 6px rgba(0,0,0,0.10)',
		'inset 0 1px 0 rgba(255,255,255,0.45)',
	].join(', ');
}

function buildHref(params: Record<string, string>, dateOverride: string): string {
	const merged = { ...params, departureDate: dateOverride, page: '1' };
	const entries = Object.entries(merged).filter(([, v]) => v !== '');
	return `/search?${new URLSearchParams(Object.fromEntries(entries)).toString()}`;
}

function computeInitOffset(slots: DateSlot[], selectedDate: string): number {
	const idx = slots.findIndex(s => s.date === selectedDate);
	const anchor = idx >= 0 ? idx : Math.floor(slots.length / 2);
	return Math.max(0, Math.min(anchor - Math.floor(VISIBLE / 2), slots.length - VISIBLE));
}

export function FlexibleDateGrid({ slots, selectedDate, searchParams }: FlexibleDateGridProps) {
	const [offset, setOffset] = useState(() => computeInitOffset(slots, selectedDate));

	const visibleSlots = slots.slice(offset, offset + VISIBLE);
	const canPrev = offset > 0;
	const canNext = offset + VISIBLE < slots.length;

	const prices = slots.map(s => s.price);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);
	const range = maxPrice - minPrice || 1;

	const navBtn = (onClick: () => void, disabled: boolean, children: React.ReactNode) => (
		<button
			disabled={disabled}
			onClick={onClick}
			type="button"
			className={cn(
				'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
				disabled && 'pointer-events-none opacity-30',
			)}
		>
			{children}
		</button>
	);

	return (
		<Card className="overflow-hidden">
			<CardHeader className="border-b bg-background p-5 sm:p-6">
				<CardTitle className="text-xl">날짜별 최저가</CardTitle>
				<CardDescription>
					선택 날짜 ±7일 비교 · 날짜를 클릭하면 해당 날짜로 검색합니다
				</CardDescription>
			</CardHeader>
			<CardContent className="bg-card p-5 sm:p-6">
				<div className="flex items-center gap-3">
					{navBtn(() => setOffset(o => o - 1), !canPrev, <ChevronLeft aria-hidden="true" className="size-4" />)}

					<div className="flex flex-1 gap-4 pb-3 pt-4">
						{visibleSlots.map(({ date, price }) => {
							const isSelected = date === selectedDate;
							const ratio = (price - minPrice) / range;
							const borderColor = priceToBorderHsl(ratio);
							const priceColor = priceToTextHsl(ratio);
							const dayStr = getDayLabel(date);
							const isWeekend = dayStr === '토' || dayStr === '일';
							const [, mm, dd] = date.split('-');
							return (
								<Link
									key={date}
									href={buildHref(searchParams, date)}
									style={{
										borderColor,
										...(isSelected
											? {
												boxShadow: priceToBoxShadow(ratio),
												transform: 'translateY(-4px)',
											}
											: {}),
									}}
									className={cn(
										'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg border-2 py-2.5 text-center transition-all duration-150 hover:-translate-y-1 hover:shadow-md',
										isSelected ? 'bg-background' : 'bg-card',
									)}
								>
									<span
										className={cn(
											'text-[10px] font-medium',
											isWeekend ? 'text-red-500' : 'text-muted-foreground',
										)}
									>
										{dayStr}
									</span>
									<span className="text-xs font-semibold text-foreground">
										{mm}/{dd}
									</span>
									<span
										className="mt-1 text-[15px] font-bold"
										style={{ color: priceColor }}
									>
										${price}
									</span>
								</Link>
							);
						})}
					</div>

					{navBtn(() => setOffset(o => o + 1), !canNext, <ChevronRight aria-hidden="true" className="size-4" />)}
				</div>

				{/* Legend */}
				<div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span className="inline-block size-3 rounded-sm" style={{ backgroundColor: priceToHsl(0) }} />
						최저가
					</span>
					<span className="flex items-center gap-1.5">
						<span className="inline-block size-3 rounded-sm" style={{ backgroundColor: priceToHsl(0.5) }} />
						중간
					</span>
					<span className="flex items-center gap-1.5">
						<span className="inline-block size-3 rounded-sm" style={{ backgroundColor: priceToHsl(1) }} />
						최고가
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
