import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { CloudinaryService } from "./cloudinary.service";
import { FUDMASTER_COLORS } from "../constants/colors";

export class CertificateService {
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.cloudinaryService = new CloudinaryService();
  }

  async generateCertificate(
    studentName: string,
    courseName: string,
    date: Date,
    certificateId: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        layout: "landscape",
        size: "A4",
        margin: 0
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(buffers);
        try {
          // Upload to Cloudinary using uploadImage
          const result = await this.cloudinaryService.uploadImage(pdfBuffer, "certificates", "jpg");
          resolve(result.secure_url);
        } catch (error) {
          reject(error);
        }
      });

      // Background - Using a slightly off-white for better readability on PDF
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#fcfcfc");

      // Prefectura Blue Bottom (35% from bottom)
      const bottomHeight = doc.page.height * 0.35;
      doc.rect(0, doc.page.height - bottomHeight, doc.page.width, bottomHeight).fill(FUDMASTER_COLORS.PRIMARY);

      // Watermarks (Relieve) - Subtle & Background
      doc.save();
      doc.fillColor("#bdc3c7");
      doc.opacity(0.04);
      doc.fontSize(80);
      doc.font("Helvetica-Bold");

      // Top Right Watermark Text
      doc.text("CERTIFICADO", 0, 50, {
        align: "right",
        width: doc.page.width - 50,
      });

      // Bottom Left Watermark Text
      doc.text("CERTIFICADO", 50, doc.page.height - 120, {
        align: "left",
        width: doc.page.width
      });

      // SEALS (Sellos) - Professional Watermark
      const selloPath = path.join(process.cwd(), "src", "static", "sello", "sello.png");
      if (fs.existsSync(selloPath)) {
        const selloSize = 300;
        doc.opacity(0.05);

        // Sello 1: Bottom Right
        doc.image(selloPath, doc.page.width - selloSize + 50, doc.page.height - selloSize + 50, {
          width: selloSize
        });

        // Sello 2: Top Left
        doc.image(selloPath, -50, -50, {
          width: selloSize
        });
      }
      doc.restore();

      // Border
      doc.lineWidth(10);
      doc.strokeColor(FUDMASTER_COLORS.SECONDARY);
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

      // Logo - Prefectura
      const logoPath = path.join(process.cwd(), "src", "static", "logo-prefectura.png");
      if (fs.existsSync(logoPath)) {
        const logoWidth = 220;
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoPath, logoX, 40, { width: logoWidth });
      }

      // Content
      const centerX = 0;
      const pageWidth = doc.page.width;
      const black = "#000000";

      doc.fillColor(black).fontSize(40).font("Helvetica-Bold").text("CERTIFICADO DE FINALIZACIÓN", centerX, 140, { align: "center", width: pageWidth });

      doc.fillColor(black).fontSize(20).font("Helvetica").text("Se certifica que", centerX, 195, { align: "center", width: pageWidth });

      doc.fillColor(FUDMASTER_COLORS.PRIMARY).fontSize(35).font("Helvetica-Bold").text(studentName.toUpperCase(), centerX, 225, { align: "center", width: pageWidth });

      doc.fillColor(black).fontSize(18).font("Helvetica").text("ha completado con éxito el curso", centerX, 275, { align: "center", width: pageWidth });

      doc.fillColor(black).fontSize(30).font("Helvetica-Bold").text(courseName, centerX, 305, { align: "center", width: pageWidth });

      // Date - Moved down to avoid overlap
      doc.fillColor(black).fontSize(14).font("Helvetica").text(`Fecha de emisión: ${date.toLocaleDateString("es-ES")}`, centerX, 385, { align: "center", width: pageWidth });

      // Signatures
      const signatureY = 430;
      const signatureWidth = 140;
      const textWhite = FUDMASTER_COLORS.WHITE;

      // Left Signature (Prefectura Entity)
      const luisSignaturePath = path.join(process.cwd(), "src", "static", "signatures", "luis", "luis-signature.png");
      if (fs.existsSync(luisSignaturePath)) {
        const luisX = (pageWidth / 4) - (signatureWidth / 2);
        doc.image(luisSignaturePath, luisX, signatureY - 20, { width: signatureWidth });

        doc.fillColor(textWhite).fontSize(12).font("Helvetica-Bold").text("Luis Reyes", luisX, signatureY + 45, { width: signatureWidth, align: "center" });
        doc.fillColor(textWhite).fontSize(10).font("Helvetica").text("Prefectura del Guayas", luisX, signatureY + 60, { width: signatureWidth, align: "center" });
      }

      // Right Signature (Prefectura Entity)
      const mauroSignaturePath = path.join(process.cwd(), "src", "static", "signatures", "mauro", "mauro-signature.png");
      if (fs.existsSync(mauroSignaturePath)) {
        const mauroSignatureWidth = 180;
        const mauroX = (pageWidth * 3 / 4) - (mauroSignatureWidth / 2);
        doc.image(mauroSignaturePath, mauroX, signatureY - 20, { width: mauroSignatureWidth });

        doc.fillColor(textWhite).fontSize(12).font("Helvetica-Bold").text("Mauro Salgán", mauroX, signatureY + 45, { width: mauroSignatureWidth, align: "center" });
        doc.fillColor(textWhite).fontSize(10).font("Helvetica").text("Prefectura del Guayas", mauroX, signatureY + 60, { width: mauroSignatureWidth, align: "center" });
      }

      // Verification Code
      doc.fillColor(textWhite).fontSize(9).font("Helvetica").text(`ID de Verificación: ${certificateId}`, centerX, 560, { align: "center", width: pageWidth });

      doc.end();
    });
  }
}

export const certificateService = new CertificateService();
