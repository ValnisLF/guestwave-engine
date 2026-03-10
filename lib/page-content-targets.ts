import { z } from 'zod';

export const photoAssignmentTargets = [
  { value: 'homePage:hero', label: 'Home - Hero' },
  { value: 'homePage:amenities', label: 'Home - Amenities' },
  { value: 'laPropiedad:groundFloor', label: 'La Propiedad - Planta baja' },
  { value: 'laPropiedad:firstFloor', label: 'La Propiedad - Primera planta' },
  { value: 'laPropiedad:exterior', label: 'La Propiedad - Exterior' },
  { value: 'turismo:queHacer', label: 'Turismo - Que hacer' },
  { value: 'turismo:queVisitar', label: 'Turismo - Que visitar' },
  { value: 'turismo:queComer', label: 'Turismo - Que comer' },
  { value: 'reservas:instructions', label: 'Reservas - Instrucciones' },
  { value: 'tarifas:temporadaAlta', label: 'Tarifas - Temporada alta' },
  { value: 'tarifas:temporadaMedia', label: 'Tarifas - Temporada media' },
  { value: 'tarifas:temporadaBaja', label: 'Tarifas - Temporada baja' },
  { value: 'tarifas:politicas', label: 'Tarifas - Politicas' },
  { value: 'contacto:general', label: 'Contacto - General' },
] as const;

export const photoAssignmentTargetValues = photoAssignmentTargets.map((target) => target.value);

export const photoAssignmentTargetSchema = z.enum(photoAssignmentTargetValues as [
  (typeof photoAssignmentTargetValues)[number],
  ...(typeof photoAssignmentTargetValues)[number][]
]);

export type PhotoAssignmentTarget = z.infer<typeof photoAssignmentTargetSchema>;
