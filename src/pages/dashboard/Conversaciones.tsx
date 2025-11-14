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
      // Call edge function to send message to webhook
      const { error: functionError } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          mensaje: newMessage.trim(),
          numero_c: userPhone,
          numero_w: selectedConversation,
          tipo_mensaje: "salida",
          sentid: "sent",
        },
      });

      if (functionError) {
        throw new Error(functionError.message || "Error al enviar mensaje al webhook");
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
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Conversations List */}
      <div className="w-80 border-r border-border bg-card shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Chats</h2>
          <p className="text-xs text-muted-foreground mt-1">Inbox · {conversations.length} conversaciones</p>
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
                  "w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-all duration-200 border-b border-border/50",
                  selectedConversation === conv.numero_w && "bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className={cn(
                      "text-sm font-medium",
                      selectedConversation === conv.numero_w 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {conv.numero_w?.slice(-2) || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card"></div>
                </div>
                <div className="flex-1 text-left overflow-hidden min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={cn(
                      "font-semibold text-sm truncate",
                      selectedConversation === conv.numero_w ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {conv.numero_w}
                    </p>
                    <span className={cn(
                      "text-xs shrink-0",
                      selectedConversation === conv.numero_w ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {new Date(conv.lastMessageTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm truncate",
                    selectedConversation === conv.numero_w ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {conv.lastMessage}
                  </p>
                </div>
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
            <div className="p-4 border-b border-border bg-card flex items-center gap-3 shadow-sm">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {selectedConversation.slice(-2)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card"></div>
              </div>
              <div>
                <p className="font-semibold text-foreground">{selectedConversation}</p>
                <p className="text-xs text-green-600 font-medium">Online</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4 max-w-4xl mx-auto">
                {selectedMessages.map((msg) => {
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
                        "flex items-end gap-2",
                        isOutgoing ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isOutgoing && (
                        <Avatar className="h-8 w-8 mb-1">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {selectedConversation.slice(-2)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm",
                          isOutgoing
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card text-card-foreground border border-border rounded-bl-md"
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          {msg.mensaje && (
                            <p className="text-sm break-words leading-relaxed">{msg.mensaje}</p>
                          )}
                          {msg.url_adjunto && (
                            <a
                              href={msg.url_adjunto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline mt-1"
                            >
                              Ver adjunto
                            </a>
                          )}
                          <span
                            className={cn(
                              "text-xs mt-1",
                              isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {isOutgoing && (
                        <Avatar className="h-8 w-8 mb-1">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            Yo
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card shadow-sm">
              <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={sending}
                      className="shrink-0"
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 border-0" align="start">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </PopoverContent>
                </Popover>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
                  disabled={sending}
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending}
                  size="icon"
                  className="shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="m22 2-7 20-4-9-9-4Z"/>
                    <path d="M22 2 11 13"/>
                  </svg>
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
