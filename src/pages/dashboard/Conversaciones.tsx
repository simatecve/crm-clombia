import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ContactPanel } from "@/components/ContactPanel";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  mensaje: string | null;
  numero_w: string | null;
  numero_c: string | null;
  created_at: string;
  tipo_mensaje: string | null;
  url_adjunto: string | null;
  sentid: string | null;
}

interface Conversation {
  numero_w: string;
  lastMessage: string;
  lastMessageTime: string;
  messages: Message[];
}

const Conversaciones = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchConversations = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get user phone number
      const { data: profileData } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", session.user.id)
        .single();

      if (profileData?.phone_number) {
        setUserPhone(profileData.phone_number);

        // Fetch all conversations for this user
        const { data: messages } = await supabase
          .from("conversaciones")
          .select("*")
          .eq("numero_c", profileData.phone_number)
          .order("created_at", { ascending: true });

        if (messages) {
          // Group messages by numero_w
          const grouped = messages.reduce((acc: { [key: string]: Message[] }, msg) => {
            const key = msg.numero_w || "unknown";
            if (!acc[key]) acc[key] = [];
            acc[key].push(msg);
            return acc;
          }, {});

          // Convert to conversation format
          const convs: Conversation[] = Object.entries(grouped).map(([numero_w, msgs]) => {
            const lastMsg = msgs[msgs.length - 1];
            return {
              numero_w,
              lastMessage: lastMsg.mensaje || "Adjunto",
              lastMessageTime: lastMsg.created_at,
              messages: msgs,
            };
          });

          setConversations(convs);
          if (convs.length > 0) {
            setSelectedConversation(convs[0].numero_w);
          }
        }
      }

      setLoading(false);
    };

    fetchConversations();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !userPhone) return;

    setSending(true);

    try {
      // Call webhook to send message
      const webhookResponse = await fetch("https://agentes1111-n8n.vnh08s.easypanel.host/webhook/enviarm_mensaje", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mensaje: newMessage.trim(),
          numero_c: userPhone,
          numero_w: selectedConversation,
          tipo_mensaje: "salida",
          sentid: "sent",
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error("Error al enviar mensaje al webhook");
      }

      // Also save to database
      const { error } = await supabase.from("conversaciones").insert({
        numero_c: userPhone,
        numero_w: selectedConversation,
        mensaje: newMessage.trim(),
        tipo_mensaje: "salida",
        sentid: "sent",
      });

      if (error) throw error;

      // Refresh conversations after sending
      const { data: messages } = await supabase
        .from("conversaciones")
        .select("*")
        .eq("numero_c", userPhone)
        .order("created_at", { ascending: true });

      if (messages) {
        const grouped = messages.reduce((acc: { [key: string]: Message[] }, msg) => {
          const key = msg.numero_w || "unknown";
          if (!acc[key]) acc[key] = [];
          acc[key].push(msg);
          return acc;
        }, {});

        const convs: Conversation[] = Object.entries(grouped).map(([numero_w, msgs]) => {
          const lastMsg = msgs[msgs.length - 1];
          return {
            numero_w,
            lastMessage: lastMsg.mensaje || "Adjunto",
            lastMessageTime: lastMsg.created_at,
            messages: msgs,
          };
        });

        setConversations(convs);
      }

      setNewMessage("");
      toast({
        title: "Mensaje enviado",
        description: "El mensaje se ha enviado correctamente",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const selectedMessages = conversations.find(
    (c) => c.numero_w === selectedConversation
  )?.messages || [];

  if (loading) {
    return <div className="p-4">Cargando conversaciones...</div>;
  }

  if (!userPhone) {
    return (
      <div className="p-4">
        <Card className="p-6">
          <p className="text-muted-foreground">
            No tienes un número de teléfono asociado a tu perfil. Por favor actualiza tu perfil.
          </p>
        </Card>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">No hay conversaciones</h3>
          <p className="text-muted-foreground text-sm mb-2">
            Buscando conversaciones para el número: <span className="font-mono">{userPhone}</span>
          </p>
          <p className="text-muted-foreground text-sm">
            No se encontraron mensajes en la tabla conversaciones donde numero_c = {userPhone}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List */}
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Conversaciones</h2>
        </div>
        <ScrollArea className="h-[calc(100%-5rem)]">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No hay conversaciones
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.numero_w}
                onClick={() => setSelectedConversation(conv.numero_w)}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-accent transition-colors border-b border-border",
                  selectedConversation === conv.numero_w && "bg-accent"
                )}
              >
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {conv.numero_w?.slice(-2) || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="font-medium text-foreground truncate">
                    {conv.numero_w}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(conv.lastMessageTime).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {selectedConversation.slice(-2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{selectedConversation}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMessages.length} mensajes
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedMessages.map((msg) => {
                  // Mensajes de salida: enviados por mí (usuario logueado)
                  // Mensajes de entrada: recibidos del cliente
                  const isOutgoing = 
                    msg.tipo_mensaje === "salida" || 
                    msg.tipo_mensaje === "saliente" || 
                    msg.tipo_mensaje === "sent" || 
                    msg.tipo_mensaje === "outgoing";
                  
                  const isIncoming = 
                    msg.tipo_mensaje === "entrada" || 
                    msg.tipo_mensaje === "entrante" || 
                    msg.tipo_mensaje === "received" || 
                    msg.tipo_mensaje === "incoming";
                  
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        isOutgoing ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          isOutgoing
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-card-foreground border border-border"
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          {msg.mensaje && (
                            <p className="text-sm break-words">{msg.mensaje}</p>
                          )}
                          {msg.url_adjunto && (
                            <a
                              href={msg.url_adjunto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline"
                            >
                              Ver adjunto
                            </a>
                          )}
                          <div className="flex items-center gap-2 justify-between">
                            <span
                              className={cn(
                                "text-xs",
                                isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {isOutgoing ? "Enviado" : "Recibido"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={sending}
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 border-0" align="end">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button type="submit" disabled={!newMessage.trim() || sending}>
                  {sending ? "Enviando..." : "Enviar"}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecciona una conversación
          </div>
        )}
      </div>

      {/* Contact Panel */}
      {selectedConversation && <ContactPanel numeroW={selectedConversation} />}
    </div>
  );
};

export default Conversaciones;
