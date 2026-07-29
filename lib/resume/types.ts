export type ResumeProfile = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  template: string;
  experiences: Array<Record<string, string>>;
  educations: Array<Record<string, string>>;
};

export type GeneratedResume = {
  contact: { name: string; location: string; email: string; phone: string; linkedin: string };
  summary: string;
  skills: Array<Record<string, string>>;
  experiences: Array<Record<string, any>>;
  projects?: Array<Record<string, string>>;
  certificates?: Array<Record<string, string>>;
  educations: Array<Record<string, string>>;
};
