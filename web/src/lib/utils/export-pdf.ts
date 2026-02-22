import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

export interface PDFExportOptions {
    filename: string;
    title: string;
    subtitle?: string;
    elementId?: string;
    data?: any;
}

/**
 * Export current page/element to PDF
 */
export async function exportToPDF({
    filename,
    title,
    subtitle,
    elementId
}: PDFExportOptions): Promise<void> {
    try {
        // Create PDF instance
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Add header
        pdf.setFontSize(20);
        pdf.text(title, 15, 20);

        if (subtitle) {
            pdf.setFontSize(12);
            pdf.setTextColor(100);
            pdf.text(subtitle, 15, 28);
        }

        // Add generation date
        pdf.setFontSize(10);
        pdf.setTextColor(150);
        pdf.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, 35);

        // Reset text color
        pdf.setTextColor(0);

        let yPosition = 45;

        // If elementId is provided, capture the element as canvas
        if (elementId) {
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`Element with id ${elementId} not found`);
            }

            // Capture element as canvas
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 30; // 15mm margin on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Check if image fits on page
            if (imgHeight > pageHeight - yPosition - 15) {
                pdf.addPage();
                yPosition = 15;
            }

            pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
        }

        // Add footer
        const footerY = pageHeight - 10;
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text('AiHospitality PMS - Analytics Report', pageWidth / 2, footerY, { align: 'center' });

        // Save PDF
        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error('PDF export error:', error);
        throw new Error('Failed to export PDF');
    }
}

/**
 * Export table data to PDF
 */
export async function exportTableToPDF({
    filename,
    title,
    subtitle,
    data
}: PDFExportOptions & { data: any[][] }): Promise<void> {
    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();

        // Add header
        pdf.setFontSize(20);
        pdf.text(title, 15, 20);

        if (subtitle) {
            pdf.setFontSize(12);
            pdf.setTextColor(100);
            pdf.text(subtitle, 15, 28);
        }

        // Add date
        pdf.setFontSize(10);
        pdf.setTextColor(150);
        pdf.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, 35);

        pdf.setTextColor(0);

        // Add table (simplified - for complex tables, use jspdf-autotable)
        let yPosition = 50;
        pdf.setFontSize(10);

        if (data && data.length > 0) {
            data.forEach((row: any[], index: number) => {
                const rowText = row.join(' | ');
                pdf.text(rowText, 15, yPosition);
                yPosition += 7;

                // Add new page if needed
                if (yPosition > 270) {
                    pdf.addPage();
                    yPosition = 20;
                }
            });
        }

        // Save
        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error('PDF export error:', error);
        throw new Error('Failed to export PDF');
    }
}
