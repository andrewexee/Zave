import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';

// ESTO ES EL "WORKER": Configuración directa dentro del componente
// Configuración específica para pdfjs-dist 5.x y Vite
const workerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const PdfScanner = ({ onDataExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const extractTextFromPdf = async (file) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Añadimos parámetros de compatibilidad para móviles
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        disableFontFace: true, // Evita errores de fuentes en iOS
        verbosity: 0           // Evita que los warnings inunden la consola
      });

      const pdf = await loadingTask.promise;
      let fullText = "";

      // Analizamos máximo 2 páginas para no saturar la RAM del móvil
      const pagesToRead = Math.min(pdf.numPages, 2);
      
      for (let i = 1; i <= pagesToRead; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const strings = textContent.items.map(item => item.str);
        fullText += strings.join(" ") + "\n";
      }

      if (fullText.trim().length === 0) {
        throw new Error("No se pudo extraer texto del PDF");
      }

      onDataExtracted(fullText);
    } catch (err) {
      console.error("Error en móvil:", err);
      // Mensaje más descriptivo para ayudar al usuario
      setError("El móvil bloqueó el análisis. Intenta actualizar el sistema o usa el PC.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-8 transition-all flex flex-col items-center justify-center
          ${isProcessing ? 'border-yellow-400 bg-yellow-400/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'}`}
      >
        <input 
          type="file" 
          accept="application/pdf"
          onChange={(e) => e.target.files[0] && extractTextFromPdf(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mb-4" />
            <p className="text-white font-medium">Analizando ticket...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="bg-zinc-800 p-4 rounded-full mb-4">
              <Upload className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Subir Ticket Digital</h3>
            <p className="text-zinc-500 text-sm max-w-xs">
              Arrastra tu PDF aquí o pulsa para buscar. Solo archivos de supermercados (Mercadona, Lidl, etc.)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default PdfScanner;