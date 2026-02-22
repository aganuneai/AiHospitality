
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Assuming Label exists or use basic label
import { Lock } from 'lucide-react';
import { CreditCard } from '@/lib/schemas/payment/payment.schema';

interface CreditCardInputProps {
    value: Partial<CreditCard>;
    onChange: (field: keyof CreditCard, value: string) => void;
    errors?: Partial<Record<keyof CreditCard, string>>;
}

export function CreditCardInput({ value, onChange, errors = {} }: CreditCardInputProps) {

    // Auto-format card number chunks
    const formatCardNumber = (val: string) => {
        const v = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length) {
            return parts.join(' ');
        } else {
            return val;
        }
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\s/g, '');
        // Limit to 19 digits
        if (raw.length <= 19) {
            onChange('number', raw);
        }
    };

    return (
        <div className="space-y-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Secure Card Details</h3>
            </div>

            <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                    id="card-number"
                    placeholder="0000 0000 0000 0000"
                    value={formatCardNumber(value.number || '')}
                    onChange={handleNumberChange}
                    maxLength={23} // 19 digits + spaces
                    className={errors.number ? "border-red-500" : ""}
                />
                {errors.number && <p className="text-xs text-red-500">{errors.number}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="card-expiry">Expiry (MM/YY)</Label>
                    <Input
                        id="card-expiry"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={value.expiry || ''}
                        onChange={(e) => onChange('expiry', e.target.value)}
                        className={errors.expiry ? "border-red-500" : ""}
                    />
                    {errors.expiry && <p className="text-xs text-red-500">{errors.expiry}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="card-cvc">CVC</Label>
                    <Input
                        id="card-cvc"
                        placeholder="123"
                        maxLength={4}
                        type="password"
                        value={value.cvc || ''}
                        onChange={(e) => onChange('cvc', e.target.value)}
                        className={errors.cvc ? "border-red-500" : ""}
                    />
                    {errors.cvc && <p className="text-xs text-red-500">{errors.cvc}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="card-name">Cardholder Name</Label>
                <Input
                    id="card-name"
                    placeholder="Name on Card"
                    value={value.holderName || ''}
                    onChange={(e) => onChange('holderName', e.target.value)}
                    className={errors.holderName ? "border-red-500" : ""}
                />
                {errors.holderName && <p className="text-xs text-red-500">{errors.holderName}</p>}
            </div>
        </div>
    );
}
