import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  variant: "police" | "tribunal";
  title: string;
  description?: string;
}

const ComingSoon = ({ variant, title, description }: ComingSoonProps) => {
  return (
    <DashboardLayout variant={variant} title={title}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-10 max-w-md text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Construction className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-heading font-semibold text-xl text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description ?? "Cette section est en cours de développement et sera disponible prochainement."}
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ComingSoon;
