import React, { useState } from 'react';

const PdfScanner = ({ onDataExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const generateUUID = () => {
    return (typeof crypto.randomUUID === 'function') 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);
  };

  const parseFullTicket = (text) => {
    const lines = text.split('\n').map(l => l.trim());
    const batchId = generateUUID();
    const allItems = [];
    const blacklist = ["DESCRIPCIÓN", "P. UNIT", "IMPORTE", "CUOTA", "IVA", "TOTAL", "MERCADONA", "FACTURA", "ARTÍCULOS"];

    lines.forEach((line, index) => {
      if (blacklist.some(word => line.toUpperCase().includes(word))) return;

      const columns = line.split('|').map(c => c.trim());
      const pricesInLine = line.match(/(\d+[.,]\d{2})/g);
      
      if (pricesInLine) {
        let unitPrice = parseFloat(pricesInLine[0].replace(',', '.'));
        
        // Si hay columnas, intentamos ser más precisos con el P.Unit
        if (columns.length >= 3 && columns[1] !== "") {
          unitPrice = parseFloat(columns[1].replace(',', '.'));
        }

        let rawName = columns[0] || line;
        let finalName = rawName.replace(/^[\d\s]+/, "").replace(/[|€]/g, "").trim();

        // Si no hay letras (solo números/ruido), buscamos el nombre arriba
        if (!/[a-zA-Z]{3,}/.test(finalName) && lines[index - 1]) {
          let prev = lines[index - 1];
          finalName = prev.toLowerCase().includes("kg") ? `${lines[index - 2]} (${prev})` : prev;
        }

        if (finalName.length > 2 && unitPrice > 0) {
          allItems.push({
            raw_text: finalName.toUpperCase(),
            suggested_price: unitPrice,
            batch_id: batchId
          });
        }
      }
    });

    return { allItems: allItems.filter((v,i,a) => a.findIndex(t => t.raw_text === v.raw_text) === i) };
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('apikey', 'K86510600888957'); 
    formData.append('language', 'spa');

    try {
      const response = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.ParsedResults?.[0]) {
        const { allItems } = parseFullTicket(result.ParsedResults[0].ParsedText);
        onDataExtracted(allItems);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-10 bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-[2rem] text-center hover:border-yellow-500/50 transition-all cursor-pointer relative overflow-hidden">
      <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
      <div className="space-y-3">
        <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">{isProcessing ? "⏳" : "📄"}</span>
        </div>
        <p className="text-white font-bold tracking-tight">
          {isProcessing ? "EXTRAYENDO PRODUCTOS..." : "SOLTAR TICKET AQUÍ"}
        </p>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">PDF o Imagen del ticket</p>
      </div>
    </div>
  );
};

export default PdfScanner;