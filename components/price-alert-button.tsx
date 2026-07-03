'use client';

import { useState, useTransition } from 'react';
import { Bell, BellOff, BellRing, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setAlert, deleteAlert } from '@/app/actions/price-alert';

interface PriceAlert {
	id: string;
	targetPrice: number;
	triggered: boolean;
	triggeredAt: Date | null;
}

interface PriceAlertButtonProps {
	flightId: string;
	currentPrice: number;
	existingAlert: PriceAlert | null;
	isLoggedIn: boolean;
}

export function PriceAlertButton({
	flightId,
	currentPrice,
	existingAlert,
	isLoggedIn,
}: PriceAlertButtonProps) {
	const [open, setOpen] = useState(false);
	const [targetPrice, setTargetPrice] = useState(
		existingAlert ? String(existingAlert.targetPrice) : String(currentPrice),
	);
	const [error, setError] = useState('');
	const [isPending, startTransition] = useTransition();

	if (!isLoggedIn) {
		return (
			<a
				className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
				href={`/login?from=/flights/${flightId}`}
			>
				<Bell aria-hidden="true" className="size-4" />
				로그인 후 가격 알림 설정
			</a>
		);
	}

	function handleDelete() {
		setError('');
		startTransition(async () => {
			const result = await deleteAlert(flightId);
			if (result.error) {
				setError(result.error);
			} else {
				setOpen(false);
			}
		});
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const price = parseInt(targetPrice, 10);
		if (!price || price <= 0) {
			setError('올바른 가격을 입력해 주세요.');
			return;
		}
		setError('');
		startTransition(async () => {
			const result = await setAlert(flightId, price);
			if (result.error) {
				setError(result.error);
			} else {
				setOpen(false);
			}
		});
	}

	// Already has an alert
	if (existingAlert && !open) {
		return (
			<div className="mt-4 flex flex-col gap-2">
				<div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2.5">
					{existingAlert.triggered ? (
						<BellRing aria-hidden="true" className="size-4 shrink-0 text-primary" />
					) : (
						<Bell aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
					)}
					<div className="flex min-w-0 flex-1 flex-col">
						<span className="text-sm font-medium">
							${existingAlert.targetPrice.toLocaleString()} 이하 알림 설정됨
						</span>
						{existingAlert.triggered && existingAlert.triggeredAt && (
							<span className="text-xs text-primary">
								{new Date(existingAlert.triggeredAt).toLocaleDateString('ko-KR')} 달성
							</span>
						)}
						{!existingAlert.triggered && (
							<span className="text-xs text-muted-foreground">
								현재가 ${currentPrice.toLocaleString()} · 목표까지 $
								{Math.max(0, currentPrice - existingAlert.targetPrice).toLocaleString()} 남음
							</span>
						)}
					</div>
					<button
						aria-label="알림 수정"
						className="shrink-0 text-muted-foreground hover:text-foreground"
						onClick={() => {
							setTargetPrice(String(existingAlert.targetPrice));
							setOpen(true);
						}}
						type="button"
					>
						<span className="text-xs underline underline-offset-2">수정</span>
					</button>
				</div>
				{error && <p className="text-xs text-destructive">{error}</p>}
			</div>
		);
	}

	// No alert yet or editing
	if (!open) {
		return (
			<Button
				className="mt-4 w-full"
				onClick={() => setOpen(true)}
				size="sm"
				variant="outline"
			>
				<Bell aria-hidden="true" className="size-4" />
				가격 알림 설정
			</Button>
		);
	}

	return (
		<form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">목표 가격 설정</span>
				<button
					aria-label="닫기"
					className="text-muted-foreground hover:text-foreground"
					onClick={() => {
						setOpen(false);
						setError('');
					}}
					type="button"
				>
					<X aria-hidden="true" className="size-4" />
				</button>
			</div>
			<div className="relative">
				<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
					$
				</span>
				<Input
					className="pl-6"
					disabled={isPending}
					min={1}
					onChange={e => setTargetPrice(e.target.value)}
					placeholder={String(currentPrice)}
					type="number"
					value={targetPrice}
				/>
			</div>
			<p className="text-xs text-muted-foreground">
				현재가 ${currentPrice.toLocaleString()} · 이 가격 이하로 떨어지면 알림
			</p>
			{error && <p className="text-xs text-destructive">{error}</p>}
			<div className="flex gap-2">
				<Button className="flex-1" disabled={isPending} size="sm" type="submit">
					{isPending ? '저장 중...' : '알림 저장'}
				</Button>
				{existingAlert && (
					<Button
						disabled={isPending}
						onClick={handleDelete}
						size="sm"
						type="button"
						variant="outline"
					>
						<BellOff aria-hidden="true" className="size-4" />
						삭제
					</Button>
				)}
			</div>
		</form>
	);
}
