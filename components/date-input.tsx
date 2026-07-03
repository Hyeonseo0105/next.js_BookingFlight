'use client';

import { type ComponentProps } from 'react';
import { X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DateInputProps extends Omit<ComponentProps<typeof Input>, 'type'> {
	onClear?: () => void;
}

export function DateInput({
	value,
	onClear,
	className,
	...props
}: DateInputProps) {
	const hasValue = Boolean(value);

	return (
		<div className="relative">
			<Input
				className={cn(
					'[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer',
					!hasValue ? 'text-transparent [&::-webkit-datetime-edit]:opacity-0' : '',
					hasValue && onClear ? 'pr-14' : 'pr-9',
					className,
				)}
				type="date"
				value={value}
				{...props}
			/>
			{!hasValue && (
				<span className="pointer-events-none absolute inset-y-0 left-0 right-9 flex items-center truncate px-3 text-sm text-muted-foreground">
					YYYY-MM-DD
				</span>
			)}
			{hasValue && onClear && (
				<button
					aria-label="지우기"
					className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					onClick={onClear}
					tabIndex={-1}
					type="button"
				>
					<X aria-hidden="true" className="size-3.5" />
				</button>
			)}
		</div>
	);
}
