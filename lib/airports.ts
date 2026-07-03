// 탄소 배출량 계산용 공항 좌표 및 헬퍼. prisma/seed.ts에서 사용하는 IATA 코드만 포함.
export const AIRPORT_COORDS: Record<string, { lat: number; lng: number }> = {
	ICN: { lat: 37.4602, lng: 126.4407 },
	GMP: { lat: 37.5583, lng: 126.7906 },
	HND: { lat: 35.5494, lng: 139.7798 },
	NRT: { lat: 35.7719, lng: 140.3929 },
	KIX: { lat: 34.4347, lng: 135.2441 },
	FUK: { lat: 33.5859, lng: 130.4517 },
	BKK: { lat: 13.6900, lng: 100.7501 },
	SIN: { lat: 1.3644, lng: 103.9915 },
	HKG: { lat: 22.3080, lng: 113.9185 },
	TPE: { lat: 25.0777, lng: 121.2328 },
	HAN: { lat: 21.2212, lng: 105.8072 },
	DAD: { lat: 16.0439, lng: 108.1993 },
	MNL: { lat: 14.5086, lng: 121.0194 },
	CEB: { lat: 10.3075, lng: 123.9789 },
	DPS: { lat: -8.7482, lng: 115.1672 },
	KUL: { lat: 2.7456, lng: 101.7099 },
	SYD: { lat: -33.9399, lng: 151.1753 },
	SFO: { lat: 37.6213, lng: -122.3790 },
	SEA: { lat: 47.4502, lng: -122.3088 },
	CDG: { lat: 49.0097, lng: 2.5479 },
	FRA: { lat: 50.0379, lng: 8.5622 },
	DXB: { lat: 25.2532, lng: 55.3657 },
	LHR: { lat: 51.4700, lng: -0.4543 },
	JFK: { lat: 40.6413, lng: -73.7781 },
};

const EARTH_RADIUS_KM = 6371;

export function getDistanceKm(fromCode: string, toCode: string): number | null {
	const a = AIRPORT_COORDS[fromCode];
	const b = AIRPORT_COORDS[toCode];
	if (!a || !b) return null;

	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

export type SeatClass = 'ECONOMY' | 'BUSINESS';

// 업계 통용 근사치 (kg CO2 / 승객-km). 좌석 클래스는 기내 면적/무게 배분 차이를 단순 계수로 반영.
const CO2_PER_KM_ECONOMY = 0.115;
const CLASS_MULTIPLIER: Record<SeatClass, number> = { ECONOMY: 1, BUSINESS: 2.1 };
const TRAIN_CO2_PER_KM = 0.035;

export interface CarbonEstimate {
	distanceKm: number;
	co2Kg: number;
	trainCo2Kg: number;
	vsTrainMultiple: number | null;
}

export function estimateCo2Kg(
	fromCode: string,
	toCode: string,
	seatClass: SeatClass = 'ECONOMY',
): CarbonEstimate | null {
	const distanceKm = getDistanceKm(fromCode, toCode);
	if (distanceKm == null) return null;

	const co2Kg = Math.round(distanceKm * CO2_PER_KM_ECONOMY * CLASS_MULTIPLIER[seatClass]);
	const trainCo2Kg = Math.round(distanceKm * TRAIN_CO2_PER_KM);

	return {
		distanceKm: Math.round(distanceKm),
		co2Kg,
		trainCo2Kg,
		vsTrainMultiple: trainCo2Kg > 0 ? co2Kg / trainCo2Kg : null,
	};
}
