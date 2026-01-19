
import { NextRequest, NextResponse } from "next/server";
import { NormalizedResume } from "@/lib/types/resume-generator";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink, BorderStyle } from "docx";
import jsPDF from "jspdf";

// --- HELPER: DOCX GENERATOR ---
const generateDOCX = async (resume: NormalizedResume, isWatermarked: boolean): Promise<Buffer> => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: resume.header.name,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 }
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun(`${resume.header.email} | ${resume.header.phone}`),
                        new TextRun(resume.header.location ? ` | ${resume.header.location}` : ""),
                        resume.header.linkedin ? new TextRun(` | ${resume.header.linkedin}`) : new TextRun(""),
                    ],
                    spacing: { after: 400 }
                }),

                // SUMMARY
                ...(resume.sections.summary ? [
                    new Paragraph({
                        text: "PROFESSIONAL SUMMARY",
                        heading: HeadingLevel.HEADING_2,
                        border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                        spacing: { before: 200, after: 120 }
                    }),
                    new Paragraph({ text: resume.sections.summary, spacing: { after: 200 } })
                ] : []),

                // EXPERIENCE
                new Paragraph({
                    text: "EXPERIENCE",
                    heading: HeadingLevel.HEADING_2,
                    border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                    spacing: { before: 200, after: 120 }
                }),
                ...resume.sections.experience.flatMap(exp => [
                    new Paragraph({
                        children: [
                            new TextRun({ text: exp.company, bold: true, size: 24 }), // 12pt
                            new TextRun({ text: ` | ${exp.role}`, bold: false, size: 24 }),
                            new TextRun({ text: `  (${exp.startDate || ""} - ${exp.endDate || "Present"})`, size: 20, italics: true })
                        ],
                        spacing: { before: 120 }
                    }),
                    ...exp.description.map(bullet => new Paragraph({
                        text: bullet,
                        bullet: { level: 0 }
                    }))
                ]),

                // PROJECTS
                new Paragraph({
                    text: "PROJECTS",
                    heading: HeadingLevel.HEADING_2,
                    border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                    spacing: { before: 200, after: 120 }
                }),
                ...resume.sections.projects.flatMap(proj => [
                    new Paragraph({
                        children: [
                            new TextRun({ text: proj.name, bold: true }),
                            ...(proj.technologies ? [new TextRun({ text: ` | ${proj.technologies.join(", ")}`, italics: true })] : [])
                        ],
                        spacing: { before: 120 }
                    }),
                    // Handle description as string or array
                    ...((Array.isArray(proj.description) ? proj.description : (typeof proj.description === 'string' ? [proj.description] : [])).map(bullet => new Paragraph({
                        text: bullet,
                        bullet: { level: 0 }
                    })))
                ]),

                // SKILLS
                new Paragraph({
                    text: "SKILLS",
                    heading: HeadingLevel.HEADING_2,
                    border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                    spacing: { before: 200, after: 120 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Languages: ", bold: true }),
                        new TextRun(resume.sections.skills.languages.join(", ")),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Technologies: ", bold: true }),
                        new TextRun([...resume.sections.skills.frontend, ...resume.sections.skills.backend, ...resume.sections.skills.tools].join(", ")),
                    ]
                }),

                // EDUCATION
                new Paragraph({
                    text: "EDUCATION",
                    heading: HeadingLevel.HEADING_2,
                    border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                    spacing: { before: 200, after: 120 }
                }),
                ...resume.sections.education.map(edu => new Paragraph({
                    children: [
                        new TextRun({ text: edu.institution, bold: true }),
                        new TextRun(` | ${edu.degree}`),
                        new TextRun({ text: `  (${edu.endDate || ""})`, italics: true })
                    ]
                })),

                // WATERMARK
                ...(isWatermarked ? [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Generated by ResumeScore.app (Free Version)",
                                color: "808080",
                                size: 16
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400 }
                    })
                ] : [])
            ]
        }]
    });

    return await Packer.toBuffer(doc);
};

