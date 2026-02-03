import { Router } from 'express';
import admissionRoutes from './admission';

const router = Router();

// Routes d'admission (candidats, entreprises, génération PDF)
router.use('/admission', admissionRoutes);

// Route de santé
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
