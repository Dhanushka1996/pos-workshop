import { prisma } from '@/lib/prisma';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * Atomically increments a named sequence and returns its new value.
 * Uses Prisma upsert + increment which is safe under SQLite's serialised writes.
 */
export async function nextSequenceValue(key: string): Promise<number> {
  const seq = await prisma.sequence.upsert({
    where:  { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return seq.value;
}

/**
 * Returns the *next* value without consuming it (for preview only).
 * Not atomic — use only for UI hints, not IDs.
 */
export async function peekNextValue(key: string): Promise<number> {
  const seq = await prisma.sequence.findUnique({ where: { key } });
  return (seq?.value ?? 0) + 1;
}

/** Generate a new unique assembly reference number, e.g. ASM-000001. */
export async function generateAssemblyRef(): Promise<string> {
  const n = await nextSequenceValue('assembly_ref');
  return `ASM-${String(n).padStart(6, '0')}`;
}

/** Preview what the next assembly ref will be (not consumed). */
export async function peekAssemblyRef(): Promise<string> {
  const n = await peekNextValue('assembly_ref');
  return `ASM-${String(n).padStart(6, '0')}`;
}

/** Generate a unique item code for an assembly product, e.g. ASM00001. */
export async function generateAssemblyItemCode(): Promise<string> {
  const n = await nextSequenceValue('assembly_item_code');
  return `ASM${String(n).padStart(5, '0')}`;
}

/** Generate a new unique disassembly reference number, e.g. DSM-000001. */
export async function generateDisassemblyRef(): Promise<string> {
  const n = await nextSequenceValue('disassembly_ref');
  return `DSM-${String(n).padStart(6, '0')}`;
}

/** Preview what the next disassembly ref will be (not consumed). */
export async function peekDisassemblyRef(): Promise<string> {
  const n = await peekNextValue('disassembly_ref');
  return `DSM-${String(n).padStart(6, '0')}`;
}

/** Generate a new sequential GRN reference: GRN-000001 */
export async function generateGRNRef(): Promise<string> {
  const n = await nextSequenceValue('grn_ref');
  return `GRN-${String(n).padStart(6, '0')}`;
}

/** Preview next GRN ref (not consumed). */
export async function peekGRNRef(): Promise<string> {
  const n = await peekNextValue('grn_ref');
  return `GRN-${String(n).padStart(6, '0')}`;
}

/** Generate a new sequential invoice/sale number: INV-000001 */
export async function generateInvoiceRef(): Promise<string> {
  const n = await nextSequenceValue('invoice_ref');
  return `INV-${String(n).padStart(6, '0')}`;
}