// --- HELPER: PDF GENERATOR (jsPDF in Node) ---
const generatePDF = async (resume: NormalizedResume, isWatermarked: boolean): Promise<Buffer> => {
    // eslint-disable-next-line new-cap
    const doc = new jsPDF();
    let y = 20;

    // Helper for page breaks
    const checkPageBreak = (spaceNeeded: number) => {
        if (y + spaceNeeded > 280) {
            doc.addPage();
            y = 20;
        }
    };

    // Header - ATS-friendly sizing: Title 14-16pt
    doc.setFontSize(16); // Title size for name
    doc.setFont("helvetica", "bold");
    doc.text(resume.header.name, 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(11); // Body text 10-12pt
    doc.setFont("helvetica", "normal");
    const contact = [resume.header.email, resume.header.phone, resume.header.location].filter(Boolean).join(" | ");
    doc.text(contact, 105, y, { align: "center" });
    y += 15;

    // Section Headers - ATS-friendly: 14pt bold uppercase with underline
    const addSectionTitle = (title: string) => {
        checkPageBreak(15);
        doc.setFontSize(14); // Section header size
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), 20, y);
        doc.setLineWidth(0.5);
        doc.line(20, y + 2, 190, y + 2);
        y += 10;
        doc.setFontSize(11); // Body text size
        doc.setFont("helvetica", "normal");
    };

    // SUMMARY
    if (resume.sections.summary) {
        addSectionTitle("Professional Summary");
        const lines = doc.splitTextToSize(resume.sections.summary, 170);
        checkPageBreak(lines.length * 5);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 5;
    }

    // EXPERIENCE
    addSectionTitle("Experience");
    resume.sections.experience.forEach(exp => {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        const companyText = exp.company;
        const companyWidth = doc.getTextWidth(companyText); // Calculate width while still bold
        doc.text(companyText, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(`, ${exp.role}`, 20 + companyWidth, y); // Use comma separator
        const date = `${exp.startDate || ""} - ${exp.endDate || "Present"}`;
        doc.text(date, 190, y, { align: "right" });
        y += 6;


        // Handle description as string or array
        const expDescriptions = Array.isArray(exp.description) ? exp.description : (typeof exp.description === 'string' ? [exp.description] : []);
        expDescriptions.forEach(bullet => {
            const bulletText = `• ${bullet}`;
            const bulletLines = doc.splitTextToSize(bulletText, 165);
            checkPageBreak(bulletLines.length * 5);
            doc.text(bulletLines, 25, y);
            y += bulletLines.length * 5 + 2;
        });
        y += 3;
    });

    // PROJECTS
    addSectionTitle("Projects");
    resume.sections.projects.forEach(proj => {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        const projectName = proj.name;
        const nameWidth = doc.getTextWidth(projectName); // Calculate width while still bold
        doc.text(projectName, 20, y);
        if (proj.technologies) {
            doc.setFont("helvetica", "italic");
            const techs = `, ${proj.technologies.join(", ")}`;
            doc.text(techs, 20 + nameWidth, y);
        }
        y += 6;
        doc.setFont("helvetica", "normal");

        // Handle description as string or array
        const projDescriptions = Array.isArray(proj.description) ? proj.description : (typeof proj.description === 'string' ? [proj.description] : []);
        projDescriptions.forEach(bullet => {
            const bulletText = `• ${bullet}`;
            const bulletLines = doc.splitTextToSize(bulletText, 165);
            checkPageBreak(bulletLines.length * 5);
            doc.text(bulletLines, 25, y);
            y += bulletLines.length * 5 + 2;
        });
        y += 3;
    });

    // SKILLS
    addSectionTitle("Skills");
    const skillLines = [
        `Languages: ${resume.sections.skills.languages.join(", ")}`,
        `Technologies: ${[...resume.sections.skills.frontend, ...resume.sections.skills.backend, ...resume.sections.skills.tools].join(", ")}`
    ];
    checkPageBreak(skillLines.length * 5);
    doc.text(skillLines, 20, y);
    y += skillLines.length * 5 + 5;

    // EDUCATION
    addSectionTitle("Education");
    resume.sections.education.forEach(edu => {
        checkPageBreak(10);
        doc.setFont("helvetica", "bold");
        const institution = edu.institution;
        const instWidth = doc.getTextWidth(institution); // Calculate width while still bold
        doc.text(institution, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(`, ${edu.degree}`, 20 + instWidth, y);
        doc.text(edu.endDate || "", 190, y, { align: "right" });
        y += 8;
    });

    // WATERMARK
    if (isWatermarked) {
        y = 285;
        doc.setTextColor(150);
        doc.setFontSize(9);
        doc.text("Generated by ResumeScore.app (Free Version)", 105, y, { align: "center" });
    }

    return Buffer.from(doc.output("arraybuffer"));
};


export async function POST(req: NextRequest) {
    try {
        const { userId, userPlan, format, resume } = await req.json();

        // 1. CHECK LIMITS (Mock Logic - Replace with Firestore check)
        // In a real app, you would read `users/{userId}` to get `usage.exports`.
        const exportsUsed = 0; // mocked
        const limits = { free: 1, pro: 5, premium: 10 };
        const limit = limits[userPlan as keyof typeof limits] || 1;

        if (exportsUsed >= limit) {
            return NextResponse.json({ success: false, error: "Export limit reached. Upgrade to continue." }, { status: 403 });
        }

        // 2. WATERMARK LOGIC
        const isWatermarked = userPlan === "free";

        // 3. GENERATE DOCUMENT
        let fileBuffer: Buffer;
        let contentType: string;
        let extension: string;

        if (format === "docx") {
            if (userPlan === "free") throw new Error("DOCX is Pro feature");
            fileBuffer = await generateDOCX(resume, false);
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            extension = "docx";
        } else {
            fileBuffer = await generatePDF(resume, isWatermarked);
            contentType = "application/pdf";
            extension = "pdf";
        }

        // 4. UPDATE USAGE (Mock - Would update Firestore)
        // console.log(`User ${userId} exported ${format}`);

        // 5. RETURN FILE
        return NextResponse.json({
            success: true,
            file: fileBuffer.toString("base64"),
            filename: `Resume_${resume.header.name.replace(/\s+/g, "_")}_ATE.${extension}`,
            contentType,
            watermarked: isWatermarked
        });

    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json(
            { success: false, error: (error as Error).message || "Export failed" },
            { status: 500 }
        );
    }
}
