import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group pointer-events-none z-[120]"
      position="top-center"
      offset={24}
      expand={true}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "group pointer-events-auto toast max-w-md w-full group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium group-[.toast]:rounded-full group-[.toast]:px-4",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:px-4",
          success:
            "group-[.toaster]:!bg-success/10 group-[.toaster]:!border-success group-[.toaster]:!text-success",
          error:
            "group-[.toaster]:!bg-destructive/10 group-[.toaster]:!border-destructive group-[.toaster]:!text-destructive",
          warning:
            "group-[.toaster]:!bg-warning/10 group-[.toaster]:!border-warning group-[.toaster]:!text-warning",
          info:
            "group-[.toaster]:!bg-info/10 group-[.toaster]:!border-info group-[.toaster]:!text-info",
          title: "group-[.toast]:font-semibold group-[.toast]:text-base",
          closeButton:
            "group-[.toast]:bg-muted group-[.toast]:text-foreground group-[.toast]:hover:bg-muted/80 group-[.toast]:rounded-full",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
