import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeMedicalDocument(fileData: string, mimeType: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extract the most relevant medical data from this document. Provide a concise summary of results, values, and flags (like High/Low). Keep it under 200 words." },
            { inlineData: { data: fileData, mimeType } }
          ]
        }
      ]
    });
    return response.text || "No summary could be extracted.";
  } catch (error) {
    console.error("Document Analysis Error:", error);
    return "Error analyzing document content.";
  }
}

export async function getPatientInsights(patientData: {
  name: string;
  visits: any[];
  metrics: any[];
  documents: any[];
}) {
  const prompt = `
    You are a medical consultant assistant. Review the following patient data for ${patientData.name} and provide:
    1. A summary of their progress.
    2. Trends in their metrics (e.g., Weight, Blood Pressure).
    3. An analysis of their medical records: review the provided document summaries and correlate them with visits and metrics.
    4. Suggested follow-up areas.

    Medical Documents Available (Summaries):
    ${patientData.documents.length > 0 
      ? patientData.documents.map(d => `- ${d.date}: ${d.title} (${d.type})\n  Summary: ${d.contentSummary || 'No summary extracted.'}`).join('\n')
      : 'No documents linked.'}

    Recent Visits:
    ${patientData.visits.map(v => `- ${v.date}: ${v.supplements.join(', ')}. Notes: ${v.notes || 'None'}`).join('\n')}

    Recent Metrics:
    ${patientData.metrics.map(m => `- ${m.date}: ${m.type} = ${m.value} ${m.unit}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No insights available.";
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Unable to generate insights at this time. Please check your data or try again later.";
  }
}
