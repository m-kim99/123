import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// UTC 시간을 한국 시간(KST, UTC+9)으로 변환
function toKoreaTime(date: Date): Date {
  // UTC 시간에 9시간을 더해 한국 시간으로 변환
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

export function formatDateTime(dateString: string | Date): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const koreaDate = toKoreaTime(date);
  const year = koreaDate.getUTCFullYear();
  const month = String(koreaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreaDate.getUTCDate()).padStart(2, '0');
  const hours = String(koreaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(koreaDate.getUTCMinutes()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const koreaDate = toKoreaTime(date);
  const year = koreaDate.getUTCFullYear();
  const month = String(koreaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreaDate.getUTCDate()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일`;
}

export function formatDateTimeSimple(dateString: string | Date): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const koreaDate = toKoreaTime(date);
  const year = koreaDate.getUTCFullYear();
  const month = String(koreaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreaDate.getUTCDate()).padStart(2, '0');
  const hours = String(koreaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(koreaDate.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
