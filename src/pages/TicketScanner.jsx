import React, { useState } from 'react';
import PdfScanner from '../components/PdfScanner';
import { TicketCheck } from 'lucide-react';

const TicketScanner = () => {
  const [extractedData, setExtractedData] = useState(null);

  const handleDataExtracted = (rawText) => {
    console.log("Datos brutos recibidos en la página:", rawText);
    // Aquí es donde pondremos la lógica para limpiar el texto y buscar el super
    setExtractedData(rawText);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-24 md:pt-28">
      <div className="max-w-4xl mx-auto">
        {/* Cabecera de la página */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-yellow-400/10 rounded-2xl mb-4">
            <TicketCheck className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black mb-2 uppercase italic">Importar Ticket</h1>
          <p className="text-zinc-500">Actualiza precios automáticamente subiendo tu ticket digital.</p>
        </div>

        {/* Zona del Escáner */}
        {!extractedData ? (
          <PdfScanner onDataExtracted={handleDataExtracted} />
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
            <h2 className="text-xl font-bold mb-4">Resultados del análisis</h2>
            {/* Aquí irá el componente de revisión que crearemos después */}
            <p className="text-zinc-400 italic">Texto extraído correctamente. Procesando coincidencias...</p>
            <button 
              onClick={() => setExtractedData(null)}
              className="mt-4 text-sm text-yellow-400 underline"
            >
              Subir otro ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketScanner;