import { differenceInDays, startOfDay } from 'date-fns';

export function getEnrollmentStatus(expiryDate: string | null): { text: string; variant: 'default' | 'secondary' | 'destructive'; daysRemaining: number | null } {
  if (!expiryDate) {
    return { text: "Sem Matrícula", variant: "secondary", daysRemaining: null };
  }

  const today = startOfDay(new Date());

  // --- CORREÇÃO AQUI ---
  // Criamos a data a partir do UTC e ajustamos para o fuso local para evitar o erro de um dia.
  const expiryDateUTC = new Date(expiryDate);
  const expiration = startOfDay(new Date(expiryDateUTC.valueOf() + expiryDateUTC.getTimezoneOffset() * 60 * 1000));
  // ---------------------

  const daysRemaining = differenceInDays(expiration, today);

  if (daysRemaining < 0) {
    return { text: "Vencido", variant: "destructive", daysRemaining };
  }
  if (daysRemaining === 0) {
    return { text: "Vence Hoje", variant: "destructive", daysRemaining };
  }
  if (daysRemaining <= 10) {
    // Adiciona uma lógica para singular/plural
    const dayText = daysRemaining === 1 ? 'dia' : 'dias';
    return { text: `Vence em ${daysRemaining} ${dayText}`, variant: "secondary", daysRemaining };
  }

  return { text: "Em Dia", variant: "default", daysRemaining };
}