import { z } from "zod";
import { esquemaTelefono } from "@/lib/datos/validacion";

export const esquemaDiagnosticoImagen = z.object({
  imageData: z.string().regex(/^data:image\/(jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/i),
  crop: z.string().trim().min(1).max(80),
  phone: esquemaTelefono,
  notes: z.string().trim().max(1000).optional(),
});

export const resultadoDiagnostico = z.object({
  summary: z.string().trim().min(1).max(1200),
  hypotheses: z.array(z.string().trim().min(1).max(300)).max(5),
  recommendations: z.array(z.string().trim().min(1).max(400)).max(6),
  confidence: z.enum(["low", "medium", "high"]),
  disclaimer: z.string().trim().min(1).max(500),
});

export type DiagnosticoImagen = z.infer<typeof esquemaDiagnosticoImagen>;
export type ResultadoDiagnostico = z.infer<typeof resultadoDiagnostico>;
