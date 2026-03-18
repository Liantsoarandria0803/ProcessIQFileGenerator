const fs = require('fs');

let content = fs.readFileSync('src/repositories/entrepriseRepository.ts', 'utf8');

const createMatch = content.match(/const airtableData: Partial<EntrepriseFields> = \{\};\n([\s\S]*?)logger\.info\(`📝 Données à envoyer/);
if (!createMatch) {
  console.log("Could not find create logic");
  process.exit(1);
}
let createLogic = createMatch[1];
// Extract from `// Section 1: ...` up to `// Section 11: ...` ending brace
createLogic = createLogic.trim();

// Now create the new method
const newMethod = `
  /**
   * Extrait et mappe les données dynamiquement pour qu'elles soient strictement identiques en création et mise à jour.
   */
  private mapFicheEntrepriseToAirtableData(fiche: FicheRenseignementEntreprise): Partial<EntrepriseFields> {
    const airtableData: Partial<EntrepriseFields> = {};
    
${createLogic}

    return airtableData;
  }
`;

// Insert the new method before createFicheEntreprise
content = content.replace('async createFicheEntreprise', newMethod + '\n  async createFicheEntreprise');

// Replace the mapping logic in update
const updateMatchRegex = /const airtableData: Partial<EntrepriseFields> = \{\};\n[\s\S]*?\/\/ Lien avec l'étudiant\n\s*if [^}]+}\n/m;
content = content.replace(updateMatchRegex, 'const airtableData = this.mapFicheEntrepriseToAirtableData(fiche);\n');

// Replace the mapping logic in createFicheEntreprise
const createReplaceRegex = /const airtableData: Partial<EntrepriseFields> = \{\};\n[\s\S]*?\/\/ Section 11: Record ID étudiant\n\s*if [^}]+}\n/m;
content = content.replace(createReplaceRegex, 'const airtableData = this.mapFicheEntrepriseToAirtableData(fiche);\n\n');

fs.writeFileSync('src/repositories/entrepriseRepository.ts', content);
console.log("Replaced mapping!");
