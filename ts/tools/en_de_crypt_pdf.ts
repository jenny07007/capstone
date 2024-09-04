import fs from "fs";
import crypto from "crypto";

// generate a 32-byte encryption key
const generateEncryptionKey = () => crypto.randomBytes(32);

// generate a 16-byte initialization vector
const generateIV = () => crypto.randomBytes(16);

// encrypt the PDF (symmetric encryption)
function encryptPDF(fileBuffer: Buffer, encryptionKey: Buffer, iv: Buffer) {
  const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);

  let encrypted = cipher.update(fileBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return encrypted;
}

// decrypt the PDF
function decryptPDF(
  encryptedBuffer: Buffer,
  encryptionKey: Buffer,
  iv: Buffer
) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);

  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted;
}

(async () => {
  try {
    const inputFilePath = "example_pdf.pdf";
    const encryptedFilePath = "encrypted_pdf.enc";
    const decryptedFilePath = "decrypted_pdf.pdf";

    // read the PDF file
    const fileBuffer = fs.readFileSync(inputFilePath);

    // generate encryption key and IV
    const encryptionKey = generateEncryptionKey();
    const iv = generateIV();

    // log out encryption key and IV in Base64 (for saving in DB)
    console.log("Encryption Key (Base64):", encryptionKey.toString("base64"));
    console.log("IV (Base64):", iv.toString("base64"));

    // encrypt the PDF
    const encryptedPDF = encryptPDF(fileBuffer, encryptionKey, iv);

    // save the encrypted PDF to a file
    fs.writeFileSync(encryptedFilePath, encryptedPDF);
    console.log("Encrypted PDF saved as:", encryptedFilePath);

    // simulate reading the encrypted file from disk
    const encryptedBufferFromDisk = fs.readFileSync(encryptedFilePath);

    // decrypt the PDF
    const decryptedPDF = decryptPDF(encryptedBufferFromDisk, encryptionKey, iv);

    // save the decrypted PDF to a file
    fs.writeFileSync(decryptedFilePath, decryptedPDF);
    console.log("Decrypted PDF saved as:", decryptedFilePath);
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
