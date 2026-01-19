
export interface NormalizedHeader {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
}

export interface EducationItem {
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    achievements?: string[]; // Preserved bullet points
}

export interface ExperienceItem {
    company: string;
    role: string;
    location?: string;
    startDate?: string;
    endDate?: string; // "Present" if current
    description: string[]; // List of bullet points
}

export interface ProjectItem {
    name: string;
    technologies?: string[];
    description: string[]; // List of bullet points
    link?: string;
}

export interface SkillsSection {
    languages: string[];
    frontend: string[];
    backend: string[];
    tools: string[];
    frameworks?: string[]; // Optional extra category
    other?: string[];
}

export interface NormalizedSections {
    summary: string;
    education: EducationItem[];
    experience: ExperienceItem[];
    projects: ProjectItem[];
    skills: SkillsSection;
    coursework?: string[];
    profiles?: Array<{ network: string; url: string; }>; // e.g. GitHub, LeetCode
}

export interface NormalizedResume {
    header: NormalizedHeader;
    sections: NormalizedSections;
}

export type TargetProfile = "Fresher" | "Product Manager" | "Software Engineer" | "Job Change";
