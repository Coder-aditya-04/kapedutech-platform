-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('PUNCH_IN', 'PUNCH_OUT');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "type" "AttendanceType" NOT NULL DEFAULT 'PUNCH_IN';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "batch" TEXT NOT NULL DEFAULT '';
