import { useState } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  onConfirm: (justification: string) => void;
}

export function ResetButton({ onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [justification, setJustification] = useState("");

  const reset = () => {
    setStep(1);
    setJustification("");
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reiniciar</span>
      </Button>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                Atenção: ação irreversível
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação apagará todas as respostas, justificativas e avaliações
                qualitativas do painel. Não há como desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button variant="destructive" onClick={() => setStep(2)}>
                Continuar
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Justifique o reset</AlertDialogTitle>
              <AlertDialogDescription>
                Descreva o motivo (mínimo 20 caracteres). O registro fica em log de
                auditoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex.: nova clínica, dados de teste, mudança de gestão…"
              className="min-h-[100px]"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={justification.trim().length < 20}
                onClick={() => {
                  onConfirm(justification.trim());
                  setOpen(false);
                  reset();
                }}
              >
                Confirmar reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
