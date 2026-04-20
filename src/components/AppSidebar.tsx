import {
  LayoutDashboard,
  FolderPlus,
  Send,
  FileSearch,
  Gavel,
  CalendarDays,
  Users,
  BarChart3,
  Scale,
  Shield,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const policeItems = [
  { title: "Tableau de bord", url: "/police", icon: LayoutDashboard },
  { title: "Nouveau dossier", url: "/police/nouveau", icon: FolderPlus },
  { title: "Mes dossiers", url: "/police/dossiers", icon: FileSearch },
  { title: "Transmettre", url: "/police/transmettre", icon: Send },
  { title: "Statistiques", url: "/police/stats", icon: BarChart3 },
];

const tribunalItems = [
  { title: "Tableau de bord", url: "/tribunal", icon: LayoutDashboard },
  { title: "Dossiers reçus", url: "/tribunal/dossiers", icon: FileSearch },
  { title: "Attribution", url: "/tribunal/attribution", icon: Users },
  { title: "Audiences", url: "/tribunal/audiences", icon: CalendarDays },
  { title: "Décisions", url: "/tribunal/decisions", icon: Gavel },
  { title: "Statistiques", url: "/tribunal/stats", icon: BarChart3 },
];

export function AppSidebar({ variant }: { variant: "police" | "tribunal" }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const items = variant === "police" ? policeItems : tribunalItems;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnecté");
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="sidebar-gradient">
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          {variant === "police" ? (
            <Shield className="h-7 w-7 text-sidebar-primary shrink-0" />
          ) : (
            <Scale className="h-7 w-7 text-sidebar-primary shrink-0" />
          )}
          {!collapsed && (
            <div>
              <h2 className="font-heading font-bold text-sidebar-foreground text-sm">
                JusticeLink
              </h2>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">
                {variant === "police" ? "Module Police" : "Module Tribunal"}
              </p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Back to home */}
        <div className="mt-auto p-4 space-y-1">
          {user && !collapsed && (
            <p className="text-[10px] text-sidebar-foreground/40 truncate px-2 mb-1">
              {user.email}
            </p>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {!collapsed && <span className="text-xs">Déconnexion</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/"
                  className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {!collapsed && <span className="text-xs">Changer de module</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
