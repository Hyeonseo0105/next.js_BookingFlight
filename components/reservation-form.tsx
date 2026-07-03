'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, CreditCard, Mail, Phone, User, X } from 'lucide-react';
import {
	useTransition,
	useState,
	type ChangeEvent,
	type ComponentProps,
	type FormEvent,
	type ReactNode,
} from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/date-input';
import { cn } from '@/lib/utils';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { SeatSelector } from '@/components/seat-selector';
import { createReservation } from '@/app/actions/reservation';
import type { PassengerInput } from '@/app/actions/reservation';
import type { SeatData } from '@/lib/seat-types';

interface FlightSnapshot {
	id: string;
	price: number;
}

interface ReservationFormProps {
	departureDate: string;
	flight: FlightSnapshot;
	returnFlight: FlightSnapshot | null;
	returnDate: string;
	tripType: string;
	onSeatSelectionChange: (ids: string[]) => void;
	seats: SeatData[];
	seatFee: number;
	selectedSeatIds: string[];
	totalPrice: number;
	travelers: number;
}

interface PassengerFields extends PassengerInput {}

const INITIAL_PASSENGER: PassengerFields = {
	dateOfBirth: '',
	firstName: '',
	lastName: '',
	nationality: '',
	passport: '',
};

const COUNTRY_CODES = [
	{ code: '+82', country: 'KR' },
	{ code: '+1', country: 'US' },
	{ code: '+81', country: 'JP' },
	{ code: '+86', country: 'CN' },
	{ code: '+44', country: 'GB' },
	{ code: '+49', country: 'DE' },
	{ code: '+33', country: 'FR' },
	{ code: '+61', country: 'AU' },
	{ code: '+65', country: 'SG' },
	{ code: '+91', country: 'IN' },
] as const;

