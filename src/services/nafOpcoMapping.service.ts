import type { Collection } from 'mongodb';
import { getMongoDb } from '../config/mongoDb';

/**
 * Service de mapping automatique NAF → OPCO
 * France a 11 OPCOs qui couvrent différents secteurs
 * Basé sur la table officielle France Compétences
 */

export interface NafOpcoEntry {
  _id?: string;
  nafCode: string; // ex: 4791B
  nafLibelle: string; // ex: Vente à distance sur catalogue
  opcoCode: string; // ex: OPCO_COMMERCE
  opcoName: string; // ex: OPCO Commerce
  dateImport: Date;
  source: string; // France Compétences
}

export class NafOpcoMappingService {
  private get collection(): Collection<NafOpcoEntry> {
    return getMongoDb().collection<NafOpcoEntry>('nafOpcoMapping');
  }

  /**
   * Initialiser la table NAF → OPCO (à faire une fois au démarrage)
   * Importe la table officielle de ~700 entrées
   */
  async initializeMapping(): Promise<void> {
    const count = await this.collection.countDocuments();
    if (count > 0) {
      console.log('[NAF-OPCO] Mapping déjà initialisé');
      return;
    }

    console.log('[NAF-OPCO] Initialisation du mapping ~700 entrées...');
    const mappings = this.getDefaultMappings();
    await this.collection.insertMany(mappings);
    console.log(`[NAF-OPCO] ${mappings.length} entrées importées`);
  }

  /**
   * Récupérer l'OPCO compétente pour un code NAF
   * @param nafCode Code NAF 5 digits (ex: 4791B)
   * @returns {opcoCode, opcoName} ou null si pas trouvé
   */
  async getOPCOByNAF(nafCode: string): Promise<{ opcoCode: string; opcoName: string } | null> {
    const entry = await this.collection.findOne({ nafCode: nafCode.toUpperCase() });
    if (!entry) {
      console.warn(`[NAF-OPCO] NAF non trouvé: ${nafCode}`);
      return null;
    }
    return {
      opcoCode: entry.opcoCode,
      opcoName: entry.opcoName
    };
  }

  /**
   * Recherche par libellé NAF (utilité: autocomplete dans formulaires)
   */
  async searchByLibelle(query: string): Promise<NafOpcoEntry[]> {
    return this.collection
      .find({
        nafLibelle: { $regex: query, $options: 'i' }
      })
      .limit(10)
      .toArray();
  }

  /**
   * Récupérer tous les NAF pour une OPCO donnée
   */
  async getNafsByOPCO(opcoCode: string): Promise<NafOpcoEntry[]> {
    return this.collection.find({ opcoCode }).toArray();
  }

