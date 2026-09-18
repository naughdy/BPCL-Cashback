import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development data (NOT for production use)...');

  // Fuel rules
  await prisma.fuelRule.upsert({
    where: { fuelType: 'PETROL' },
    update: {},
    create: { fuelType: 'PETROL', redemptionThresholdLitres: '50', cashbackRatePerLitre: '0.50' },
  });
  await prisma.fuelRule.upsert({
    where: { fuelType: 'DIESEL' },
    update: {},
    create: { fuelType: 'DIESEL', redemptionThresholdLitres: '100', cashbackRatePerLitre: '0.50' },
  });

  // Dev-only admin user. CHANGE THIS PASSWORD BEFORE ANY REAL DEPLOYMENT.
  const passwordHash = await bcrypt.hash('DevAdmin@123', 12);
  await prisma.adminUser.upsert({
    where: { email: 'admin@bpcl-cashback.dev' },
    update: {},
    create: {
      name: 'Dev Admin',
      email: 'admin@bpcl-cashback.dev',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  // Petrol customers
  const petrolCustomer = await prisma.customer.upsert({
    where: { vehicleNumber: 'MH15AB1234' },
    update: {},
    create: {
      vehicleNumber: 'MH15AB1234',
      mobileNumber: '9876543210',
      fuelType: 'PETROL',
      isVerified: true,
      totalLitres: '55',
      cashbackGenerated: '27.50',
      cashbackRedeemed: '0',
      availableCashback: '27.50',
    },
  });
  await prisma.fuelTransaction.createMany({
    data: [
      { customerId: petrolCustomer.id, vehicleNumberSnapshot: 'MH15AB1234', fuelTypeSnapshot: 'PETROL', litres: '20', cashbackGenerated: '10.00' },
      { customerId: petrolCustomer.id, vehicleNumberSnapshot: 'MH15AB1234', fuelTypeSnapshot: 'PETROL', litres: '15', cashbackGenerated: '7.50' },
      { customerId: petrolCustomer.id, vehicleNumberSnapshot: 'MH15AB1234', fuelTypeSnapshot: 'PETROL', litres: '20', cashbackGenerated: '10.00' },
    ],
    skipDuplicates: true,
  });

  // Diesel customer, not yet eligible
  const dieselCustomer = await prisma.customer.upsert({
    where: { vehicleNumber: 'MH12CD5678' },
    update: {},
    create: {
      vehicleNumber: 'MH12CD5678',
      mobileNumber: '9123456780',
      fuelType: 'DIESEL',
      isVerified: true,
      totalLitres: '60',
      cashbackGenerated: '0',
      cashbackRedeemed: '0',
      availableCashback: '0',
    },
  });
  await prisma.fuelTransaction.createMany({
    data: [
      { customerId: dieselCustomer.id, vehicleNumberSnapshot: 'MH12CD5678', fuelTypeSnapshot: 'DIESEL', litres: '30', cashbackGenerated: '0' },
      { customerId: dieselCustomer.id, vehicleNumberSnapshot: 'MH12CD5678', fuelTypeSnapshot: 'DIESEL', litres: '30', cashbackGenerated: '0' },
    ],
    skipDuplicates: true,
  });

  // A customer with a completed redemption
  const redeemedCustomer = await prisma.customer.upsert({
    where: { vehicleNumber: 'MH20EF9999' },
    update: {},
    create: {
      vehicleNumber: 'MH20EF9999',
      mobileNumber: '9988776655',
      fuelType: 'PETROL',
      isVerified: true,
      totalLitres: '100',
      cashbackGenerated: '50.00',
      cashbackRedeemed: '50.00',
      availableCashback: '0',
    },
  });
  await prisma.fuelTransaction.createMany({
    data: [{ customerId: redeemedCustomer.id, vehicleNumberSnapshot: 'MH20EF9999', fuelTypeSnapshot: 'PETROL', litres: '100', cashbackGenerated: '50.00' }],
    skipDuplicates: true,
  });
  await prisma.redemption.upsert({
    where: { referenceNumber: 'RDM-SEED-000001' },
    update: {},
    create: {
      customerId: redeemedCustomer.id,
      amount: '50.00',
      status: 'SUCCESS',
      otpVerified: true,
      whatsappStatus: 'VERIFIED',
      readerStatus: 'SUCCESS',
      referenceNumber: 'RDM-SEED-000001',
    },
  });

  console.log('Seed complete.');
  console.log('Dev admin login: admin@bpcl-cashback.dev / DevAdmin@123 (development only)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