export function ReservationForm({
	departureDate,
	flight,
	returnFlight,
	returnDate,
	tripType,
	onSeatSelectionChange,
	seats,
	seatFee,
	selectedSeatIds,
	totalPrice,
	travelers,
}: ReservationFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [passengers, setPassengers] = useState<PassengerFields[]>(
		Array.from({ length: travelers }, () => ({ ...INITIAL_PASSENGER })),
	);
	const [email, setEmail] = useState('');
	const [countryCode, setCountryCode] = useState<string>(COUNTRY_CODES[0].code);
	const [phone, setPhone] = useState('');
	const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
	const [formError, setFormError] = useState('');
	const today = new Date().toISOString().split('T')[0];

	const allSeatsSelected = seats.length === 0 || selectedSeatIds.length === travelers;

	function updatePassenger(
		index: number,
		field: keyof PassengerFields,
		value: string,
	) {
		setPassengers(prev => {
			const next = [...prev];
			next[index] = { ...next[index], [field]: value };
			return next;
		});
	}

	function clearPassenger(index: number) {
		setPassengers(prev => {
			const next = [...prev];
			next[index] = { ...INITIAL_PASSENGER };
			return next;
		});
	}

	function isPassengerEmpty(p: PassengerFields) {
		return !p.firstName && !p.lastName && !p.dateOfBirth && !p.nationality && !p.passport;
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError('');

		if (seats.length > 0 && selectedSeatIds.length < travelers) {
			setFormError(`좌석을 ${travelers}석 모두 선택해 주세요.`);
			return;
		}

		startTransition(async () => {
			const result = await createReservation({
				flightId: flight.id,
				returnFlightId: returnFlight?.id,
				returnDate: returnDate || undefined,
				tripType,
				departureDate,
				travelers,
				contactEmail: email,
				contactPhone: phone ? `${countryCode} ${phone}` : '',
				passengers,
				seatIds: selectedSeatIds,
			});
			if (result.error) {
				setFormError(result.error);
				return;
			}
			router.push(`/mypage?booked=1&ref=${result.bookingRef}`);
		});
	}

	return (
		<form className="flex flex-col gap-6" onSubmit={handleSubmit}>
			{/* ── 1. Seat selection ─────────────────────────────────── */}
			{seats.length > 0 && (
				<Card className="overflow-hidden">
					<CardHeader className="border-b bg-background p-5 sm:p-6">
						<CardTitle className="text-xl">좌석 선택</CardTitle>
						<CardDescription>
							{travelers}명의 좌석을 선택해 주세요.
						</CardDescription>
					</CardHeader>
					<CardContent className="bg-card p-5 sm:p-6">
						<SeatSelector
							onSelectionChange={onSeatSelectionChange}
							seats={seats}
							selectedSeatIds={selectedSeatIds}
							travelers={travelers}
						/>

						{/* Dynamic price update */}
						{seatFee > 0 && (
							<div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3 text-sm">
								<span className="text-muted-foreground">좌석 추가 요금</span>
								<span className="font-semibold">+${seatFee}</span>
							</div>
						)}
						<div className="mt-2 flex items-center justify-between rounded-lg border bg-primary/5 px-4 py-3 text-sm">
							<span className="font-semibold">예상 합계</span>
							<span className="text-lg font-bold">${totalPrice}</span>
						</div>
					</CardContent>
				</Card>
			)}

			{/* ── 2. Passenger information ───────────────────────────── */}
			<Card className={`overflow-hidden transition-opacity ${allSeatsSelected ? '' : 'opacity-50 pointer-events-none'}`}>
				<CardHeader className="border-b bg-background p-5 sm:p-6">
					<CardTitle className="text-xl">Passenger information</CardTitle>
					<CardDescription>
						{allSeatsSelected
							? `Enter details for ${travelers} traveler${travelers > 1 ? 's' : ''}.`
							: '좌석을 먼저 선택해 주세요.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="bg-card p-5 sm:p-6">
					<div className="grid gap-8">
						{passengers.map((passenger, index) => (
							<fieldset className="grid gap-5" key={index}>
								<legend className="sr-only">Traveler {index + 1}</legend>
								<div className="flex items-center justify-between">
									<span className="text-sm font-semibold">
										{travelers > 1 ? `Traveler ${index + 1}` : 'Passenger'}
										{selectedSeatIds[index] && (
											<span className="ml-2 text-xs font-normal text-muted-foreground">
												— 좌석: {seats.find(s => s.id === selectedSeatIds[index])?.seatNumber}
											</span>
										)}
									</span>
									<button
										className="text-xs text-muted-foreground transition-opacity hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
										disabled={isPassengerEmpty(passenger)}
										onClick={() => clearPassenger(index)}
										type="button"
									>
										초기화
									</button>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<Field
										icon={<User aria-hidden="true" className="size-4" />}
										label="First name"
									>
										<ClearableInput
											aria-label={`Traveler ${index + 1} first name`}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												updatePassenger(index, 'firstName', e.target.value)
											}
											onClear={() => updatePassenger(index, 'firstName', '')}
											placeholder="Gildong"
											required={allSeatsSelected}
											type="text"
											value={passenger.firstName}
										/>
									</Field>
									<Field
										icon={<User aria-hidden="true" className="size-4" />}
										label="Last name"
									>
										<ClearableInput
											aria-label={`Traveler ${index + 1} last name`}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												updatePassenger(index, 'lastName', e.target.value)
											}
											onClear={() => updatePassenger(index, 'lastName', '')}
											placeholder="Hong"
											required={allSeatsSelected}
											type="text"
											value={passenger.lastName}
										/>
									</Field>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<Field
										icon={<CalendarDays aria-hidden="true" className="size-4" />}
										label="Date of birth"
									>
										<DateInput
											aria-label={`Traveler ${index + 1} date of birth`}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												updatePassenger(index, 'dateOfBirth', e.target.value)
											}
											onClear={() => updatePassenger(index, 'dateOfBirth', '')}
											required={allSeatsSelected}
											max={today}
											min="1876-01-01"
											value={passenger.dateOfBirth}
										/>
									</Field>
									<Field
										icon={<User aria-hidden="true" className="size-4" />}
										label="Nationality"
									>
										<ClearableInput
											aria-label={`Traveler ${index + 1} nationality`}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												updatePassenger(index, 'nationality', e.target.value)
											}
											onClear={() => updatePassenger(index, 'nationality', '')}
											placeholder="Korean"
											required={allSeatsSelected}
											type="text"
											value={passenger.nationality}
										/>
									</Field>
								</div>

								<Field
									icon={<CreditCard aria-hidden="true" className="size-4" />}
									label="Passport number"
								>
									<ClearableInput
										aria-label={`Traveler ${index + 1} passport number`}
										className="max-w-sm uppercase"
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											updatePassenger(index, 'passport', e.target.value.toUpperCase())
										}
										onClear={() => updatePassenger(index, 'passport', '')}
										placeholder="M12345678"
										required={allSeatsSelected}
										type="text"
										value={passenger.passport}
									/>
								</Field>
							</fieldset>
						))}

						{/* Contact info */}
						<div className="grid gap-5 border-t pt-6">
							<div className="flex items-center justify-between">
								<p className="text-sm font-semibold">Contact information</p>
								<button
									className="text-xs text-muted-foreground transition-opacity hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
									disabled={!email && !phone}
									onClick={() => { setEmail(''); setPhone(''); }}
									type="button"
								>
									초기화
								</button>
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<Field
									icon={<Mail aria-hidden="true" className="size-4" />}
									label="Email address"
								>
									<ClearableInput
										aria-label="Email address"
										onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
										onClear={() => setEmail('')}
										placeholder="you@example.com"
										required={allSeatsSelected}
										type="email"
										value={email}
									/>
								</Field>
								<Field
									icon={<Phone aria-hidden="true" className="size-4" />}
									label="Phone number"
								>
									<div className="flex gap-2">
										<select
											aria-label="Country code"
											className="h-11 w-22 shrink-0 rounded-md border border-input bg-background px-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											onChange={e => setCountryCode(e.target.value)}
											value={countryCode}
										>
											{COUNTRY_CODES.map(c => (
												<option key={c.code} value={c.code}>
													{c.country} {c.code}
												</option>
											))}
										</select>
										<ClearableInput
											aria-label="Phone number"
											className="flex-1"
											onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
											onClear={() => setPhone('')}
											placeholder="10-0000-0000"
											required={allSeatsSelected}
											type="tel"
											value={phone}
										/>
									</div>
								</Field>
							</div>
						</div>

						{/* Payment */}
						<div className="grid gap-5 border-t pt-6">
							<p className="text-sm font-semibold">Payment method</p>
							<div className="grid gap-3 sm:grid-cols-2">
								<PaymentOption
									checked={paymentMethod === 'card'}
									description="Visa, Mastercard, Amex"
									label="Credit / Debit card"
									onChange={() => setPaymentMethod('card')}
									value="card"
								/>
								<PaymentOption
									checked={paymentMethod === 'transfer'}
									description="Instant bank transfer"
									label="Bank transfer"
									onChange={() => setPaymentMethod('transfer')}
									value="transfer"
								/>
							</div>

							{paymentMethod === 'card' && (
								<div className="grid gap-4">
									<Field
										icon={<CreditCard aria-hidden="true" className="size-4" />}
										label="Card number"
									>
										<Input
											aria-label="Card number"
											maxLength={19}
											placeholder="0000 0000 0000 0000"
											type="text"
										/>
									</Field>
									<div className="grid gap-4 sm:grid-cols-2">
										<Field
											icon={<CalendarDays aria-hidden="true" className="size-4" />}
											label="Expiry"
										>
											<Input
												aria-label="Card expiry"
												placeholder="MM / YY"
												type="text"
											/>
										</Field>
										<Field
											icon={<CreditCard aria-hidden="true" className="size-4" />}
											label="CVC"
										>
											<Input
												aria-label="Card CVC"
												maxLength={4}
												placeholder="123"
												type="text"
											/>
										</Field>
									</div>
								</div>
							)}

							{paymentMethod === 'transfer' && (
								<div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
									Bank details will be sent to your email after confirmation.
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{formError && (
				<p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
					{formError}
				</p>
			)}

			<div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground">
					By confirming, you agree to our terms and privacy policy.
				</p>
				<Button
					className="w-full sm:w-auto"
					disabled={isPending || !allSeatsSelected}
					size="lg"
					type="submit"
				>
					<CreditCard aria-hidden="true" className="size-4" />
					{isPending ? 'Processing…' : `Confirm booking · $${totalPrice}`}
				</Button>
			</div>
		</form>
	);
}

// ─── sub-components ──────────────────────────────────────────────────────────

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

interface PaymentOptionProps {
	checked: boolean;
	description: string;
	label: string;
	onChange: () => void;
	value: string;
}

function PaymentOption({
	checked,
	description,
	label,
	onChange,
	value,
}: PaymentOptionProps) {
	return (
		<label
			className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
				checked ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/40'
			}`}
		>
			<input
				checked={checked}
				className="mt-0.5"
				name="paymentMethod"
				onChange={onChange}
				type="radio"
				value={value}
			/>
			<div>
				<p className="text-sm font-medium">{label}</p>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>
		</label>
	);
}

function ClearableInput({
	onClear,
	value,
	className,
	...props
}: ComponentProps<typeof Input> & { onClear: () => void }) {
	return (
		<div className="relative">
			<Input
				className={cn(value ? 'pr-8' : '', className)}
				value={value}
				{...props}
			/>
			{value && (
				<button
					aria-label="지우기"
					className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
