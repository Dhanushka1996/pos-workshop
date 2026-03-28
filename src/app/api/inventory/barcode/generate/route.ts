import { NextResponse } from 'next/server';

// Generate a simple EAN-13 style barcode number
function generateBarcode(): string {
  const prefix = '200'; // custom prefix
  const random = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0');
  const raw    = `${prefix}${random}`;
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(raw[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${raw}${check}`;
}

export async function GET() {
  return NextResponse.json({ barcode: generateBarcode() });
}
