import multer from "multer";

// Armazenamento em memória: o arquivo chega como buffer (req.file.buffer) e é
// repassado ao provider de armazenamento (local ou SharePoint). Isso desacopla
// o upload do filesystem e funciona em hospedagens com disco efêmero.
const storage = multer.memoryStorage();

const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileFilter = (req, file, cb) => {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WEBP."), false);
  }
};

export const uploadInvoiceMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
