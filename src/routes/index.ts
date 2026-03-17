import { Router } from 'express';
import admissionRoutes from './admission';
import rhRoutes from './rh';
import candidateRoutes from './candidate.routes';
import studentRoutes from './student.routes';
import attendanceRoutes from './attendance.routes';
import gradeRoutes from './grade.routes';
import eventRoutes from './event.routes';
import appointmentRoutes from './appointment.routes';
import documentRoutes from './document.routes';
import questionnaireRoutes from './questionnaire.routes';
import gridfsDocumentRoutes from './gridfsDocuments';
import authRoutes from './auth.routes';
import { authenticateRequest } from '../middlewares/auth.middleware';
import { isMongoConnected } from '../config/database';

const router = Router();

const requireMongoConnection = (_req: any, res: any, next: any): void => {
  if (!isMongoConnected()) {
    res.status(503).json({
      success: false,
      error: 'Base MongoDB indisponible, reessayez dans quelques secondes.'
    });
    return;
  }
  next();
};

router.use('/auth', authRoutes);

// Routes d'admission (candidats, entreprises, generation PDF)
router.use('/admission', admissionRoutes);

// Routes RH (suivi fiches de renseignement et CERFA)
router.use('/rh', rhRoutes);

// Routes documents GridFS (téléchargement / listing)
router.use('/gridfs', gridfsDocumentRoutes);

// Route de sante
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes protegees (session requise)
router.use('/candidates', requireMongoConnection, authenticateRequest, candidateRoutes);
router.use('/students', requireMongoConnection, authenticateRequest, studentRoutes);
router.use('/attendances', requireMongoConnection, authenticateRequest, attendanceRoutes);
router.use('/grades', requireMongoConnection, authenticateRequest, gradeRoutes);
router.use('/events', requireMongoConnection, authenticateRequest, eventRoutes);
router.use('/appointments', requireMongoConnection, authenticateRequest, appointmentRoutes);
router.use('/documents', requireMongoConnection, authenticateRequest, documentRoutes);
router.use('/questionnaires', requireMongoConnection, authenticateRequest, questionnaireRoutes);

export default router;
