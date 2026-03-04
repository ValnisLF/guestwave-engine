import { createPropertySchema, updatePropertySchema } from '@/lib/schemas/property';

console.log('\n=== TEST 1: Valid Property Data ===');
const validData = {
  name: 'Casa frente al mar',
  slug: 'casa-frente-al-mar',
  description: 'Hermosa casa con vistas al océano',
  amenities: {
    wifi: true,
    parking: false,
    pool: true,
    kitchen: true,
  },
  basePrice: 100.5,
  cleaningFee: 50.0,
  depositPercentage: 30,
};

const result1 = createPropertySchema.safeParse(validData);
console.log('Success:', result1.success);
if (!result1.success) {
  console.log('Errors:', JSON.stringify(result1.error.issues, null, 2));
}

console.log('\n=== TEST 2: Amenities Validation ===');
const validData2 = {
  name: 'Casa Test',
  slug: 'casa-test',
  description: 'Test',
  amenities: {
    wifi: true,
    pool: true,
    kitchen: true,
  },
  basePrice: 100,
  cleaningFee: 50,
  depositPercentage: 30,
};



console.log('\n=== TEST 3: Empty Updates ===');
const updateData = {};
const result3 = updatePropertySchema.safeParse(updateData);
console.log('Success (should be false):', result3.success);
if (!result3.success) {
  console.log('Errors:', JSON.stringify(result3.error.issues, null, 2));
}
