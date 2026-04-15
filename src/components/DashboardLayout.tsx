import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, User } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  variant: "police" | "tribunal";
  title: string;
}

export function DashboardLayout({ children, variant, title }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar variant={variant} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <h1 className="font-heading font-semibold text-foreground text-sm">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
              </button>
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-foreground">
                    {variant === "police" ? "Cpt. Sarah Kabila" : "Juge Honoré Lukusa"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {variant === "police" ? "Commissariat Central" : "Tribunal de Grande Instance"}
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
