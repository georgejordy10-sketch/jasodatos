export type JasoJevasaPlan = "basic" | "pro" | "ultra";

export type ProspectPipelineStage =
  | "nuevo"
  | "investigado"
  | "calificado"
  | "contactado"
  | "respondio"
  | "interesado"
  | "demo_agendada"
  | "diagnostico_pendiente"
  | "diagnostico_en_revision"
  | "diagnostico_enviado"
  | "propuesta_pendiente"
  | "negociacion"
  | "ganado"
  | "perdido"
  | "no_contactar"
  | "convertido_cliente"
  | "fuera_de_perfil";

export type ProspectTemperature =
  | "frio"
  | "tibio"
  | "caliente"
  | "muy_caliente";

export type ProspectFit = "bajo" | "medio" | "alto" | "ideal";

export type ProspectPriority = "baja" | "media" | "alta" | "urgente";

export type ProspectOriginType =
  | "inbound"
  | "outbound"
  | "referral"
  | "manual_research"
  | "existing_contact"
  | "event";

export type ProspectChannel =
  | "whatsapp"
  | "email"
  | "formulario_web"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "telefono"
  | "referido"
  | "manual";

export type AdminProspectOverview = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  business_type: string | null;
  source: string | null;
  source_url: string | null;
  channel: ProspectChannel;
  lead_origin_type: ProspectOriginType;
  pipeline_stage: ProspectPipelineStage;
  lead_temperature: ProspectTemperature;
  lead_fit: ProspectFit;
  lead_priority: ProspectPriority;
  score: number;
  recommended_plan: JasoJevasaPlan | null;
  owner_name: string | null;
  next_action_at: string | null;
  last_interaction_at: string | null;
  notes: string | null;
  do_not_contact: boolean;
  contact_allowed: boolean;
  converted_business_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

export function jasoJevasaPlanLabel(plan: JasoJevasaPlan | null) {
  if (plan === "basic") return "Inicio";
  if (plan === "pro") return "Crecimiento";
  if (plan === "ultra") return "Control";
  return "Sin plan";
}

export function prospectStageLabel(stage: ProspectPipelineStage) {
  const labels: Record<ProspectPipelineStage, string> = {
    nuevo: "Nuevo",
    investigado: "Investigado",
    calificado: "Calificado",
    contactado: "Contactado",
    respondio: "Respondió",
    interesado: "Interesado",
    demo_agendada: "Demo agendada",
    diagnostico_pendiente: "Diagnóstico pendiente",
    diagnostico_en_revision: "Diagnóstico en revisión",
    diagnostico_enviado: "Diagnóstico enviado",
    propuesta_pendiente: "Propuesta pendiente",
    negociacion: "Negociación",
    ganado: "Ganado",
    perdido: "Perdido",
    no_contactar: "No contactar",
    convertido_cliente: "Convertido a cliente",
    fuera_de_perfil: "Fuera de perfil",
  };

  return labels[stage];
}