import React, { useState } from 'react';

const GeminiScanner = ({ onDataExtracted }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const base64Data = await fileToBase64(file);
            
            // 1. Obtener lista de modelos reales de tu cuenta
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();

            // Filtramos los que sirven para generar contenido, ordenados de más nuevo a más viejo
            const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .reverse(); // El reverse suele poner los modelos más nuevos primero

            if (availableModels.length === 0) throw new Error("No hay modelos disponibles.");

            let success = false;
            let lastError = "";

            // 2. Intentar con los modelos disponibles hasta que uno funcione
            for (const model of availableModels) {
            console.log(`Intentando con: ${model.name}...`);
            
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${API_KEY}`;
                
                const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                    parts: [
                        { text: `Analiza este ticket de compra. Extrae la información siguiendo estas reglas ESTRICTAS:
                            1. **supermarket**: Nombre de la tienda.
                            2. **date**: Fecha en formato YYYY-MM-DD.
                            3. **items**: Lista de productos donde:
                            - **raw_text**: SOLO el nombre del producto combinado con el Peso o Litros en caso de aparecer. Limpia cantidades (ej: "3x", "2 UNID") o prefijos numéricos del nombre.
                            - **suggested_price**: Debe ser SIEMPRE el PRECIO UNITARIO. 
                                *Si el ticket dice "3 unidades a 0,92€ -> 2,76€", el valor debe ser 0.92.*
                                *Si el precio unitario no aparece, divídelo tú: (Precio Total / Cantidad).*

                            Devuelve exclusivamente un objeto JSON, sin markdown ni texto extra.` },
                        { inline_data: { mime_type: file.type || "image/jpeg", data: base64Data } }
                    ]
                    }]
                })
                });

                const result = await response.json();

                if (response.status === 503 || response.status === 429) {
                console.warn(`${model.name} saturado, probando el siguiente...`);
                continue; 
                }

                if (result.error) throw new Error(result.error.message);

                const text = result.candidates[0].content.parts[0].text;
                const cleanJson = text.replace(/```json|```/g, "").trim();
                onDataExtracted(JSON.parse(cleanJson));
                
                success = true;
                console.log(`¡Éxito con ${model.name}!`);
                break; // Salimos del bucle si funciona

            } catch (err) {
                lastError = err.message;
                console.error(`Fallo con ${model.name}:`, err.message);
            }
            }

            if (!success) throw new Error("Todos los modelos fallaron o están saturados: " + lastError);

        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-12 bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-[2rem] text-center hover:border-zinc-700 transition-all cursor-pointer relative overflow-hidden">
        <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" />
        <div className="space-y-2">
            <p className="text-white font-bold uppercase tracking-widest text-sm">
            {isProcessing ? "Procesando documento..." : "Escanear Ticket"}
            </p>
            <p className="text-zinc-500 text-xs uppercase tracking-tighter">
            Arrastra o selecciona un archivo PDF o Imagen
            </p>
        </div>
        </div>
    );
};

export default GeminiScanner;