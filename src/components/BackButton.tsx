import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className = '' }: BackButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className={`bg-[#2563eb] text-white hover:bg-[#1d4ed8] hover:text-white ${className}`}
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {t('common.back')}
    </Button>
  );
}
