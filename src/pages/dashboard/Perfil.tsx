import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { MessageSquare, Send, Inbox, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
}

const Perfil = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    totalMessages: 0,
    sentMessages: 0,
    receivedMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);

        // Fetch profile data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setProfile(profileData);

        if (profileData?.phone_number) {
          // Fetch all messages for this user
          const { data: messages } = await supabase
            .from("conversaciones")
            .select("*")
            .eq("numero_c", profileData.phone_number);

          if (messages) {
            // Calculate statistics
            const sentMessages = messages.filter(
              (msg) =>
                msg.tipo_mensaje === "salida" ||
                msg.tipo_mensaje === "saliente" ||
                msg.tipo_mensaje === "sent" ||
                msg.tipo_mensaje === "outgoing"
            ).length;

            const receivedMessages = messages.filter(
              (msg) =>
                msg.tipo_mensaje === "entrada" ||
                msg.tipo_mensaje === "entrante" ||
                msg.tipo_mensaje === "received" ||
                msg.tipo_mensaje === "incoming"
            ).length;

            // Get unique conversations
            const uniqueConversations = new Set(
              messages.map((msg) => msg.numero_w).filter(Boolean)
            );

            setStats({
              totalConversations: uniqueConversations.size,
              totalMessages: messages.length,
              sentMessages,
              receivedMessages,
            });
          }
        }
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: "Total Conversaciones",
      value: stats.totalConversations,
      icon: MessageSquare,
      description: "Conversaciones activas",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Mensajes Totales",
      value: stats.totalMessages,
      icon: TrendingUp,
      description: "Todos los mensajes",
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Mensajes Enviados",
      value: stats.sentMessages,
      icon: Send,
      description: "Mensajes salientes",
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Mensajes Recibidos",
      value: stats.receivedMessages,
      icon: Inbox,
      description: "Mensajes entrantes",
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Resumen de tu actividad</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {loading ? "..." : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Usuario</CardTitle>
          <CardDescription>Tus datos personales y de contacto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Nombre</p>
              <p className="text-base text-foreground">
                {profile?.first_name || "No especificado"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Apellido</p>
              <p className="text-base text-foreground">
                {profile?.last_name || "No especificado"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
              <p className="text-base text-foreground font-mono">
                {profile?.phone_number || "No especificado"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Correo Electrónico
              </p>
              <p className="text-base text-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Perfil;
