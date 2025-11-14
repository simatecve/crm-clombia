-- Crear tabla de contactos/leads para gestión y seguimiento
CREATE TABLE public.contactos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_w TEXT NOT NULL UNIQUE,
  nombre TEXT,
  email TEXT,
  estado TEXT NOT NULL DEFAULT 'nuevo',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios autenticados puedan ver todos los contactos
CREATE POLICY "Usuarios autenticados pueden ver contactos"
  ON public.contactos
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para que los usuarios autenticados puedan crear contactos
CREATE POLICY "Usuarios autenticados pueden crear contactos"
  ON public.contactos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para que los usuarios autenticados puedan actualizar contactos
CREATE POLICY "Usuarios autenticados pueden actualizar contactos"
  ON public.contactos
  FOR UPDATE
  TO authenticated
  USING (true);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_contactos_updated_at
  BEFORE UPDATE ON public.contactos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear índice para búsquedas rápidas por número
CREATE INDEX idx_contactos_numero_w ON public.contactos(numero_w);

-- Crear índice para filtrar por estado
CREATE INDEX idx_contactos_estado ON public.contactos(estado);
