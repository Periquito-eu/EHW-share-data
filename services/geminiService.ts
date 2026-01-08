import { GoogleGenAI } from "@google/genai";
import { Wrestler } from "../types";

// Helper to check for API Key availability
export const hasApiKey = (): boolean => {
  return !!process.env.API_KEY;
};

export const generateRosterAnalysis = async (wrestlers: Wrestler[]): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Error: API Key no configurada en el entorno (process.env.API_KEY).";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Sort top 5 for context
    const top5 = [...wrestlers].sort((a,b) => b.reputation - a.reputation).slice(0, 5);
    const context = JSON.stringify(top5.map(w => ({
      name: w.name,
      rep: w.reputation,
      record: `${w.wins}-${w.losses}`,
      streak: w.streak,
      titles: w.titles
    })));

    const prompt = `
      Eres un comentarista experto de lucha libre "El Hoyo Wrestling".
      Analiza brevemente el estado actual de la liga basándote en este JSON de los Top 5 luchadores:
      ${context}

      Dame un resumen emocionante de 1 párrafo destacando al campeón actual, quién está en racha, y alguna curiosidad.
      Usa un tono épico y divertido.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Hubo un error al conectar con los comentaristas de IA.";
  }
};

export const generateWrestlerBio = async (wrestler: Wrestler, userContext?: string): Promise<string> => {
  if (!process.env.API_KEY) return "API Key requerida para biografía IA.";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let contextString = "";
    if (userContext && userContext.trim().length > 0) {
      contextString = `IMPORTANTE: El usuario ha proporcionado este contexto adicional sobre el personaje (apariencia/lore), úsalo obligatoriamente: "${userContext}".`;
    }

    const prompt = `
      Escribe una biografía corta (2-3 frases), un apodo épico, y un "estilo de lucha" inventado para el luchador "${wrestler.name}" de "El Hoyo Wrestling".
      
      Sus estadísticas son: 
      - Victorias: ${wrestler.wins}
      - Derrotas: ${wrestler.losses}
      - Títulos: ${wrestler.titles}
      - Reputación: ${wrestler.reputation}

      ${contextString}

      Si tiene reputación negativa, haz que sea un villano o un 'jobber' simpático. Si es alta, una leyenda.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Información no disponible.";

  } catch (error) {
    return "Error generando biografía.";
  }
}
