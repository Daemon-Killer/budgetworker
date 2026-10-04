import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.pack.deleteMany();
  await prisma.worker.deleteMany();

  await prisma.pack.createMany({
    data: [
      { name: "Starter", priceInr: 199, credits: 2, sortOrder: 1 },
      { name: "Standard", priceInr: 399, credits: 5, sortOrder: 2 },
      { name: "Plus", priceInr: 699, credits: 10, sortOrder: 3 },
    ],
  });

  await prisma.worker.createMany({
    data: [
      {
        name: "Sunita Devi",
        phone: "9811111111",
        category: "COOK",
        employmentType: "FULL_TIME",
        city: "Pune",
        area: "Kothrud",
        age: 34,
        skill: "North Indian, simple Gujarati thali",
        salaryExpectation: "12–15k",
        vegNonVeg: "veg",
        experienceYears: 6,
        whenCanJoin: "Immediate",
        policeVerified: true,
        aadhaarVerified: true,
        status: "AVAILABLE",
        about: "Reliable full-time cook, prefers live-out.",
      },
      {
        name: "Meena R",
        phone: "9822222222",
        category: "HOUSEKEEPING",
        employmentType: "PART_TIME",
        city: "Pune",
        area: "Baner",
        age: 28,
        skill: "Daily cleaning, laundry",
        salaryExpectation: "₹250/day",
        experienceYears: 3,
        whenCanJoin: "1 week",
        policeVerified: true,
        aadhaarVerified: false,
        status: "AVAILABLE",
      },
      {
        name: "Fatima K",
        phone: "9833333333",
        category: "BABYCARE",
        employmentType: "FULL_TIME",
        city: "Pune",
        area: "Aundh",
        age: 40,
        skill: "Infant care, night stays OK",
        salaryExpectation: "18–20k",
        experienceYears: 10,
        policeVerified: true,
        aadhaarVerified: true,
        status: "AVAILABLE",
      },
      {
        name: "Laxmi P",
        phone: "9844444444",
        category: "ELDERCARE",
        employmentType: "FULL_TIME",
        city: "Pune",
        area: "Hadapsar",
        age: 45,
        skill: "Patient care, basic physio help",
        salaryExpectation: "16k",
        experienceYears: 8,
        policeVerified: false,
        aadhaarVerified: true,
        status: "AVAILABLE",
      },
      {
        name: "Ravi Chef",
        phone: "9855555555",
        category: "CHEF",
        employmentType: "PART_TIME",
        city: "Pune",
        area: "Koregaon Park",
        age: 32,
        skill: "Party catering, continental",
        salaryExpectation: "₹800/visit",
        experienceYears: 7,
        status: "AVAILABLE",
      },
    ],
  });

  console.log("Budget Worker — seeded packs + sample workers.");
  console.log("Admin login: phone 9999999999, OTP 123456 (OTP_MODE=dev)");
  console.log("Domain: budgetworker.in");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
