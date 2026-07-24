import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InnopayCardParams } from '@/lib/payments';

// ============================================================
// 이노페이 자동결제(빌키 즉시등록) 카드 입력 폼 — 3개 결제 지점 공용
// 카드정보는 state로만 보관 후 엣지함수로 1회 전달 — 저장/로깅 금지.
// 스펙 1.2: "카드 유효성 확인용 10원 결제 후 즉시 취소" 고지 필수.
// ============================================================

export interface InnopayCardFormState {
  cardType: 'personal' | 'corporate';
  cardNum: string;
  expiry: string; // 표시용 MM/YY
  cardPwd: string;
  idNum: string;
}

export const emptyCardForm: InnopayCardFormState = {
  cardType: 'personal',
  cardNum: '',
  expiry: '',
  cardPwd: '',
  idNum: '',
};

/** 폼 상태 → API 파라미터 변환. 형식이 유효하지 않으면 null (제출 버튼 활성화 판정에도 사용) */
export function cardFormToApi(form: InnopayCardFormState): InnopayCardParams | null {
  const cardNum = form.cardNum.replace(/\D/g, '');
  const expiryDigits = form.expiry.replace(/\D/g, ''); // MMYY
  const cardPwd = form.cardPwd.replace(/\D/g, '');
  const idNum = form.idNum.replace(/\D/g, '');

  if (!/^\d{15,16}$/.test(cardNum)) return null;
  if (!/^(0[1-9]|1[0-2])\d{2}$/.test(expiryDigits)) return null;
  if (!/^\d{2}$/.test(cardPwd)) return null;
  if (form.cardType === 'personal' ? !/^\d{6}$/.test(idNum) : !/^\d{10}$/.test(idNum)) return null;

  return {
    cardNum,
    cardExpire: expiryDigits.slice(2, 4) + expiryDigits.slice(0, 2), // MMYY → YYMM
    cardPwd,
    idNum,
  };
}

interface InnopayCardFieldsProps {
  value: InnopayCardFormState;
  onChange: (value: InnopayCardFormState) => void;
  idPrefix: string; // 같은 화면에 폼이 2개 있어도 label 연결이 겹치지 않도록
}

export function InnopayCardFields({ value, onChange, idPrefix }: InnopayCardFieldsProps) {
  const { t } = useTranslation();

  const set = (patch: Partial<InnopayCardFormState>) => onChange({ ...value, ...patch });

  // 유효기간 입력: 숫자만 받아 MM/YY로 자동 포맷
  const handleExpiryChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    set({ expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits });
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-slate-600 dark:text-slate-300">
        {t('subscription.cardInfoTitle')}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {(['personal', 'corporate'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => set({ cardType: type, idNum: '' })}
            className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
              value.cardType === type
                ? 'border-blue-500 bg-blue-50 text-[#2563eb] dark:bg-blue-500/15'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-transparent dark:text-slate-300'
            }`}
          >
            {type === 'personal'
              ? t('subscription.cardTypePersonal')
              : t('subscription.cardTypeCorporate')}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-card-num`} className="text-xs text-slate-500">
          {t('subscription.cardNumber')}
        </Label>
        <Input
          id={`${idPrefix}-card-num`}
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={16}
          placeholder="0000000000000000"
          value={value.cardNum}
          onChange={(e) => set({ cardNum: e.target.value.replace(/\D/g, '').slice(0, 16) })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-card-expiry`} className="text-xs text-slate-500">
            {t('subscription.cardExpiry')}
          </Label>
          <Input
            id={`${idPrefix}-card-expiry`}
            inputMode="numeric"
            autoComplete="cc-exp"
            maxLength={5}
            placeholder="MM/YY"
            value={value.expiry}
            onChange={(e) => handleExpiryChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-card-pwd`} className="text-xs text-slate-500">
            {t('subscription.cardPwd2')}
          </Label>
          <Input
            id={`${idPrefix}-card-pwd`}
            type="password"
            inputMode="numeric"
            maxLength={2}
            placeholder="••"
            value={value.cardPwd}
            onChange={(e) => set({ cardPwd: e.target.value.replace(/\D/g, '').slice(0, 2) })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-card-idnum`} className="text-xs text-slate-500">
          {value.cardType === 'personal'
            ? t('subscription.idNumPersonal')
            : t('subscription.idNumCorporate')}
        </Label>
        <Input
          id={`${idPrefix}-card-idnum`}
          inputMode="numeric"
          maxLength={value.cardType === 'personal' ? 6 : 10}
          placeholder={value.cardType === 'personal' ? 'YYMMDD' : '0000000000'}
          value={value.idNum}
          onChange={(e) =>
            set({
              idNum: e.target.value
                .replace(/\D/g, '')
                .slice(0, value.cardType === 'personal' ? 6 : 10),
            })
          }
        />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        {t('subscription.autoBillingNotice')}
        <br />
        {t('subscription.tenWonNotice')}
      </p>
    </div>
  );
}
