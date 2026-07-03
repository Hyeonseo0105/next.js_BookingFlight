import { Leaf } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { estimateCo2Kg, type SeatClass } from '@/lib/airports';

interface CarbonBadgeProps {
	fromCode: string;
	toCode: string;
	seatClass?: SeatClass;
	variant?: 'compact' | 'detailed';
}

export function CarbonBadge({ fromCode, toCode, seatClass = 'ECONOMY', variant = 'compact' }: CarbonBadgeProps) {
	const estimate = estimateCo2Kg(fromCode, toCode, seatClass);
	if (!estimate) return null;

	if (variant === 'compact') {
		return (
			<span className="inline-flex w-fit items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
				<Leaf aria-hidden="true" className="size-3" />
				~{estimate.co2Kg} kg CO₂
			</span>
		);
	}

	return (
		<Card className="overflow-hidden">
			<CardHeader className="border-b bg-background p-5 sm:p-6">
				<CardTitle className="flex items-center gap-2 text-xl">
					<Leaf aria-hidden="true" className="size-5 text-green-600" />
					예상 탄소 배출량
				</CardTitle>
				<CardDescription>
					<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
						1인당 ~{estimate.co2Kg} kg CO₂
					</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="bg-card p-5 sm:p-6">
				<dl className="grid gap-4 sm:grid-cols-2">
					<div>
						<dt className="text-xs font-medium text-muted-foreground">거리</dt>
						<dd className="mt-1 text-sm font-medium">{estimate.distanceKm.toLocaleString()} km</dd>
					</div>
					<div>
						<dt className="text-xs font-medium text-muted-foreground">기차 이용 시</dt>
						<dd className="mt-1 text-sm font-medium">~{estimate.trainCo2Kg} kg CO₂</dd>
					</div>
				</dl>
				{estimate.vsTrainMultiple !== null && estimate.vsTrainMultiple > 1 && (
					<p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
						기차 대비 약 <span className="font-medium text-foreground">{estimate.vsTrainMultiple.toFixed(1)}배</span>의 탄소를 배출합니다.
					</p>
				)}
				<p className="mt-3 text-xs text-muted-foreground/60">
					* 구간 거리와 좌석 등급 기반 단순 추정치이며, 실제 배출량은 항공기 기종·탑승률에 따라 달라질 수 있습니다.
				</p>
			</CardContent>
		</Card>
	);
}
