const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${tens[t]}${o ? " " + ones[o] : ""}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = "";
  if (h) out += `${ones[h]} Hundred${rest ? " " : ""}`;
  if (rest) out += twoDigits(rest);
  return out;
}

/** Converts an integer (Indian numbering: crore/lakh/thousand) into words */
function integerToWords(num: number): string {
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ");
}

/** Converts a rupee amount (can have paise) into "Indian Rupees ... Only" words */
export function amountInWords(amount: number): string {
  if (!isFinite(amount) || amount < 0) amount = 0;
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = `Rupees ${integerToWords(rupees)}`;
  if (paise > 0) {
    words += ` and ${integerToWords(paise)} Paise`;
  }
  words += " Only";
  return words;
}
