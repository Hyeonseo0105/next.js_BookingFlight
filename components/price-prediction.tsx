import { TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PricePoint {
	price: number;
	recordedAt: Date;
}

interface PricePredictionProps {
	history: PricePoint[];
	currentPrice: number;
	departureDate: string | undefined;
}

function getPrediction(history: PricePoint[], currentPrice: number, departureDate: string | undefined) {
	const REFERENCE = new Date('2026-06-29T00:00:00Z');

	let daysUntil: number | null = null;
	if (departureDate) {
		const dep = new Date(departureDate);
		daysUntil = Math.ceil((dep.getTime() - REFERENCE.getTime()) / (1000 * 60 * 60 * 24));
	}

	const recent = history.slice(-7).map(h => h.price);
	const older = history.slice(-14, -7).map(h => h.price);
	const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
	const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
	const trendPct = ((avgRecent - avgOlder) / avgOlder) * 100;

	const oldestPrice = history[0]?.price ?? currentPrice;
	const changePct = ((currentPrice - oldestPrice) / oldestPrice) * 100;

	type Verdict = 'urgent' | 'buy_now' | 'wait' | 'neutral';
	let verdict: Verdict;
	let reason: string;

	if (daysUntil !== null && daysUntil <= 7) {
		verdict = 'urgent';
		reason = '출발이 임박했습니다. 지금 바로 예약하세요.';
	} else if (trendPct > 2) {
		verdict = 'buy_now';
		reason = `가격이 지난 7일 대비 ${trendPct.toFixed(1)}% 상승 중입니다.`;
	} else if (trendPct < -2) {
		verdict = 'wait';
		reason = `가격이 지난 7일 대비 ${Math.abs(trendPct).toFixed(1)}% 하락 중입니다.`;
	} else {
		verdict = 'neutral';
		reason = '가격이 안정적입니다. 지금 구매를 권장합니다.';
	}

	return { verdict, reason, trendPct, changePct, daysUntil };
}

function Sparkline({ history, trendPct }: { history: PricePoint[]; trendPct: number }) {
	const prices = history.map(h => h.price);
	const minP = Math.min(...prices);
	const maxP = Math.max(...prices);
	const range = maxP - minP || 1;
	const W = 300;
	const H = 56;
	const PAD = 6;

	const coords = prices.map((p, i) => {
		const x = (i / (prices.length - 1)) * W;
		const y = PAD + ((maxP - p) / range) * (H - PAD * 2);
		return [x, y] as [number, number];
	});

	const polyline = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
	const lastX = coords[coords.length - 1]?.[0] ?? W;
	const lastY = coords[coords.length - 1]?.[1] ?? H / 2;

	const strokeColor = trendPct >= 0 ? '#ef4444' : '#22c55e';

	return (
		<div className="relative w-full overflow-hidden rounded-md bg-muted/30">
			<svg
				className="h-14 w-full"
				preserveAspectRatio="none"
				viewBox={`0 0 ${W} ${H}`}
			>
				<defs>
					<linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stopColor={strokeColor} stopOpacity="0.12" />
						<stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
					</linearGradient>
				</defs>
				<polygon fill="url(#sparkGrad)" points={`0,${H} ${polyline} ${W},${H}`} />
				<polyline
					fill="none"
					points={polyline}
					stroke={strokeColor}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<circle cx={lastX} cy={lastY} fill={strokeColor} r="3" />
			</svg>
			<div className="absolute bottom-1 left-2 text-[10px] text-muted-foreground">45일 전</div>
			<div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">오늘</div>
		</div>
	);
}

const VERDICT_CONFIG = {
	urgent: {
		icon: <AlertCircle aria-hidden="true" className="size-5" />,
		badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
		label: '서두르세요!',
	},
	buy_now: {
		icon: <TrendingUp aria-hidden="true" className="size-5" />,
		badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
		label: '지금 사세요',
	},
	wait: {
		icon: <TrendingDown aria-hidden="true" className="size-5" />,
		badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
		label: '조금 기다려도 됩니다',
	},
	neutral: {
		icon: <CheckCircle2 aria-hidden="true" className="size-5" />,
		badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
		label: '구매 권장',
	},
};

export function PricePrediction({ history, currentPrice, departureDate }: PricePredictionProps) {
	if (history.length < 14) return null;

	const { verdict, reason, trendPct, changePct, daysUntil } = getPrediction(
		history,
		currentPrice,
		departureDate,
	);
	const cfg = VERDICT_CONFIG[verdict];

	const trendSign = trendPct >= 0 ? '+' : '';
	const changeSign = changePct >= 0 ? '+' : '';

	return (
		<Card className="overflow-hidden">
			<CardHeader className="border-b bg-background p-5 sm:p-6">
				<CardTitle className="flex items-center gap-2 text-xl">
					{cfg.icon}
					지금 사는 게 좋을까요?
				</CardTitle>
				<CardDescription>
					<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
						{cfg.label}
					</span>
				</CardDescription>
			</CardHeader>

			<CardContent className="bg-card p-5 sm:p-6">
				<div className="flex flex-col gap-5">
					<Sparkline history={history} trendPct={trendPct} />

					<dl className="grid gap-4 border-t pt-4 sm:grid-cols-3">
						<div>
							<dt className="text-xs font-medium text-muted-foreground">7일 추이</dt>
							<dd className={`mt-1 text-sm font-medium ${trendPct >= 0 ? 'text-red-500' : 'text-green-600'}`}>
								{trendSign}{trendPct.toFixed(1)}%
							</dd>
						</div>
						<div>
							<dt className="text-xs font-medium text-muted-foreground">45일 변동</dt>
							<dd className={`mt-1 text-sm font-medium ${changePct >= 0 ? 'text-red-500' : 'text-green-600'}`}>
								{changeSign}{changePct.toFixed(1)}%
							</dd>
						</div>
						<div>
							<dt className="text-xs font-medium text-muted-foreground">출발까지</dt>
							<dd className="mt-1 text-sm font-medium">
								{daysUntil !== null ? `D-${daysUntil}` : '—'}
							</dd>
						</div>
					</dl>

					<p className="text-sm text-muted-foreground">{reason}</p>

					<p className="text-xs text-muted-foreground/60">
						* 최근 45일 가격 데이터 기반 분석입니다. 실제 가격은 변동될 수 있습니다.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
