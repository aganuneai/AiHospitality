
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Check if exists
import { Label } from '@/components/ui/label';
import { CreditCard, Wallet, Banknote } from 'lucide-react';
import { PaymentMethodType } from '@/lib/schemas/payment/payment.schema';

interface PaymentMethodSelectorProps {
    value: PaymentMethodType;
    onChange: (method: PaymentMethodType) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
    return (
        <RadioGroup
            value={value}
            onValueChange={(val) => onChange(val as PaymentMethodType)}
            className="grid grid-cols-3 gap-4"
        >
            <div>
                <RadioGroupItem value="CREDIT_CARD" id="pm-card" className="peer sr-only" />
                <Label
                    htmlFor="pm-card"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                    <CreditCard className="mb-3 h-6 w-6" />
                    Credit Card
                </Label>
            </div>
            <div>
                <RadioGroupItem value="CASH" id="pm-cash" className="peer sr-only" />
                <Label
                    htmlFor="pm-cash"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                    <Banknote className="mb-3 h-6 w-6" />
                    Cash
                </Label>
            </div>
            <div>
                <RadioGroupItem value="TRANSFER" id="pm-transfer" className="peer sr-only" />
                <Label
                    htmlFor="pm-transfer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                    <Wallet className="mb-3 h-6 w-6" />
                    Transfer
                </Label>
            </div>
        </RadioGroup>
    );
}
