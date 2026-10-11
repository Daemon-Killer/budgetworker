import type { Worker } from "@prisma/client";
import type { DirectoryWorker } from '../../shared/directory';
import { publicResumeFileName } from "./resume-file";

/**
 * Public directory profile — free for all clients.
 * Never includes phone or resume bytes. Unlock = resume access only.
 */
export type PublicWorker = {
  id: string;
  name: string;
  category: string;
  employmentType: string;
  city: string;
  area: string | null;
  age: number | null;
  skill: string | null;
  about: string | null;
  salaryExpectation: string | null;
  vegNonVeg: string | null;
  religion: string | null;
  experienceYears: number | null;
  livingLocation: string | null;
  workingLocation: string | null;
  whenCanJoin: string | null;
  photoUrl: string | null;
  policeVerified: boolean;
  aadhaarVerified: boolean;
  status: string;
  /** Free directory: whether a resume file exists to unlock */
  hasResume: boolean;
  resumeFileName: string | null;
  /** Client spent a credit (or already had) — may download resume */
  unlocked: boolean;
};

export function toPublicWorker(w: Pick<Worker, keyof Omit<DirectoryWorker,'hasResume'|'unlocked'|'distanceKm'>> & {resumeSize?:number|null;resumeData?:Uint8Array|null;resumeContactReviewed?:boolean}, unlocked: boolean): DirectoryWorker {
  const hasResume = Boolean(w.resumeContactReviewed && (w.resumeSize || w.resumeData?.length) && w.resumeFileName);
  return {
    id: w.id,
    name: w.name,
    category: w.category,
    employmentType: w.employmentType,
    city: w.city,
    area: w.area,
    age: w.age,
    skill: w.skill,
    about: w.about,
    salaryExpectation: w.salaryExpectation,
    expectedPayInr: w.expectedPayInr,
    payPeriod: w.payPeriod,
    hoursPerDay: w.hoursPerDay,
    vegNonVeg: w.vegNonVeg,
    religion: w.religion,
    experienceYears: w.experienceYears,
    livingLocation: w.livingLocation,
    workingLocation: w.workingLocation,
    whenCanJoin: w.whenCanJoin,
    photoUrl: w.photoUrl,
    policeVerified: w.policeVerified,
    aadhaarVerified: w.aadhaarVerified,
    status: w.status,
    hasResume,
    resumeFileName: hasResume && unlocked ? publicResumeFileName(null, w.resumeFileName) : null,
    unlocked,
  };
}
