'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';

import { deleteAlert } from '@/app/actions/price-alert';

interface DeleteAlertButtonProps {
	flightId: string;
}

export function DeleteAlertButton({ flightId }: DeleteAlertButtonProps) {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState('');

	function handleClick() {
		setError('');
		startTransition(async () => {
			const result = await deleteAlert(flightId);
			if (result.error) setError(result.error);
		});
	}

	return (
		<div className="flex flex-col items-end gap-1">
			<button
				aria-label="알림 삭제"
				className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
				disabled={isPending}
				onClick={handleClick}
				type="button"
			>
				<Trash2 aria-hidden="true" className="size-3.5" />
			</button>
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}
