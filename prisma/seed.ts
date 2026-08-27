import { PrismaClient, Role, DietaryPreference, MealType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding HS³ database...');

  // 1. Clean existing records (for fresh seed)
  await prisma.pollVote.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.user.deleteMany();
  await prisma.hostel.deleteMany();

  // 2. Create Default Hostel
  const hostel = await prisma.hostel.create({
    data: {
      name: 'HS3 Main Campus Hostel',
      code: 'HS3-01',
      address: 'Hostel Block A, Main Campus',
    },
  });

  const defaultPassword = await bcrypt.hash('password123', 12);

  // 3. Create Admin Account
  const admin = await prisma.user.create({
    data: {
      name: 'HS3 Admin',
      email: 'admin@hs3.com',
      password: defaultPassword,
      role: Role.ADMIN,
      hostelId: hostel.id,
    },
  });

  // 4. Create Supervisor Account
  const supervisor = await prisma.user.create({
    data: {
      name: 'Mess Supervisor',
      email: 'supervisor@hs3.com',
      password: defaultPassword,
      role: Role.SUPERVISOR,
      hostelId: hostel.id,
    },
  });

  // 5. Create Demo Students
  const students = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Sanjana',
        email: 'sanjana@hs3.com',
        password: defaultPassword,
        role: Role.STUDENT,
        dietaryPref: DietaryPreference.VEG,
        rollNumber: 'CS201',
        roomNumber: 'A-101',
        hostelId: hostel.id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Hrutuja',
        email: 'hrutuja@hs3.com',
        password: defaultPassword,
        role: Role.STUDENT,
        dietaryPref: DietaryPreference.VEG,
        rollNumber: 'CS202',
        roomNumber: 'A-102',
        hostelId: hostel.id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Shagun',
        email: 'shagun@hs3.com',
        password: defaultPassword,
        role: Role.STUDENT,
        dietaryPref: DietaryPreference.VEG,
        rollNumber: 'CS203',
        roomNumber: 'A-103',
        hostelId: hostel.id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Shrutika',
        email: 'shrutika@hs3.com',
        password: defaultPassword,
        role: Role.STUDENT,
        dietaryPref: DietaryPreference.VEG,
        rollNumber: 'CS204',
        roomNumber: 'A-104',
        hostelId: hostel.id,
      },
    }),
  ]);

  // 6. Create Today's Menu Sample
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.menu.createMany({
    data: [
      {
        date: today,
        mealType: MealType.BREAKFAST,
        items: ['Poha', 'Boiled Sprouts', 'Tea / Coffee'],
        calories: 380,
        hostelId: hostel.id,
      },
      {
        date: today,
        mealType: MealType.LUNCH,
        items: ['Paneer Butter Masala', 'Dal Tadka', 'Jeera Rice', 'Chapati', 'Salad'],
        calories: 720,
        hostelId: hostel.id,
      },
      {
        date: today,
        mealType: MealType.SNACKS,
        items: ['Veg Cutlet', 'Chutney', 'Tea'],
        calories: 250,
        hostelId: hostel.id,
      },
      {
        date: today,
        mealType: MealType.DINNER,
        items: ['Aloo Gobi', 'Dal Fry', 'Steamed Rice', 'Roti', 'Gulab Jamun'],
        isSpecial: true,
        calories: 680,
        hostelId: hostel.id,
      },
    ],
  });

  console.log('Database seeded successfully!');
  console.log('Demo Credentials (all passwords: password123):');
  console.log(`- Admin: ${admin.email}`);
  console.log(`- Supervisor: ${supervisor.email}`);
  console.log(`- Student: ${students[0].email}`);
  console.log(`- Hostel Code: ${hostel.code}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });