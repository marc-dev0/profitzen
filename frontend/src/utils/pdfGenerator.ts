import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AdjustmentPDFItem {
    productName: string;
    productCode: string;
    barcode?: string; // Add barcode support
    quantity: number;
    uom?: string; // Add UOM support
    isPositive: boolean;
}

export interface AdjustmentPDFData {
    code: string;
    date: Date;
    type: string;
    reason: string;
    userName?: string; // Add User Name
    items: AdjustmentPDFItem[];
}

export const generateAdjustmentPDF = (data: AdjustmentPDFData) => {
    const doc = new jsPDF();

    // Brand Header
    doc.setFillColor(22, 163, 74); // Green-600
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text('Profitzen', 14, 13);

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('REPORTE DE AJUSTE DE INVENTARIO', 105, 40, { align: 'center' });

    // Info Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 50, 182, 45, 3, 3, 'FD'); // Increased height

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('INFORMACIÓN DEL MOVIMIENTO', 20, 60);

    doc.setFont("helvetica", "normal");
    // Left Column
    doc.text(`Código:`, 20, 70);
    doc.text(data.code || 'PENDIENTE', 50, 70);

    doc.text(`Fecha:`, 20, 78);
    doc.text(`${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString()}`, 50, 78);

    doc.text(`Usuario:`, 20, 86);
    doc.text(data.userName || 'Sistema', 50, 86);

    // Right Column
    doc.text(`Tipo:`, 110, 70);
    doc.text(data.type, 140, 70);

    doc.text(`Motivo:`, 110, 78);
    // Split long reason if needed
    const splitReason = doc.splitTextToSize(data.reason, 60);
    doc.text(splitReason, 140, 78);

    // Table
    const tableData = data.items.map(item => {
        // Prefer barcode if available, otherwise show product code
        const codeDisplay = item.barcode ? `${item.productCode}\n(${item.barcode})` : item.productCode;

        return [
            codeDisplay,
            item.productName,
            item.isPositive ? 'Ingreso (+)' : 'Salida (-)',
            item.quantity.toString(),
            item.uom || 'Unidades'
        ];
    });

    autoTable(doc, {
        startY: 105,
        head: [['CÓDIGO / BARCODE', 'PRODUCTO', 'OPERACIÓN', 'CANTIDAD', 'UNIDAD']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [240, 253, 244], // Green-50 
            textColor: [22, 101, 52], // Green-800
            fontStyle: 'bold',
            lineColor: [220, 252, 231],
            lineWidth: 0.1
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 25, halign: 'center' }
        }
    });

    // Remove footer text as requested
    doc.save(`Ajuste_${data.code || 'Profitzen'}.pdf`);
};

export interface TransferPDFItem {
    productName: string;
    productCode: string;
    quantity: number;
    uom?: string; // Added UOM
    isPositive: boolean;
}

export interface TransferPDFData {
    code: string;
    date: Date;
    sourceStore: string;
    destinationStore: string;
    reason: string;
    items: TransferPDFItem[];
    requesterName?: string;
    receiverName?: string;
    isPending?: boolean;
}

export const generateTransferPDF = (data: TransferPDFData) => {
    const doc = new jsPDF();

    doc.setFillColor(126, 34, 206);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text('Profitzen', 14, 13);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    const title = data.isPending ? 'GUÍA DE REMISIÓN - EN TRÁNSITO' : 'GUÍA DE TRANSFERENCIA COMPLETADA';
    doc.text(title, 105, 40, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 50, 182, 45, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('DETALLES DEL TRASLADO', 20, 60);

    doc.setFont("helvetica", "normal");
    doc.text(`Fecha:`, 20, 70);
    doc.text(`${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString()}`, 50, 70);

    doc.text(`Código:`, 20, 78);
    doc.text(data.code, 50, 78);

    doc.text(`Motivo:`, 20, 86);
    doc.text(data.reason, 50, 86);

    // Right Col
    doc.text(`Origen:`, 110, 70);
    doc.setFont("helvetica", "bold");
    doc.text(data.sourceStore, 135, 70);

    doc.setFont("helvetica", "normal");
    doc.text(`Destino:`, 110, 78);
    doc.setFont("helvetica", "bold");
    doc.text(data.destinationStore, 135, 78);

    // Table
    const headers = [["CÓDIGO", "DESCRIPCIÓN", "CANTIDAD", "UNIDAD"]];
    const rows = data.items.map(item => [
        item.productCode,
        item.productName,
        item.quantity.toString(),
        item.uom || 'Unidades' // Use provided UOM or default
    ]);

    autoTable(doc, {
        startY: 100,
        head: headers,
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [235, 230, 255], textColor: [100, 50, 150], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 'auto' }, // Description
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'center' }
        }
    });

    // Footer Signatures
    const finalY = (doc as any).lastAutoTable.finalY || 150;

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);

    doc.line(40, finalY + 40, 90, finalY + 40);
    doc.text('SOLICITADO POR', 65, finalY + 45, { align: 'center' });
    if (data.requesterName) {
        doc.setFont("helvetica", "bold");
        doc.text(data.requesterName, 65, finalY + 50, { align: 'center' });
        doc.setFont("helvetica", "normal");
    }

    doc.line(120, finalY + 40, 170, finalY + 40);
    doc.text('RECIBIDO CONFORME', 145, finalY + 45, { align: 'center' });
    if (data.receiverName) {
        doc.setFont("helvetica", "bold");
        doc.text(data.receiverName, 145, finalY + 50, { align: 'center' });
        doc.setFont("helvetica", "normal");
    } else if (data.isPending) {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('(En Tránsito)', 145, finalY + 50, { align: 'center' });
    }

    doc.save(`Transferencia_${data.code}.pdf`);
};

export interface PurchasePDFItem {
    productName: string;
    productCode: string;
    barcode?: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
    subtotal: number;
    bonusQuantity?: number;
    bonusUOM?: string;
}

export interface PurchasePDFData {
    purchaseNumber: string;
    date: Date;
    storeName?: string;
    supplierName: string;
    invoiceNumber?: string;
    status: string;
    notes?: string;
    totalAmount: number;
    items: PurchasePDFItem[];
}

export const generatePurchasePDF = (data: PurchasePDFData) => {
    const doc = new jsPDF();

    // Brand Header
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text('Profitzen', 14, 13);

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('ORDEN DE COMPRA', 105, 40, { align: 'center' });

    if (data.storeName) {
        doc.setFontSize(12);
        doc.text(data.storeName, 105, 47, { align: 'center' });
    }

    // Info Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 50, 182, 50, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('INFORMACIÓN DE LA COMPRA', 20, 60);

    doc.setFont("helvetica", "normal");
    // Left Column
    doc.text(`Número:`, 20, 70);
    doc.text(data.purchaseNumber, 50, 70);

    doc.text(`Fecha:`, 20, 78);
    doc.text(`${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString()}`, 50, 78);

    doc.text(`Estado:`, 20, 86);
    doc.text(data.status, 50, 86);

    // Right Column
    doc.text(`Proveedor:`, 110, 70);
    doc.setFont("helvetica", "bold");
    doc.text(data.supplierName, 140, 70);

    doc.setFont("helvetica", "normal");
    doc.text(`Factura:`, 110, 78);
    doc.text(data.invoiceNumber || '-', 140, 78);

    if (data.notes) {
        doc.text(`Notas:`, 110, 86);
        const splitNotes = doc.splitTextToSize(data.notes, 60);
        doc.text(splitNotes, 140, 86);
    }

    // Table
    const tableData = data.items.map(item => {
        const codeDisplay = item.barcode ? `${item.productCode}\n(${item.barcode})` : item.productCode;
        const bonusDisplay = item.bonusQuantity && item.bonusQuantity > 0
            ? `+${item.bonusQuantity} ${item.bonusUOM || ''}`
            : '-';

        return [
            codeDisplay,
            item.productName,
            item.uom || 'Unidades',
            item.quantity.toString(),
            bonusDisplay,
            `S/ ${item.unitPrice.toFixed(2)}`,
            `S/ ${item.subtotal.toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: 110,
        head: [['CÓDIGO / BARCODE', 'PRODUCTO', 'UNIDAD', 'CANT.', 'BONO', 'P. UNIT.', 'SUBTOTAL']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [239, 246, 255], // Blue-50
            textColor: [30, 58, 138], // Blue-900
            fontStyle: 'bold',
            lineColor: [219, 234, 254],
            lineWidth: 0.1
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 25, halign: 'right' },
            6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
        },
        foot: [[
            { content: 'TOTAL GENERAL:', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: `S/ ${data.totalAmount.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
        ]]
    });

    doc.save(`Compra_${data.purchaseNumber}.pdf`);
};
