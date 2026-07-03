'use client';

import { ArrowRight, CalendarDays, MapPin, RefreshCw, Search, Users, X } from 'lucide-react';
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type ReactNode,
} from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/date-input';
import { cn } from '@/lib/utils';

type TripType = 'ONE_WAY' | 'ROUND_TRIP';

export function FlightSearchForm() {
	const [tripType, setTripType] = useState<TripType>('ONE_WAY');
	const [departureDate, setDepartureDate] = useState('');
	const [returnDate, setReturnDate] = useState('');
	const [fromValue, setFromValue] = useState('');
	const today = new Date().toISOString().split('T')[0];

	function handleDepartureDateChange(event: ChangeEvent<HTMLInputElement>) {
		const nextDepartureDate = event.target.value;
		setDepartureDate(nextDepartureDate);

		if (returnDate && nextDepartureDate && returnDate < nextDepartureDate) {
			setReturnDate('');
		}
	}

	function handleTripTypeChange(next: TripType) {
		setTripType(next);
		if (next === 'ONE_WAY') setReturnDate('');
	}

	return (
		<form action="/search" className="grid gap-4" method="get">
			{/* Trip type toggle */}
			<div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
				<TripTypeButton
					active={tripType === 'ONE_WAY'}
					label="One way"
					activeIcon={<ArrowRight className="size-3.5 translate-y-0.5" aria-hidden="true" />}
					onClick={() => handleTripTypeChange('ONE_WAY')}
				/>
				<TripTypeButton
					active={tripType === 'ROUND_TRIP'}
					label="Round trip"
					activeIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
					onClick={() => handleTripTypeChange('ROUND_TRIP')}
				/>
			</div>
			<input type="hidden" name="tripType" value={tripType} />

			<div className="grid gap-4 md:grid-cols-2">
				<Field label="From" icon={<MapPin aria-hidden="true" className="size-4" />}>
					<AirportInput
						ariaLabel="Departure city or airport"
						field="from"
						name="from"
						placeholder="ex) Seoul (ICN)"
						onValueChange={setFromValue}
					/>
				</Field>

				<Field label="To" icon={<MapPin aria-hidden="true" className="size-4" />}>
					<AirportInput
						ariaLabel="Arrival city or airport"
						field="to"
						fromValue={fromValue}
						name="to"
						placeholder="ex) Tokyo (HND)"
					/>
				</Field>
			</div>

			<div className={cn(
				'grid gap-4',
				tripType === 'ROUND_TRIP'
					? 'md:grid-cols-[1fr_1fr_0.8fr]'
					: 'md:grid-cols-[1fr_0.8fr]',
			)}>
				<Field
					label="Departure date"
					icon={<CalendarDays aria-hidden="true" className="size-4" />}
				>
					<DateInput
						aria-label="Departure date"
						min={today}
						name="departureDate"
						onChange={handleDepartureDateChange}
						value={departureDate}
					/>
				</Field>

				{tripType === 'ROUND_TRIP' && (
					<Field
						label="Return date"
						icon={<CalendarDays aria-hidden="true" className="size-4" />}
					>
						<DateInput
							aria-label="Return date"
							min={departureDate || today}
							name="returnDate"
							onChange={event => setReturnDate(event.target.value)}
							value={returnDate}
						/>
					</Field>
				)}

				<Field label="Travelers" icon={<Users aria-hidden="true" className="size-4" />}>
					<Input
						aria-label="Number of travelers"
						defaultValue="1"
						min="1"
						name="travelers"
						type="number"
					/>
				</Field>
			</div>

			<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground">
					{tripType === 'ROUND_TRIP'
						? 'Search for round-trip fares. Select your outbound flight first, then choose a return flight.'
						: 'Choose a route and date to view available flights.'}
				</p>
				<Button className="w-full sm:w-auto" size="lg" type="submit">
					<Search aria-hidden="true" className="size-4" />
					Search flights
				</Button>
			</div>
		</form>
	);
}

interface TripTypeButtonProps {
	active: boolean;
	activeIcon: ReactNode;
	label: string;
	onClick: () => void;
}

function TripTypeButton({ active, activeIcon, label, onClick }: TripTypeButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
				active
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground',
			)}
		>
			{label}
			{active && activeIcon}
		</button>
	);
}

interface AirportInputProps {
	ariaLabel: string;
	field: 'from' | 'to';
	fromValue?: string;
	name: string;
	onValueChange?: (value: string) => void;
	placeholder: string;
}

