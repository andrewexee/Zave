export const parseTicket = (rawText) => {
  const text = rawText.toUpperCase();

  console.log("TEXTO CRUDO DEL PDF:", text);

  let result = {
    supermarket: "DESCONOCIDO",
    date: null,
    items: [],
    total: 0
  };

  // 1. Identificar Supermercado
  if (text.includes("MERCADONA")) result.supermarket = "MERCADONA";
  else if (text.includes("LIDL")) result.supermarket = "LIDL";
  else if (text.includes("CASH FRESH") || text.includes("CASHFRESH")) result.supermarket = "CASHFRESH";
  else if (text.includes("DIAZ CADENAS")) result.supermarket = "DIAZ CADENAS";

  // 2. Extraer Fecha (Busca patrones tipo 00/00/0000)
  const dateRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) result.date = dateMatch[0];

  // 3. Extraer Total (Busca "TOTAL" seguido de un número con coma o punto)
  // Este regex es un poco más agresivo para pillar el importe final
  const totalRegex = /(?:TOTAL|IMPORTE|TOTAL A PAGAR)[^\d]*(\d+[\.,]\d{2})/;
  const totalMatch = text.match(totalRegex);
  if (totalMatch) {
    result.total = parseFloat(totalMatch[1].replace(',', '.'));
  }

  // 4. Lógica de Productos (Simplificada para ser universal)
  // Buscamos líneas que terminen en un precio (ej: "QUESO TIERNO 2,45")
  const lines = text.split('\n');
  const productRegex = /(.+?)\s+(\d+[\.,]\d{2})$/;

  lines.forEach(line => {
    const match = line.match(productRegex);
    // Filtramos líneas que no son productos (como el total, fecha, etc.)
    if (match && !line.includes("TOTAL") && !line.includes("TARJETA")) {
      const name = match[1].trim();
      const price = parseFloat(match[2].replace(',', '.'));
      
      // Solo añadimos si el nombre tiene sentido y no es muy corto
      if (name.length > 3) {
        result.items.push({
          name,
          price,
          qty: 1 // Por defecto 1, luego podemos ajustar según el super
        });
      }
    }
  });

  return result;
};