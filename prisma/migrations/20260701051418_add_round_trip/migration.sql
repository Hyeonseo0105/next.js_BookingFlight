-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingRef" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "tripType" TEXT NOT NULL DEFAULT 'ONE_WAY',
    "returnFlightId" TEXT,
    "userId" TEXT,
    "departureDate" TEXT NOT NULL,
    "returnDate" TEXT,
    "travelers" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_returnFlightId_fkey" FOREIGN KEY ("returnFlightId") REFERENCES "Flight" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("bookingRef", "contactEmail", "contactPhone", "createdAt", "departureDate", "flightId", "id", "status", "totalPrice", "travelers", "updatedAt", "userId") SELECT "bookingRef", "contactEmail", "contactPhone", "createdAt", "departureDate", "flightId", "id", "status", "totalPrice", "travelers", "updatedAt", "userId" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE UNIQUE INDEX "Reservation_bookingRef_key" ON "Reservation"("bookingRef");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
