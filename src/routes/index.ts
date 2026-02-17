import { Router } from 'express';
import admissionRoutes from './admission';
import candidateRoutes from './candidate.routes'; 
import studentRoutes from './student.routes';
import attendanceRoutes from './attendance.routes';
import gradeRoutes from './grade.routes';
import eventRoutes from './event.routes';
import appointmentRoutes from './appointment.routes';
import documentRoutes from './document.routes';
import questionnaireRoutes from './questionnaire.routes';
import authRoutes from './auth.routes';
import { authenticateRequest } from '../middlewares/auth.middleware';


const router = Router();

router.use('/auth', authRoutes);

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

// Routes protégées (session requise)
router.use('/candidates', authenticateRequest, candidateRoutes);
router.use('/students', authenticateRequest, studentRoutes);
router.use('/attendances', authenticateRequest, attendanceRoutes);
router.use('/grades', authenticateRequest, gradeRoutes);
router.use('/events', authenticateRequest, eventRoutes);
router.use('/appointments', authenticateRequest, appointmentRoutes);
router.use('/documents', authenticateRequest, documentRoutes);
router.use('/questionnaires', authenticateRequest, questionnaireRoutes);

export default router;
