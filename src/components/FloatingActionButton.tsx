import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";

interface FloatingActionButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    className?: string;
}

export const FloatingActionButton = ({ label, icon, onClick, className, ...props }: FloatingActionButtonProps) => {
    return (
        <Button
            onClick={onClick}
            className={cn(
                "fixed bottom-6 right-6 md:hidden rounded-full shadow-lg h-14 px-5 text-base flex items-center gap-2",
                className
            )}
            {...props}
        >
            {icon}
            <span className="font-semibold">{label}</span>
        </Button>
    );
};