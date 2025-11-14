import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Configuracion = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Configuración</h2>
        <p className="text-muted-foreground">Ajusta las preferencias de tu cuenta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>Personaliza tu experiencia</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Opciones de configuración próximamente.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracion;
