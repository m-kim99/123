import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateString: string | Date): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const koreaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = koreaDate.getFullYear();
  const month = String(koreaDate.getMonth() + 1).padStart(2, '0');
  const day = String(koreaDate.getDate()).padStart(2, '0');
  const hours = String(koreaDate.getHours()).padStart(2, '0');
  const minutes = String(koreaDate.getMinutes()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const koreaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = koreaDate.getFullYear();
  const month = String(koreaDate.getMonth() + 1).padStart(2, '0');
  const day = String(koreaDate.getDate()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일`;
}

export function formatDateTimeSimple(dateString: string | Date): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const koreaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = koreaDate.getFullYear();
  const month = String(koreaDate.getMonth() + 1).padStart(2, '0');
  const day = String(koreaDate.getDate()).padStart(2, '0');
  const hours = String(koreaDate.getHours()).padStart(2, '0');
  const minutes = String(koreaDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
