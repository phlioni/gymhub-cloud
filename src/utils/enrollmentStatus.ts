export const getEnrollmentStatus = (expiryDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { 
      label: "Vencida", 
      variant: "destructive" as const, 
      days: Math.abs(diffDays),
      shouldNotify: true,
      notificationSent: false // This will be tracked in DB in future
    };
  } else if (diffDays === 0) {
    return { 
      label: "Vence Hoje", 
      variant: "destructive" as const, 
      days: 0,
      shouldNotify: true,
      notificationSent: false
    };
  } else if (diffDays <= 10) {
    return { 
      label: `${diffDays} dias`, 
      variant: "secondary" as const, 
      days: diffDays,
      shouldNotify: true,
      notificationSent: false
    };
  }
  
  return { 
    label: "Em dia", 
    variant: "default" as const, 
    days: diffDays,
    shouldNotify: false,
    notificationSent: false
  };
};
