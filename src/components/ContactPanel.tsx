import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactData {
  id: string;
  numero_w: string;
  nombre: string | null;
  email: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactPanelProps {
  numeroW: string;
}

const ESTADOS = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-500" },
  { value: "contactado", label: "Contactado", color: "bg-yellow-500" },
  { value: "calificado", label: "Calificado", color: "bg-purple-500" },
  { value: "propuesta", label: "Propuesta", color: "bg-orange-500" },
  { value: "ganado", label: "Ganado", color: "bg-green-500" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" },
];

export const ContactPanel = ({ numeroW }: ContactPanelProps) => {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    estado: "nuevo",
    notas: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContact();
  }, [numeroW]);

  const fetchContact = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("contactos")
      .select("*")
      .eq("numero_w", numeroW)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching contact:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el contacto",
      });
    } else if (data) {
      setContact(data);
      setFormData({
        nombre: data.nombre || "",
        email: data.email || "",
        estado: data.estado,
        notas: data.notas || "",
      });
    } else {
      // Crear contacto si no existe
      await createNewContact();
    }
    
    setLoading(false);
  };

  const createNewContact = async () => {
    const { data, error } = await supabase
      .from("contactos")
      .insert({
        numero_w: numeroW,
        estado: "nuevo",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating contact:", error);
    } else if (data) {
      setContact(data);
      setFormData({
        nombre: "",
        email: "",
        estado: "nuevo",
        notas: "",
      });
    }
  };

  const handleSave = async () => {
    if (!contact) return;

    const { error } = await supabase
      .from("contactos")
      .update({
        nombre: formData.nombre || null,
        email: formData.email || null,
        estado: formData.estado,
        notas: formData.notas || null,
      })
      .eq("id", contact.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el contacto",
      });
    } else {
      toast({
        title: "Contacto actualizado",
        description: "Los cambios se guardaron correctamente",
      });
      setEditing(false);
      fetchContact();
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estadoConfig = ESTADOS.find((e) => e.value === estado);
    return (
      <Badge className={`${estadoConfig?.color} text-white`}>
        {estadoConfig?.label || estado}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className={cn(
        "relative border-l border-border bg-card transition-all duration-300",
        isExpanded ? "w-80" : "w-12"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 -left-3 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-md"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {isExpanded && <p className="p-4 text-muted-foreground">Cargando...</p>}
      </div>
    );
  }

  return (
    <div className={cn(
      "relative border-l border-border bg-card overflow-y-auto transition-all duration-300",
      isExpanded ? "w-80" : "w-12"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 -left-3 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-md"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
      
      {isExpanded && (
        <Card className="border-0 rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado del Lead */}
            <div className="space-y-2">
              <Label>Estado del Lead</Label>
              {editing ? (
                <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div>{getEstadoBadge(contact?.estado || "nuevo")}</div>
              )}
            </div>

            {/* Número de WhatsApp */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número
              </Label>
              <Input value={numeroW} disabled className="bg-muted" />
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                disabled={!editing}
                placeholder="Nombre del contacto"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editing}
                placeholder="correo@ejemplo.com"
              />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                disabled={!editing}
                placeholder="Notas sobre el contacto..."
                rows={4}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button onClick={handleSave} className="flex-1">
                    Guardar
                  </Button>
                  <Button onClick={() => setEditing(false)} variant="outline" className="flex-1">
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} className="w-full">
                  Editar
                </Button>
              )}
            </div>

            {/* Metadata */}
            {contact && (
              <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
                <p>Creado: {new Date(contact.created_at).toLocaleDateString()}</p>
                <p>Actualizado: {new Date(contact.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