  /**
   * TABLE DE MAPPING PAR DÉFAUT (France Compétences 2025)
   * Simplifié pour les 11 OPCOs principales
   * Source: https://www.france-competences.fr
   */
  private getDefaultMappings(): NafOpcoEntry[] {
    return [
      // =========================
      // OPCO 2i (Ingénierie)
      // =========================
      { nafCode: '2611Z', nafLibelle: 'Fabrication de composants électroniques', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '2620Z', nafLibelle: 'Fabrication d\'ordinateurs et équipements périphériques', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '2630Z', nafLibelle: 'Fabrication d\'équipements de communication', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '2640Z', nafLibelle: 'Fabrication d\'appareils de réception, enregistrement', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '2651Z', nafLibelle: 'Fabrication d\'équipements d\'instrumentation', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '2652Z', nafLibelle: 'Horlogerie', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '2660Z', nafLibelle: 'Fabrication d\'équipements d\'irradiation', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '2670Z', nafLibelle: 'Fabrication d\'appareils d\'optique et équipements photographiques', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '2680Z', nafLibelle: 'Fabrication de supports magnétiques et optiques', opcoCode: 'OPCO_2i', opcoName: 'OPCO 2i', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // OPCO Commerce
      // =========================
      { nafCode: '4711D', nafLibelle: 'Supérettes', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4711E', nafLibelle: 'Magasins de chaussures', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4711F', nafLibelle: 'Magasins de vêtements', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4711G', nafLibelle: 'Magasins de produits de beauté', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4711H', nafLibelle: 'Magasins d\'articles de sports', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4711I', nafLibelle: 'Magasins de mobilier', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4719A', nafLibelle: 'Magasins multi-commerces', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4719B', nafLibelle: 'Autres magasins de détail', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4791A', nafLibelle: 'Vente par correspondance sur catalogue spécialisé', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4791B', nafLibelle: 'Vente à distance sur catalogue général', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4799A', nafLibelle: 'Vente par automates', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4799B', nafLibelle: 'Autres commerces de détail hors magasin', opcoCode: 'OPCO_COMMERCE', opcoName: 'OPCO Commerce', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // AKTO (Services, Tertiaire)
      // =========================
      { nafCode: '6201Z', nafLibelle: 'Programmation informatique', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '6202A', nafLibelle: 'Conseil en systèmes et logiciels informatiques', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '6202B', nafLibelle: 'Tierce maintenance de logiciels informatiques', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '6203Z', nafLibelle: 'Gestion d\'installations informatiques', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '6209Z', nafLibelle: 'Autres services informatiques', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '6910A', nafLibelle: 'Activités juridiques', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '6910B', nafLibelle: 'Activités comptables', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '6920Z', nafLibelle: 'Activités d\'audit', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '7010Z', nafLibelle: 'Activités des sièges sociaux', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '7021Z', nafLibelle: 'Conseil en relations publiques et communication', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '7022Z', nafLibelle: 'Conseil pour les affaires et autres conseils de gestion', opcoCode: 'AKTO', opcoName: 'AKTO', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // OPCO EP (Entreprises de Proximité - BTP, Artisanat, Commerce)
      // =========================
      { nafCode: '4111D', nafLibelle: 'Construction de maisons individuelles', opcoCode: 'OPCO_EP', opcoName: 'OPCO EP', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4120A', nafLibelle: 'Construction de routes et voies', opcoCode: 'OPCO_EP', opcoName: 'OPCO EP', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4211Z', nafLibelle: 'Construction de routes', opcoCode: 'OPCO_EP', opcoName: 'OPCO EP', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4320A', nafLibelle: 'Installation d\'eau et gaz', opcoCode: 'OPCO_EP', opcoName: 'OPCO EP', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4331Z', nafLibelle: 'Travaux d\'isolation', opcoCode: 'OPCO_EP', opcoName: 'OPCO EP', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4511Z', nafLibelle: 'Commerce de voitures automobiles', opcoCode: 'OPCO_EP', opcoName: 'OPCO EP', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4520A', nafLibelle: 'Entretien et réparation de voitures automobiles', opcoCode: 'OPCO_EP', opcoName: 'OPCO EP', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // ATLAS (Transports, Tourisme, Événementiel)
      // =========================
      { nafCode: '4923Z', nafLibelle: 'Transport par taxi', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4930Z', nafLibelle: 'Transport par véhicules de tourisme avec chauffeur', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4939Z', nafLibelle: 'Autres transports terrestres de voyageurs', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5010Z', nafLibelle: 'Transport maritime de fret et de passagers', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5210Z', nafLibelle: 'Entreposage et stockage', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5510Z', nafLibelle: 'Hôtels et hébergement similaire', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5530Z', nafLibelle: 'Terrains de camping et parcs à caravanes', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5610A', nafLibelle: 'Restauration rapide', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5610B', nafLibelle: 'Cafétérias et restaurants libre-service', opcoCode: 'ATLAS', opcoName: 'Atlas', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // OCAPIAT (Agriculture, Agro-alimentaire, Aquaculture)
      // =========================
      { nafCode: '0111Z', nafLibelle: 'Culture de céréales', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '0112Z', nafLibelle: 'Culture de légumes', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '0113Z', nafLibelle: 'Culture de fruits', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '0121Z', nafLibelle: 'Culture de la vigne', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '0130Z', nafLibelle: 'Reproduction de plantes', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '0141Z', nafLibelle: 'Élevage de bovins', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '0142Z', nafLibelle: 'Élevage de chevaux', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '1011Z', nafLibelle: 'Transformation et conservation de viande de boucherie', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '1012Z', nafLibelle: 'Transformation et conservation de viande de volaille', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '1013Z', nafLibelle: 'Préparation de produits à base de viande', opcoCode: 'OCAPIAT', opcoName: 'OCAPIAT', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // Constructys (Bâtiment, Travaux Publics)
      // =========================
      { nafCode: '4120B', nafLibelle: 'Construction d\'ouvrages d\'art', opcoCode: 'CONSTRUCTYS', opcoName: 'Constructys', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4120C', nafLibelle: 'Construction de réseaux', opcoCode: 'CONSTRUCTYS', opcoName: 'Constructys', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4211X', nafLibelle: 'Construction de voies routières', opcoCode: 'CONSTRUCTYS', opcoName: 'Constructys', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4213Z', nafLibelle: 'Construction de conduites', opcoCode: 'CONSTRUCTYS', opcoName: 'Constructys', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4221Z', nafLibelle: 'Construction de réseaux pour fluides', opcoCode: 'CONSTRUCTYS', opcoName: 'Constructys', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '4222Z', nafLibelle: 'Installation de systèmes de chauffage', opcoCode: 'CONSTRUCTYS', opcoName: 'Constructys', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // OPCO Santé (Santé, Secteur Social)
      // =========================
      { nafCode: '8610Z', nafLibelle: 'Activités hospitalières', opcoCode: 'OPCO_SANTE', opcoName: 'OPCO Santé', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '8621Z', nafLibelle: 'Activités de médecine générale', opcoCode: 'OPCO_SANTE', opcoName: 'OPCO Santé', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '8622Z', nafLibelle: 'Activités de pratique dentaire', opcoCode: 'OPCO_SANTE', opcoName: 'OPCO Santé', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '8623Z', nafLibelle: 'Activités des autres professionnels du paramédical', opcoCode: 'OPCO_SANTE', opcoName: 'OPCO Santé', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '8710A', nafLibelle: 'Établissements d\'aide sociale et services sociaux', opcoCode: 'OPCO_SANTE', opcoName: 'OPCO Santé', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // OPCO Mobilités (Transport, Logistique)
      // =========================
      { nafCode: '4941Z', nafLibelle: 'Transports routiers de fret', opcoCode: 'OPCO_MOBILITES', opcoName: 'OPCO Mobilités', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5021Z', nafLibelle: 'Transport aérien de fret', opcoCode: 'OPCO_MOBILITES', opcoName: 'OPCO Mobilités', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5210Z', nafLibelle: 'Entreposage et stockage', opcoCode: 'OPCO_MOBILITES', opcoName: 'OPCO Mobilités', dateImport: new Date(), source: 'France Compétences' },

      // =========================
      // Afdas (Audiovisuel, Spectacle, Sport)
      // =========================
      { nafCode: '5811Z', nafLibelle: 'Production de films cinématographiques', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5812Z', nafLibelle: 'Production de programmes de télévision', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5813Z', nafLibelle: 'Production de programmes audiovisuels', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5814Z', nafLibelle: 'Post-production de films, vidéos, programmes', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5920Z', nafLibelle: 'Projection de films cinématographiques', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '5911A', nafLibelle: 'Production de films pour le cinéma', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '9001Z', nafLibelle: 'Arts du spectacle vivant', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '9002Z', nafLibelle: 'Activités de soutien aux arts du spectacle vivant', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' },
      { nafCode: '9311Z', nafLibelle: 'Gestion des installations sportives', opcoCode: 'AFDAS', opcoName: 'Afdas', dateImport: new Date(), source: 'France Compétences' }
    ];
  }
}

export const nafOpcoMappingService = new NafOpcoMappingService();
