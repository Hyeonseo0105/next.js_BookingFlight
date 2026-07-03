-- CreateTable
CREATE TABLE "FlightPriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flightId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    CONSTRAINT "FlightPriceHistory_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FlightPriceHistory_flightId_recordedAt_idx" ON "FlightPriceHistory"("flightId", "recordedAt");
