import { Router } from 'express';
import admissionRoutes from './admission';
import rhRoutes from './rh';

const router = Router();

// Routes d'admission (candidats, entreprises, génération PDF)
router.use('/admission', admissionRoutes);

// Routes RH (suivi fiches de renseignement et CERFA)
router.use('/rh', rhRoutes);

// Route de santé
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
