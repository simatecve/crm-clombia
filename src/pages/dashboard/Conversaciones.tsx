import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
                  const isReceived = msg.sentid === "received" || msg.numero_w === selectedConversation;
                  
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        isReceived ? "justify-start" : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          isReceived
                            ? "bg-card text-card-foreground"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
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
                        <p
                          className={cn(
                            "text-xs mt-1",
                            isReceived ? "text-muted-foreground" : "text-primary-foreground/70"
                          )}
                        >
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecciona una conversación
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversaciones;