function AirportInput({ ariaLabel, field, fromValue, name, onValueChange, placeholder }: AirportInputProps) {
	const [value, setValue] = useState('');
	const [allOptions, setAllOptions] = useState<string[]>([]);
	const [open, setOpen] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	// fromValue가 바뀌면 to 필드의 캐시를 초기화해 재조회
	useEffect(() => {
		if (field === 'to') {
			setAllOptions([]);
			setLoaded(false);
			setOpen(false);
		}
	}, [fromValue, field]);

	const suggestions = useMemo(() => {
		const q = value.trim().toLowerCase();
		if (!q) return allOptions.slice(0, 3);
		return allOptions.filter(o => o.toLowerCase().includes(q)).slice(0, 6);
	}, [value, allOptions]);

	// 드롭다운이 닫히거나 목록이 바뀌면 인덱스 초기화
	useEffect(() => {
		setActiveIndex(-1);
	}, [suggestions, open]);

	async function loadOptions() {
		if (loaded) return;
		try {
			const url = field === 'to' && fromValue
				? `/api/airports?field=to&from=${encodeURIComponent(fromValue)}`
				: `/api/airports?field=${field}`;
			const res = await fetch(url);
			const data: string[] = await res.json();
			setAllOptions(data);
			setLoaded(true);
		} catch {
			// 조용히 실패 — 자동완성 없이 일반 입력으로 동작
		}
	}

	function handleFocus() {
		// to 필드는 from 값이 있을 때만 드롭다운 표시
		if (field === 'to' && !fromValue) return;
		loadOptions();
		setOpen(true);
	}

	function handleSelect(option: string) {
		setValue(option);
		onValueChange?.(option);
		setOpen(false);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (!open || suggestions.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			const next = activeIndex < suggestions.length - 1 ? activeIndex + 1 : 0;
			setActiveIndex(next);
			listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const prev = activeIndex > 0 ? activeIndex - 1 : suggestions.length - 1;
			setActiveIndex(prev);
			listRef.current?.children[prev]?.scrollIntoView({ block: 'nearest' });
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			e.preventDefault();
			handleSelect(suggestions[activeIndex]!);
		} else if (e.key === 'Escape') {
			setOpen(false);
		}
	}

	// 외부 클릭 시 닫기
	useEffect(() => {
		function onPointerDown(e: PointerEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	}, []);

	function handleClear() {
		setValue('');
		onValueChange?.('');
		setOpen(false);
	}

	return (
		<div ref={containerRef} className="relative">
			<div className="relative">
				<Input
					aria-autocomplete="list"
					aria-activedescendant={activeIndex >= 0 ? `${name}-option-${activeIndex}` : undefined}
					aria-expanded={open && suggestions.length > 0}
					aria-label={ariaLabel}
					autoComplete="off"
					className={value ? 'pr-8' : ''}
					name={name}
					placeholder={placeholder}
					role="combobox"
					type="text"
					value={value}
					onChange={e => { setValue(e.target.value); onValueChange?.(e.target.value); setOpen(true); }}
					onFocus={handleFocus}
					onKeyDown={handleKeyDown}
				/>
				{value && (
					<button
						type="button"
						aria-label="지우기"
						className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						onClick={handleClear}
					>
						<X className="size-3.5" aria-hidden="true" />
					</button>
				)}
			</div>
			{open && suggestions.length > 0 && (
				<ul
					ref={listRef}
					role="listbox"
					className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md"
				>
					{suggestions.map((option, index) => (
						<li
							key={option}
							id={`${name}-option-${index}`}
							role="option"
							aria-selected={index === activeIndex}
							className={cn(
								'cursor-pointer px-3 py-2.5 text-sm transition-colors hover:bg-muted',
								index === activeIndex && 'bg-muted font-medium',
							)}
							onMouseDown={e => { e.preventDefault(); handleSelect(option); }}
							onMouseEnter={() => setActiveIndex(index)}
						>
							{option}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}


interface FieldProps {
	children: ReactNode;
	icon: ReactNode;
	label: string;
}

function Field({ children, icon, label }: FieldProps) {
	return (
		<label className="grid gap-2">
			<span className="flex items-center gap-2 text-sm font-medium text-foreground">
				<span className="text-muted-foreground">{icon}</span>
				{label}
			</span>
			{children}
		</label>
	);
}
