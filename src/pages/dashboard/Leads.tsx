import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Phone, Mail, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Lead {
  id: string;
  numero_w: string;
  nombre: string | null;
  email: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

const ESTADOS = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-500", textColor: "text-blue-500" },
  { value: "contactado", label: "Contactado", color: "bg-yellow-500", textColor: "text-yellow-600" },
  { value: "calificado", label: "Calificado", color: "bg-purple-500", textColor: "text-purple-500" },
  { value: "propuesta", label: "Propuesta", color: "bg-orange-500", textColor: "text-orange-500" },
  { value: "ganado", label: "Ganado", color: "bg-green-500", textColor: "text-green-600" },
  { value: "perdido", label: "Perdido", color: "bg-red-500", textColor: "text-red-600" },
];

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("contactos")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los leads",
      });
    } else {
      setLeads(data || []);
    }

    setLoading(false);
  };

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newEstado: string) => {
    if (!draggedLead) return;

    const { error } = await supabase
      .from("contactos")
      .update({ estado: newEstado })
      .eq("id", draggedLead.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado del lead",
      });
    } else {
      toast({
        title: "Lead actualizado",
        description: `El lead fue movido a ${ESTADOS.find((e) => e.value === newEstado)?.label}`,
      });
      fetchLeads();
    }

    setDraggedLead(null);
  };

  const getLeadsByEstado = (estado: string) => {
    return leads.filter((lead) => lead.estado === estado);
  };

  const handleLeadClick = (lead: Lead) => {
    navigate(`/dashboard/conversaciones?numero=${lead.numero_w}`);
  };

  if (loading) {
    return <div className="p-4">Cargando leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Gestión de Leads</h2>
        <p className="text-muted-foreground">Kanban para seguimiento de contactos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {ESTADOS.map((estado) => {
          const leadsEnEstado = getLeadsByEstado(estado.value);
          
          return (
            <div
              key={estado.value}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(estado.value)}
              className="flex flex-col"
            >
              <Card className="flex-1">
                <CardHeader className={cn("pb-3", estado.color, "text-white")}>
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {estado.label}
                    <Badge variant="secondary" className="ml-2">
                      {leadsEnEstado.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="space-y-2">
                      {leadsEnEstado.map((lead) => (
                        <Card
                          key={lead.id}
                          draggable
                          onDragStart={() => handleDragStart(lead)}
                          onClick={() => handleLeadClick(lead)}
                          className="p-3 cursor-move hover:shadow-md transition-shadow"
                        >
                          <div className="space-y-2">
                            <div className="font-medium text-sm">
                              {lead.nombre || "Sin nombre"}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{lead.numero_w}</span>
                            </div>
                            {lead.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            {lead.notas && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {lead.notas}
                              </p>
                            )}
                            <div className="flex items-center gap-2 pt-2 border-t border-border">
                              <MessageSquare className="h-3 w-3 text-primary" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(lead.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {leadsEnEstado.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No hay leads en esta etapa
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leads;
