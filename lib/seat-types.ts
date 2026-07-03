export interface SeatData {
	id: string;
	seatNumber: string;
	class: 'ECONOMY' | 'BUSINESS';
	status: 'AVAILABLE' | 'RESERVED';
	priceModifier: number;
	row: number;
	column: string;
}
