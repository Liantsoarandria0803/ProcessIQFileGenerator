export type SignatureActorRole =
  | 'student'
  | 'cfa'
  | 'maitre_apprentissage'
  | 'charge_admission'
  | 'charge_rh'
  | 'commercial';

export type SignatureActionType = 'sign' | 'fill';

export interface SignatureActorRule {
  role: SignatureActorRole;
  action: SignatureActionType;
  required: boolean;
  pageNumbers: number[];
}

export interface SignatureDocumentWorkflow {
  key: string;
  displayName: string;
  aliases: string[];
  actors: SignatureActorRule[];
  disabled?: boolean;
  notes?: string;
}

const normalize = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const SIGNATURE_DOCUMENT_WORKFLOWS: SignatureDocumentWorkflow[] = [
  {
    key: 'fiche_atre',
    displayName: 'FICHE ATRE',
    aliases: ['fiche atre', 'atre'],
    actors: [{ role: 'student', action: 'sign', required: true, pageNumbers: [3] }]
  },
  {
    key: 'modification_document',
    displayName: 'Modification du document',
    aliases: ['modification du document', 'document modifie'],
    actors: [{ role: 'charge_admission', action: 'sign', required: true, pageNumbers: [1] }],
    notes: "Document de suivi admission - signature du charge d'admission."
  },
  {
    key: 'fiche_renseignements_entreprise',
    displayName: 'Fiche de renseignements entreprise',
    aliases: ['fiche de renseignements entreprise', 'fiche renseignements entreprise'],
    actors: [{ role: 'commercial', action: 'fill', required: true, pageNumbers: [] }],
    notes: 'Le tableau indique un remplissage de questionnaire par le commercial.'
  },
  {
    key: 'reglement_interieur',
    displayName: 'Reglement Interieur',
    aliases: ['reglement interieur', 'reglement'],
    actors: [
      { role: 'student', action: 'sign', required: true, pageNumbers: [3] },
      { role: 'cfa', action: 'sign', required: true, pageNumbers: [3] }
    ]
  },
  {
    key: 'compte_rendu_visite_entretien',
    displayName: 'Compte rendu de visite entretien',
    aliases: ['compte rendu de visite entretien', 'compte rendu visite', 'compte rendu'],
    actors: [
      { role: 'cfa', action: 'fill', required: true, pageNumbers: [1] },
      { role: 'cfa', action: 'sign', required: true, pageNumbers: [4] }
    ],
    notes: 'Le tableau indique: page 1 a completer, signature page 4 par le CFA.'
  },
  {
    key: 'cerfa',
    displayName: 'CERFA',
    aliases: ['cerfa', 'contrat cerfa', "cerfa apprentissage"],
    actors: [{ role: 'charge_rh', action: 'sign', required: true, pageNumbers: [3] }],
    notes: 'Le tableau indique une signature par le charge RH (page 3).'
  },
  {
    key: 'grille_evaluation_plateforme',
    displayName: 'Grille d evaluation (Plateforme) en PDF',
    aliases: ['grille evaluation', 'grille d evaluation', 'plateforme', 'grille d evaluation plateforme'],
    actors: [{ role: 'charge_admission', action: 'sign', required: true, pageNumbers: [1] }],
    notes: "Document d'evaluation signe par le charge d'admission."
  },
  {
    key: 'prise_de_connaissance',
    displayName: 'Prise de connaissance',
    aliases: ['prise de connaissance', 'charte informatique', 'livret accueil'],
    actors: [{ role: 'student', action: 'sign', required: true, pageNumbers: [1] }],
    notes: "Document de prise de connaissance signe par l'etudiant."
  }
];

export const findSignatureWorkflow = (params: {
  workflowKey?: string;
  documentTitle?: string;
}): SignatureDocumentWorkflow | null => {
  const { workflowKey, documentTitle } = params;

  if (workflowKey) {
    const byKey = SIGNATURE_DOCUMENT_WORKFLOWS.find((item) => item.key === workflowKey);
    if (byKey) return byKey;
  }

  const normalizedTitle = normalize(documentTitle || '');
  if (!normalizedTitle) return null;

  return (
    SIGNATURE_DOCUMENT_WORKFLOWS.find((item) =>
      item.aliases.some((alias) => normalizedTitle.includes(normalize(alias)))
    ) || null
  );
};
