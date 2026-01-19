// PDF Export for Interview Questions
import { jsPDF } from 'jspdf';

export interface ExportQuestion {
    number: number;
    question: string;
    type: string;
    difficulty: string;
    intent: string;
    expectedAnswer?: string;
    followUps?: string[];
}

export function exportQuestionsToPDF(
    questions: ExportQuestion[],
    targetRole: string,
    userName?: string
): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let y = margin;

    // Helper to add watermark
    const addWatermark = () => {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('resumescore.app', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.setTextColor(0, 0, 0);
    };

    // Helper to check page break
    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 25) {
            addWatermark();
            doc.addPage();
            y = margin;
        }
    };

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Interview Preparation Questions', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Role: ${targetRole}`, pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Questions
    questions.forEach((q, index) => {
        // Estimate space needed
        const estimatedHeight = 40 + (q.expectedAnswer ? 25 : 0) + (q.followUps?.length || 0) * 7;
        checkPageBreak(estimatedHeight);

        // Question number and text
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const questionText = `Q${q.number}. ${q.question}`;
        const questionLines = doc.splitTextToSize(questionText, pageWidth - 2 * margin);
        doc.text(questionLines, margin, y);
        y += questionLines.length * lineHeight;

        // Type and Difficulty badges
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`[${q.type.toUpperCase()}] [${q.difficulty}]`, margin, y);
        y += lineHeight;

        // Intent
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'italic');
        const intentLines = doc.splitTextToSize(`Intent: ${q.intent}`, pageWidth - 2 * margin);
        doc.text(intentLines, margin, y);
        y += intentLines.length * lineHeight + 2;

        // Expected Answer (if available)
        if (q.expectedAnswer) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 100, 0);
            doc.text('Expected Answer:', margin, y);
            y += lineHeight;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            const answerLines = doc.splitTextToSize(q.expectedAnswer, pageWidth - 2 * margin - 5);
            doc.text(answerLines, margin + 5, y);
            y += answerLines.length * lineHeight + 2;
        }

        // Follow-ups (if available)
        if (q.followUps && q.followUps.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 0, 100);
            doc.text('Follow-up Questions:', margin, y);
            y += lineHeight;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            q.followUps.forEach((fu, i) => {
                checkPageBreak(lineHeight);
                const fuLines = doc.splitTextToSize(`• ${fu}`, pageWidth - 2 * margin - 10);
                doc.text(fuLines, margin + 5, y);
                y += fuLines.length * lineHeight;
            });
        }

        y += 8; // Space between questions
    });

    // Add watermark to last page
    addWatermark();

    // Download
    const filename = `interview_questions_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}
