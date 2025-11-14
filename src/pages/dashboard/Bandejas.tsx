import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Bandejas = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Bandejas</h2>
        <p className="text-muted-foreground">Gestiona tus bandejas de entrada</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bandeja de Entrada</CardTitle>
          <CardDescription>Próximamente disponible</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta sección estará disponible pronto.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Bandejas;
