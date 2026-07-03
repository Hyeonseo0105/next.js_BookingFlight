'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cancelReservation } from '@/app/actions/reservation';

interface CancelReservationButtonProps {
	bookingRef: string;
	reservationId: string;
}

export function CancelReservationButton({ bookingRef, reservationId }: CancelReservationButtonProps) {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState('');

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		// Prevent the native <details>/<summary> ancestor (mypage's inline expand
		// toggle) from also firing when this button is clicked.
		event.stopPropagation();

		const confirmed = window.confirm(
			`예약 ${bookingRef}을(를) 취소하시겠습니까? 선택한 좌석은 해제됩니다.`,
		);
		if (!confirmed) return;

		setError('');
		startTransition(async () => {
			const result = await cancelReservation(reservationId);
			if (result.error) setError(result.error);
		});
	}

	return (
		<div className="flex flex-col items-end gap-1">
			<Button disabled={isPending} onClick={handleClick} size="sm" variant="outline">
				<X aria-hidden="true" className="size-3.5" />
				{isPending ? '취소 중...' : '예약 취소'}
			</Button>
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}
