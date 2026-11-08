/**
 * Converts a number to Indian numbering words format (e.g. 1,45,450 -> One Lakh Forty Five Thousand Four Hundred Fifty Rupees)
 */
export function numberToIndianWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Zero Rupees';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    const t = tens[Math.floor(n / 10)];
    const o = ones[n % 10];
    return o ? `${t} ${o}` : t;
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const hStr = h > 0 ? `${ones[h]} Hundred` : '';
    const remStr = convertTwoDigits(rem);
    if (hStr && remStr) return `${hStr} ${remStr}`;
    return hStr || remStr;
  }

  const intPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - intPart) * 100);

  let crore = Math.floor(intPart / 10000000);
  let remainder = intPart % 10000000;

  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  let hundredPart = remainder;

  let result = '';

  if (crore > 0) {
    result += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    result += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    result += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (hundredPart > 0) {
    result += `${convertThreeDigits(hundredPart)} `;
  }

  result = result.trim() + ' Rupees';

  if (decimalPart > 0) {
    result += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }

  return result.replace(/\s+/g, ' ').trim();
}
