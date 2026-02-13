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


const router = Router();

// Routes étudiants
// Expose '/api/candidates' when this router is mounted under '/api'
router.use('/candidates', candidateRoutes);
router.use('/students', studentRoutes);
router.use('/attendances', attendanceRoutes);
router.use('/grades', gradeRoutes);
router.use('/events', eventRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/documents', documentRoutes);
router.use('/questionnaires', questionnaireRoutes);
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

export default router;
