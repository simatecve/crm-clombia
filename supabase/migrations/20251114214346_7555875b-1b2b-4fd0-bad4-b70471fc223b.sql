-- Crear tablas para integración de Facebook Messenger e Instagram

-- Tabla para guardar configuraciones de páginas/cuentas conectadas
CREATE TABLE public.integraciones_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plataforma TEXT NOT NULL CHECK (plataforma IN ('facebook', 'instagram')),
  page_id TEXT NOT NULL,
  page_name TEXT,
  page_access_token TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  ultima_sincronizacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, plataforma, page_id)
);

-- Tabla para guardar conversaciones de redes sociales
CREATE TABLE public.conversaciones_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracion_id UUID REFERENCES public.integraciones_sociales(id) ON DELETE CASCADE NOT NULL,
  conversation_id TEXT NOT NULL,
  plataforma TEXT NOT NULL CHECK (plataforma IN ('facebook', 'instagram')),
  participante_id TEXT,
  participante_nombre TEXT,
  participante_avatar TEXT,
  ultimo_mensaje TEXT,
  ultimo_mensaje_fecha TIMESTAMPTZ,
  no_leidos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integracion_id, conversation_id)
);

-- Tabla para guardar mensajes de redes sociales
CREATE TABLE public.mensajes_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID REFERENCES public.conversaciones_sociales(id) ON DELETE CASCADE NOT NULL,
  message_id TEXT NOT NULL,
  de_usuario_id TEXT,
  de_usuario_nombre TEXT,
  texto TEXT,
  adjuntos JSONB,
  tipo TEXT DEFAULT 'text',
  es_enviado BOOLEAN DEFAULT false,
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversacion_id, message_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_integraciones_user ON public.integraciones_sociales(user_id);
CREATE INDEX idx_conversaciones_integracion ON public.conversaciones_sociales(integracion_id);
CREATE INDEX idx_conversaciones_fecha ON public.conversaciones_sociales(ultimo_mensaje_fecha DESC);
CREATE INDEX idx_mensajes_conversacion ON public.mensajes_sociales(conversacion_id);
CREATE INDEX idx_mensajes_fecha ON public.mensajes_sociales(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.integraciones_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_sociales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para integraciones_sociales
CREATE POLICY "Usuarios ven sus propias integraciones"
  ON public.integraciones_sociales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios crean sus propias integraciones"
  ON public.integraciones_sociales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus propias integraciones"
  ON public.integraciones_sociales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus propias integraciones"
  ON public.integraciones_sociales FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para conversaciones_sociales
CREATE POLICY "Usuarios ven conversaciones de sus integraciones"
  ON public.conversaciones_sociales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.integraciones_sociales
      WHERE id = conversaciones_sociales.integracion_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Sistema crea conversaciones"
  ON public.conversaciones_sociales FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.integraciones_sociales
      WHERE id = conversaciones_sociales.integracion_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Sistema actualiza conversaciones"
  ON public.conversaciones_sociales FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.integraciones_sociales
      WHERE id = conversaciones_sociales.integracion_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios eliminan sus conversaciones"
  ON public.conversaciones_sociales FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.integraciones_sociales
      WHERE id = conversaciones_sociales.integracion_id
      AND user_id = auth.uid()
    )
  );

-- Políticas RLS para mensajes_sociales
CREATE POLICY "Usuarios ven mensajes de sus conversaciones"
  ON public.mensajes_sociales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversaciones_sociales cs
      JOIN public.integraciones_sociales i ON cs.integracion_id = i.id
      WHERE cs.id = mensajes_sociales.conversacion_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Sistema crea mensajes"
  ON public.mensajes_sociales FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversaciones_sociales cs
      JOIN public.integraciones_sociales i ON cs.integracion_id = i.id
      WHERE cs.id = mensajes_sociales.conversacion_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Sistema actualiza mensajes"
  ON public.mensajes_sociales FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversaciones_sociales cs
      JOIN public.integraciones_sociales i ON cs.integracion_id = i.id
      WHERE cs.id = mensajes_sociales.conversacion_id
      AND i.user_id = auth.uid()
    )
  );

-- Trigger para actualizar updated_at
CREATE TRIGGER update_integraciones_sociales_updated_at
  BEFORE UPDATE ON public.integraciones_sociales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversaciones_sociales_updated_at
  BEFORE UPDATE ON public.conversaciones_sociales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();