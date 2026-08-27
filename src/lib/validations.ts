import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'ADMIN', 'SUPERVISOR']).default('STUDENT'),
  dietaryPref: z.enum(['VEG', 'NON_VEG', 'JAIN']).default('VEG'),
  rollNumber: z.string().optional(),
  roomNumber: z.string().optional(),
  hostelCode: z.string().min(2, 'Valid hostel code is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const attendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER']),
  status: z.enum(['EATING', 'SKIPPED']),
});

export const feedbackSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER']),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  tags: z.array(
    z.enum(['TASTE', 'QUALITY', 'HYGIENE', 'PORTION', 'COLD_FOOD', 'LATE_SERVICE', 'OTHER'])
  ).default([]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;