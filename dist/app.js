const advisoryForm = document.getElementById('advisoryForm');
const advisoryResult = document.getElementById('advisoryResult');
const healthForm = document.getElementById('healthForm');
const healthResult = document.getElementById('healthResult');

function riskLevel(moisture, rain) {
  if (moisture < 30 && rain < 10) return { label: 'High dry spell risk', className: 'high' };
  if (moisture < 45 || rain < 18) return { label: 'Medium water stress', className: 'med' };
  return { label: 'Low risk', className: 'low' };
}

function recommendedCrops(soil, rain) {
  if (rain < 10) return ['Millets', 'Groundnut', 'Pulses'];
  if (soil.includes('Black')) return ['Cotton', 'Soybean', 'Jowar'];
  return ['Groundnut', 'Maize', 'Vegetables'];
}

advisoryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const language = document.getElementById('language').value;
  const location = document.getElementById('location').value;
  const crop = document.getElementById('crop').value;
  const soil = document.getElementById('soil').value;
  const moisture = Number(document.getElementById('moisture').value);
  const rain = Number(document.getElementById('rain').value);
  const nitrogen = Number(document.getElementById('nitrogen').value);
  const ph = Number(document.getElementById('ph').value);
  const risk = riskLevel(moisture, rain);
  const crops = recommendedCrops(soil, rain);
  const fertilizer = nitrogen < 50 ? 'Nitrogen is low. Apply nitrogen rich fertilizer only after light irrigation.' : 'Nitrogen is acceptable. Continue monitoring before adding fertilizer.';
  const phAdvice = ph < 6 ? 'Soil is slightly acidic. Avoid overuse of acidic inputs.' : ph > 7.8 ? 'Soil is alkaline. Expert review is recommended before fertilizer change.' : 'pH is suitable for most crops.';

  advisoryResult.innerHTML = `
    <h3>Advisory output</h3>
    <div class="advisory-box"><strong>Farmer language:</strong> ${language}</div>
    <div class="advisory-box"><strong>Location:</strong> ${location}</div>
    <div class="advisory-box"><strong>Risk:</strong> <span class="pill ${risk.className}">${risk.label}</span></div>
    <div class="advisory-box"><strong>Crop recommendation:</strong> Top options are ${crops.join(', ')} because they fit the current soil and rainfall risk better.</div>
    <div class="advisory-box"><strong>Irrigation alert:</strong> For ${crop}, irrigate lightly in the morning if water is available. Avoid heavy irrigation during heat.</div>
    <div class="advisory-box"><strong>Fertilizer advisory:</strong> ${fertilizer} ${phAdvice}</div>
    <div class="advisory-box"><strong>SMS preview:</strong> Smart Fasal alert for ${location}: ${risk.label}. Check moisture before fertilizer. RSK expert support is available if crop stress increases.</div>
  `;
});

healthForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const symptoms = document.getElementById('symptoms').value;
  const file = document.getElementById('photo').files[0];
  const hasPhoto = Boolean(file);
  healthResult.innerHTML = `
    <h3>Crop case output</h3>
    <div class="advisory-box"><strong>Case type:</strong> ${hasPhoto ? 'Photo plus symptom report' : 'Symptom report'}</div>
    <div class="advisory-box"><strong>Farmer symptoms:</strong> ${symptoms}</div>
    <div class="advisory-box"><strong>AI triage:</strong> Possible leaf spot or nutrient stress. Confidence 72 percent. Severity moderate.</div>
    <div class="advisory-box"><strong>Next action:</strong> Case routed to Rythu Seva Kendra expert for review within 24 hours.</div>
    <div class="advisory-box"><strong>Farmer SMS:</strong> Your crop health case has been created. Avoid spraying unknown chemicals until expert reply.</div>
  `;
});
