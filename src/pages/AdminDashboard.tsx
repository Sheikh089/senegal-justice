import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Scale, UserPlus, Trash2, Users, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string | null;
  department: string | null;
  badge_number: string | null;
  created_at: string;
}

const ROLES = [
  { value: "police", label: "Police", icon: Shield, color: "bg-blue-100 text-blue-800" },
  { value: "procureur", label: "Procureur", icon: Scale, color: "bg-purple-100 text-purple-800" },
  { value: "juge", label: "Juge", icon: Scale, color: "bg-amber-100 text-amber-800" },
  { value: "greffier", label: "Greffier", icon: Scale, color: "bg-green-100 text-green-800" },
  { value: "assistant", label: "Assistant", icon: Users, color: "bg-gray-100 text-gray-800" },
];

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "",
    department: "",
    badge_number: "",
  });

  const invokeAdmin = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await invokeAdmin({ action: "list" });
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) {
      toast({ title: "Erreur", description: "Sélectionnez un rôle", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await invokeAdmin({ action: "create", ...form });
      toast({ title: "Succès", description: "Compte créé avec succès" });
      setDialogOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "", department: "", badge_number: "" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (userId: string, name: string) => {
    try {
      await invokeAdmin({ action: "delete", user_id: userId });
      toast({ title: "Supprimé", description: `${name} a été supprimé` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const getRoleBadge = (role: string | null) => {
    const r = ROLES.find((x) => x.value === role);
    if (!r) return <Badge variant="outline">Aucun rôle</Badge>;
    return <Badge className={r.color}>{r.label}</Badge>;
  };

  const roleCounts = ROLES.map((r) => ({
    ...r,
    count: users.filter((u) => u.role === r.value).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-foreground">Administration</h1>
            <p className="text-xs text-muted-foreground">Gestion des utilisateurs JusticeLink</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Déconnexion
        </Button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {roleCounts.map((r) => (
            <Card key={r.value}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{r.count}</p>
                <p className="text-xs text-muted-foreground">{r.label}s</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Utilisateurs ({users.length})</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" /> Nouveau compte
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un compte</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom complet *</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mot de passe *</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle *</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Département</Label>
                      <Input
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>N° Badge</Label>
                      <Input
                        value={form.badge_number}
                        onChange={(e) => setForm({ ...form, badge_number: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? "Création..." : "Créer le compte"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Département</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucun utilisateur
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell className="text-muted-foreground">{u.department || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u.badge_number || "—"}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer {u.full_name} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Le compte et toutes ses données seront supprimés.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(u.user_id, u.full_name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
