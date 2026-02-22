import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { Guest, Stay } from '@/lib/schemas/booking/booking.schema'; // Not strictly needed if we define shape here

export interface BookingFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

interface BookingFormProps {
    onSubmit: (data: BookingFormData) => void;
    isLoading: boolean;
}

export function BookingForm({ onSubmit, isLoading }: BookingFormProps) {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                        id="firstName"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="João"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input
                        id="lastName"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Silva"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="joao.silva@exemplo.com"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                    id="phone"
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+55 11 99999-9999"
                />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Processando..." : "Confirmar Reserva"}
            </Button>
        </form>
    );
}
